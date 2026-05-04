const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.analyzeResponse = require('./ai/analyzeResponse');
exports.buildProfile    = require('./ai/buildProfile');
exports.groupInsights   = require('./ai/groupInsights');
exports.therapyFlag     = require('./ai/therapyFlag');

// ─── Avaliação via WhatsApp (sem login) ───────────────────────────────────────
const sessoes = require('./sessoes/buscarPorToken');
Object.assign(exports, sessoes);

const status = require('./sessoes/atualizarStatus');
Object.assign(exports, status);
