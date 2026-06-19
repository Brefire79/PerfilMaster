// convertAvaliado — converte um AVALIADO DE SESSÃO (token, sem conta) em uma
// CONTA DE ALUNO (auth user + app_users + app_profiles), preservando o perfil
// DISC + PQ/Sabotadores já calculados. Caminho B: devolve um link de definição
// de senha para o facilitador enviar por WhatsApp (a pessoa cria a própria senha).
//
// Segurança:
//   - exige JWT + role 'admin';
//   - o avaliado precisa ser do caller (adminuid) e ter e-mail;
//   - role SEMPRE 'student' (trigger protect_user_privileges); via service_role.
//   - colisão de e-mail (já existe conta) → erro claro, não mescla.
import { handleCors, jsonResponse } from '../_shared/response.ts';
import { getAuthenticatedUser, serviceClient } from '../_shared/auth.ts';
import { logAuditEvent } from '../_shared/audit.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401, req);

    const { token, groupId, baseUrl } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 100) {
      return jsonResponse({ error: 'token inválido' }, 400, req);
    }

    const sb = serviceClient();

    // Caller precisa ser admin.
    const { data: caller } = await sb.from('app_users').select('role').eq('uid', user.id).maybeSingle();
    if (caller?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas administradores.' }, 403, req);
    }

    // Avaliado precisa existir, ser do caller e ainda não ter sido convertido.
    const { data: avaliado, error: avErr } = await sb
      .from('app_avaliados')
      .select('id, token, nome, email, telefone, cpf, cpf_consent, cpf_consent_at, perfil, adminuid, converted_uid')
      .eq('token', token)
      .single();
    if (avErr) {
      // Distingue "0 linhas" (PGRST116) de erro real (ex.: coluna inexistente —
      // 42703 quando o DELTA 19 ainda não foi aplicado).
      if ((avErr as { code?: string }).code === 'PGRST116') {
        return jsonResponse({ error: 'Avaliado não encontrado.' }, 404, req);
      }
      return jsonResponse({ error: `Falha ao buscar avaliado: ${avErr.message}` }, 500, req);
    }
    if (!avaliado) return jsonResponse({ error: 'Avaliado não encontrado.' }, 404, req);
    if (avaliado.adminuid !== user.id) {
      return jsonResponse({ error: 'Você não gerencia este avaliado.' }, 403, req);
    }
    if (avaliado.converted_uid) {
      return jsonResponse({ error: 'Este avaliado já foi convertido em conta.' }, 409, req);
    }
    if (!avaliado.email) {
      return jsonResponse({ error: 'O avaliado não tem e-mail — necessário para criar a conta.' }, 400, req);
    }

    const email = String(avaliado.email).trim().toLowerCase();

    // Colisão: e-mail já vinculado a uma conta (app_users).
    const { data: jaExiste } = await sb
      .from('app_users')
      .select('uid')
      .eq('email', email)
      .maybeSingle();
    if (jaExiste) {
      return jsonResponse({ error: 'Já existe uma conta com este e-mail. Use a conta existente.' }, 409, req);
    }

    // Se o grupo foi informado, ele precisa pertencer ao caller.
    let groupid: string | null = null;
    if (groupId) {
      const { data: grupo } = await sb
        .from('app_groups')
        .select('id, memberids')
        .eq('id', groupId)
        .eq('adminuid', user.id)
        .maybeSingle();
      if (!grupo) return jsonResponse({ error: 'Grupo inválido.' }, 400, req);
      groupid = grupo.id;
    }

    const agora = new Date().toISOString();
    const root = (baseUrl || '').replace(/\/$/, '');
    const redirectTo = root ? `${root}/reset-password` : undefined;

    // 1) Usuário de auth. Como já garantimos que NÃO há app_users com este e-mail,
    //    duas situações são tratadas:
    //    (a) e-mail novo → cria o usuário de auth;
    //    (b) e-mail já existe no Auth mas SEM app_users (órfão de cadastro
    //        incompleto) → ADOTA o usuário existente (reaproveita o uid).
    let uid: string;
    let adotado = false;
    let actionLink: string | null = null;

    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { displayName: avaliado.nome || null, convertedFromAvaliado: token },
    });

    if (created?.user?.id) {
      uid = created.user.id;
    } else if (/already|registered|exists/i.test(createErr?.message || '')) {
      // Adota o usuário de auth órfão. generateLink devolve o usuário + o link de
      // recuperação numa só chamada (resolve o uid sem listar todos os usuários).
      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (linkErr || !linkData?.user?.id) {
        return jsonResponse({ error: 'Existe um usuário de auth com este e-mail, mas não foi possível reaproveitá-lo. Verifique a conta no Supabase.' }, 409, req);
      }
      uid = linkData.user.id;
      actionLink = linkData.properties?.action_link ?? null;
      adotado = true;

      // Defesa extra: o uid resolvido não pode já ter app_users (conta real).
      const { data: jaTemConta } = await sb.from('app_users').select('uid').eq('uid', uid).maybeSingle();
      if (jaTemConta) {
        return jsonResponse({ error: 'Já existe uma conta com este e-mail. Use a conta existente.' }, 409, req);
      }
    } else {
      return jsonResponse({ error: createErr?.message || 'Falha ao criar a conta.' }, 500, req);
    }

    // 2) app_users (role student forçado; vínculo ao caller por adminuid).
    const userRow: Record<string, unknown> = {
      uid,
      role: 'student',
      email,
      displayname: avaliado.nome ? String(avaliado.nome).slice(0, 120) : null,
      groupid,
      adminuid: user.id,
      assessmentstatus: 'completed',
      profile: (avaliado.perfil as Record<string, unknown>)?.perfilPrimario ?? null,
      createdat: agora,
      updatedat: agora,
    };
    if (avaliado.cpf) {
      userRow.cpf = avaliado.cpf;
      userRow.cpf_consent = avaliado.cpf_consent ?? true;
      userRow.cpf_consent_at = avaliado.cpf_consent_at ?? agora;
    }
    const { error: userErr } = await sb.from('app_users').insert(userRow);
    if (userErr) {
      // rollback: só apaga o auth user se NÓS o criamos agora (não apaga um
      // usuário adotado, que pré-existia e pode pertencer a outro contexto).
      if (!adotado) await sb.auth.admin.deleteUser(uid).catch(() => {});
      return jsonResponse({ error: `Falha ao criar o aluno: ${userErr.message}` }, 500, req);
    }

    // 3) app_profiles — mapeia o perfil do avaliado para o formato de conta.
    const perfil = (avaliado.perfil || {}) as Record<string, unknown>;
    const profileRow: Record<string, unknown> = {
      uid,
      dominantprofile: perfil.perfilPrimario ?? null,
      secondaryprofile: perfil.perfilSecundario ?? null,
      scores: {
        D: perfil.dominante ?? 0,
        I: perfil.influente ?? 0,
        S: perfil.estavel ?? 0,
        C: perfil.analitico ?? 0,
      },
      pq_score: typeof perfil.pqScore === 'number' ? perfil.pqScore : null,
      saboteur_scores: perfil.saboteurScores ?? null,
      groupid,
      createdat: agora,
      updatedat: agora,
    };
    await sb.from('app_profiles').upsert(profileRow, { onConflict: 'uid' });

    // 4) Entra no grupo (memberids), se aplicável.
    if (groupid) {
      const { data: grupo } = await sb.from('app_groups').select('memberids').eq('id', groupid).single();
      const memberids = Array.isArray(grupo?.memberids) ? grupo.memberids : [];
      if (!memberids.includes(uid)) {
        await sb.from('app_groups').update({ memberids: [...memberids, uid], updatedat: agora }).eq('id', groupid);
      }
    }

    // 5) Marca o avaliado como convertido (histórico + evita reconverter +
    //    desconta da agregação de grupos no DELTA 19).
    await sb.from('app_avaliados').update({ converted_uid: uid, atualizadoem: agora }).eq('token', token);

    // 6) Link de definição de senha (Caminho B) para enviar por WhatsApp.
    //    No caso de adoção já obtivemos o link ao resolver o uid (passo 1).
    if (!actionLink) {
      const { data: linkData } = await sb.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      actionLink = linkData?.properties?.action_link ?? null;
    }

    await logAuditEvent({
      adminuid: user.id,
      action: 'avaliado_converted',
      actor_id: user.id,
      actor_role: 'admin',
      target_type: 'avaliado',
      target_id: token,
      metadata: { uid, groupid: groupid || null },
    });

    return jsonResponse({ success: true, uid, email, actionLink }, 200, req);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message || 'convertAvaliado failed' }, 500, req);
  }
});
