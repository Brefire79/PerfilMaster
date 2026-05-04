'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { calcularPerfil } = require('../data/questions');

const db = admin.firestore();

const TRANSICOES_VALIDAS = {
  pendente: ['em_andamento'],
  em_andamento: ['concluido'],
  concluido: [],
};

/**
 * atualizarStatus — Cloud Function callable (sem autenticação obrigatória)
 *
 * Recebe:
 *   { token: string, novoStatus: 'em_andamento' | 'concluido', respostas?: Record<string,number> }
 *
 * Retorna:
 *   { success: true, perfil?: PerfilResultado }
 *
 * Regras de transição de status:
 *   pendente → em_andamento  (ao iniciar a avaliação)
 *   em_andamento → concluido  (ao enviar respostas — perfil calculado aqui)
 */
exports.atualizarStatus = functions.https.onCall(async (data) => {
  const token = (data && data.token || '').trim();
  const novoStatus = data && data.novoStatus;
  const respostas = data && data.respostas;

  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'O campo token é obrigatório.');
  }
  if (!novoStatus) {
    throw new functions.https.HttpsError('invalid-argument', 'O campo novoStatus é obrigatório.');
  }

  const avaliadoRef = db.collection('avaliados').doc(token);
  const avaliadoSnap = await avaliadoRef.get();

  if (!avaliadoSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Token inválido ou expirado.');
  }

  const avaliado = avaliadoSnap.data();
  const statusAtual = avaliado.status;

  // Valida transição de status
  if (!TRANSICOES_VALIDAS[statusAtual] || !TRANSICOES_VALIDAS[statusAtual].includes(novoStatus)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Transição de status inválida: ${statusAtual} → ${novoStatus}.`
    );
  }

  const agora = admin.firestore.FieldValue.serverTimestamp();
  const atualizacao = {
    status: novoStatus,
    atualizadoEm: agora,
  };

  if (novoStatus === 'em_andamento') {
    atualizacao.iniciadoEm = agora;
  }

  let perfil = null;

  if (novoStatus === 'concluido') {
    if (!respostas || typeof respostas !== 'object' || Object.keys(respostas).length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Respostas são obrigatórias para concluir a avaliação.'
      );
    }

    perfil = calcularPerfil(respostas);

    atualizacao.respostas = respostas;
    atualizacao.perfil = perfil;
    atualizacao.concluidoEm = agora;

    // Registra snapshot imutável de respostas em subcoleção
    await db.collection('sessao_respostas').add({
      avaliadoId: token,
      sessaoId: avaliado.sessaoId,
      respostas,
      submissaoEm: agora,
    });
  }

  await avaliadoRef.update(atualizacao);

  return {
    success: true,
    ...(perfil ? { perfil } : {}),
  };
});
