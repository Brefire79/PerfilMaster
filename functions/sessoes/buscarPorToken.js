'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * buscarPorToken — Cloud Function callable (sem autenticação obrigatória)
 *
 * Recebe: { token: string }
 * Retorna apenas dados seguros para exibição pública (sem adminUid, telefone etc.)
 *
 * Exemplo de retorno:
 * {
 *   nome: "João Silva",
 *   status: "pendente",
 *   sessaoTitulo: "Avaliação Q2 2025",
 *   sessaoDescricao: "Turma de líderes"
 * }
 */
exports.buscarPorToken = functions.https.onCall(async (data) => {
  const token = (data && data.token || '').trim();

  if (!token) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'O campo token é obrigatório.'
    );
  }

  // Token = ID do documento em avaliados → lookup O(1)
  const avaliadoSnap = await db.collection('avaliados').doc(token).get();

  if (!avaliadoSnap.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Token inválido ou expirado. Solicite um novo link ao seu facilitador.'
    );
  }

  const avaliado = avaliadoSnap.data();

  // Busca dados da sessão para exibir título e descrição
  const sessaoSnap = await db.collection('sessoes').doc(avaliado.sessaoId).get();
  const sessao = sessaoSnap.exists ? sessaoSnap.data() : null;

  return {
    nome: avaliado.nome,
    status: avaliado.status,
    sessaoTitulo: sessao ? sessao.titulo : 'Avaliação DISC',
    sessaoDescricao: sessao ? sessao.descricao || null : null,
  };
});
