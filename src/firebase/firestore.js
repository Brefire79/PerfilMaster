import { getValidAccessToken } from './auth.js';
import { normalizeName } from '@/lib/cpf.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.');
}

// Keep the old export name for compatibility in the app.
export const COLLECTIONS = {
  USERS: import.meta.env.VITE_SB_TABLE_USERS || 'app_users',
  GROUPS: import.meta.env.VITE_SB_TABLE_GROUPS || 'app_groups',
  MODULES: import.meta.env.VITE_SB_TABLE_MODULES || 'app_modules',
  ASSESSMENTS: import.meta.env.VITE_SB_TABLE_ASSESSMENTS || 'app_assessments',
  PROFILES: import.meta.env.VITE_SB_TABLE_PROFILES || 'app_profiles',
  INVITES: import.meta.env.VITE_SB_TABLE_INVITES || 'app_invites',
  SESSOES: import.meta.env.VITE_SB_TABLE_SESSOES || 'app_sessoes',
  AVALIADOS: import.meta.env.VITE_SB_TABLE_AVALIADOS || 'app_avaliados',
  SESSAO_RESPOSTAS: import.meta.env.VITE_SB_TABLE_SESSAO_RESPOSTAS || 'app_sessao_respostas',
  IDENTITY_LINKS: import.meta.env.VITE_SB_TABLE_IDENTITY_LINKS || 'app_identity_links',
};

const GROUP_REPORTS = import.meta.env.VITE_SB_TABLE_GROUP_REPORTS || 'app_group_reports';
const ADMIN_STRATEGIES = import.meta.env.VITE_SB_TABLE_ADMIN_STRATEGIES || 'app_admin_strategies';

// ─── Key mapping: camelCase (app) ↔ lowercase (PostgreSQL) ───────────────────
// PostgreSQL folds unquoted identifiers to lowercase; this table maps them back.
const CAMEL_TO_DB = {
  adminUid: 'adminuid',
  studentUid: 'studentuid',
  adminName: 'adminname',
  memberIds: 'memberids',
  moduleIds: 'moduleids',
  groupId: 'groupid',
  moduleId: 'moduleid',
  createdAt: 'createdat',
  updatedAt: 'updatedat',
  submittedAt: 'submittedat',
  expiresAt: 'expiresat',
  usedAt: 'usedat',
  usedBy: 'usedby',
  totalQuestions: 'totalquestions',
  sessaoId: 'sessaoid',
  criadaEm: 'criadaem',
  atualizadaEm: 'atualizadaem',
  criadoEm: 'criadoem',
  iniciadoEm: 'iniciadoem',
  concluidoEm: 'concluidoem',
  atualizadoEm: 'atualizadoem',
  conviteEnviadoEm: 'conviteenviadoem',
  primaryType: 'primarytype',
  assessmentId: 'assessmentid',
  assessmentStatus: 'assessmentstatus',
  emailVerified: 'emailverified',
  displayName: 'displayname',
  photoURL: 'photourl',
  // app_assessments extra columns
  moduleName: 'modulename',
  moduleObjective: 'moduleobjective',
  assignedBy: 'assignedby',
  // app_profiles columns
  dominantProfile: 'dominantprofile',
  secondaryProfile: 'secondaryprofile',
  aiSummary: 'aisummary',
  roleRecommendation: 'rolerecommendation',
  workStyleRecommendation: 'workstylerecommendation',
  teamBehavior: 'teambehavior',
  communicationTips: 'communicationtips',
  saboteurPatterns: 'saboteurpatterns',
  derailmentRisks: 'derailmentrisks',
  developmentAreas: 'developmentareas',
  evolutionNotes: 'evolutionnotes',
  leadershipStyle: 'leadershipstyle',
  conflictStyle: 'conflictstyle',
  therapyIndicator: 'therapyindicator',
  adminStrategy: 'adminstrategy',
  // DELTA 7: CPF / convergência de identidade (cpf é tudo-minúsculo, mapeia 1:1;
  // consentimento precisa de snake_case explícito)
  cpfConsent: 'cpf_consent',
  cpfConsentAt: 'cpf_consent_at',
  avaliadoId: 'avaliado_id',
  userUid: 'user_uid',
  linkedBy: 'linked_by',
  linkedAt: 'linked_at',
};

const DB_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_DB).map(([camel, db]) => [db, camel])
);

/** Convert a single key from camelCase to DB lowercase */
function toDBKey(key) {
  return CAMEL_TO_DB[key] ?? key;
}

/** Convert a single key from DB lowercase to camelCase */
function toAppKey(key) {
  return DB_TO_CAMEL[key] ?? key;
}

/** Convert all keys in an object from camelCase → DB lowercase (outgoing payload) */
function toDBPayload(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [toDBKey(k), v])
  );
}

/** Convert all keys in a row from DB lowercase → camelCase (incoming response) */
function fromDBRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [toAppKey(k), v])
  );
}

function nowIso() {
  return new Date().toISOString();
}

function toDateValue(value) {
  if (!value) return null;
  if (typeof value === 'string' || value instanceof Date) return new Date(value);
  if (typeof value === 'object' && value.toDate) return value.toDate();
  return new Date(value);
}

function withDateWrapper(row) {
  if (!row || typeof row !== 'object') return row;
  const next = { ...row };

  const dateKeys = ['createdAt', 'updatedAt', 'submittedAt', 'expiresAt', 'iniciadoEm', 'concluidoEm', 'criadoEm', 'atualizadoEm'];
  for (const key of dateKeys) {
    if (next[key]) {
      const original = next[key];
      next[key] = {
        raw: original,
        toDate: () => toDateValue(original),
      };
    }
  }

  return next;
}

const VALID_POSTGREST_OPS = new Set(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'like', 'ilike', 'is', 'in', 'cs', 'cd', 'ov', 'sl', 'sr', 'nxr', 'nxl', 'adj', 'not']);

function buildFilterQuery(filters = []) {
  const parts = [];
  for (const f of filters) {
    if (!f || !f.field || !f.op) continue;
    if (!VALID_POSTGREST_OPS.has(f.op)) throw new Error(`Invalid PostgREST op: "${f.op}"`);
    const dbField = toDBKey(f.field); // convert camelCase → lowercase for PostgREST
    const value = encodeURIComponent(String(f.value));
    parts.push(`${encodeURIComponent(dbField)}=${f.op}.${value}`);
  }
  return parts.join('&');
}

async function buildHeaders() {
  const token = await getValidAccessToken(); // auto-refresh if expired
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  return headers;
}

async function sbRequest(path, { method = 'GET', query = '', body, prefer } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}${query ? `?${query}` : ''}`;
  const headers = await buildHeaders();
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch (_) { /* non-JSON body */ }
  }

  if (!res.ok) {
    // Token expired or invalid — force sign out and reload
    if (res.status === 401) {
      localStorage.removeItem('profileai.supabase.session');
      localStorage.removeItem('profileai-auth');
      window.location.href = '/login';
      return null;
    }
    const msg = json?.message || json?.error || `Supabase request failed (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

async function selectRows(table, {
  filters = [],
  orderBy,
  ascending = true,
  limit,
  columns = '*',
  single = false,
} = {}) {
  const queryParts = [`select=${encodeURIComponent(columns)}`];

  const filterQuery = buildFilterQuery(filters);
  if (filterQuery) queryParts.push(filterQuery);

  if (orderBy) {
    // orderBy may be camelCase — convert to DB lowercase
    queryParts.push(`order=${encodeURIComponent(toDBKey(orderBy))}.${ascending ? 'asc' : 'desc'}`);
  }

  if (typeof limit === 'number') {
    queryParts.push(`limit=${limit}`);
  }

  const data = await sbRequest(table, { method: 'GET', query: queryParts.join('&') });
  // Convert all rows from DB lowercase → camelCase for the app
  if (single) return data?.[0] ? fromDBRow(data[0]) : null;
  return Array.isArray(data) ? data.map(fromDBRow) : [];
}

async function insertRow(table, payload, { returning = true } = {}) {
  const data = await sbRequest(table, {
    method: 'POST',
    query: 'select=*',
    body: toDBPayload(payload),  // convert keys to lowercase
    prefer: returning ? 'return=representation' : 'return=minimal',
  });
  const row = Array.isArray(data) ? data[0] : data;
  return row ? fromDBRow(row) : row;
}

async function updateRows(table, filters, payload, { returning = true } = {}) {
  if (!Array.isArray(filters) || filters.length === 0) {
    throw new Error(`updateRows called without filters on "${table}" — refusing to PATCH all rows`);
  }
  const query = buildFilterQuery(filters);
  const data = await sbRequest(table, {
    method: 'PATCH',
    query: `select=*&${query}`,
    body: toDBPayload(payload),  // convert keys to lowercase
    prefer: returning ? 'return=representation' : 'return=minimal',
  });
  return Array.isArray(data) ? data.map(fromDBRow) : [];
}

async function upsertRow(table, payload, conflictColumn = 'id') {
  // conflictColumn itself must be the DB column name (usually 'id', 'uid', 'token' — already lowercase)
  const data = await sbRequest(table, {
    method: 'POST',
    query: `on_conflict=${encodeURIComponent(toDBKey(conflictColumn))}&select=*`,
    body: toDBPayload(payload),  // convert keys to lowercase
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  const row = Array.isArray(data) ? data[0] : data;
  return row ? fromDBRow(row) : row;
}

async function deleteRows(table, filters) {
  if (!Array.isArray(filters) || filters.length === 0) {
    throw new Error(`deleteRows called without filters on "${table}" — refusing to DELETE all rows`);
  }
  const query = buildFilterQuery(filters);
  await sbRequest(table, {
    method: 'DELETE',
    query,
    prefer: 'return=minimal',
  });
}

// Compatibility helpers used in the existing codebase.
export function serverTimestamp() {
  return nowIso();
}

export const Timestamp = {
  fromDate(date) {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createUser(uid, data) {
  const row = {
    ...data,
    uid,                          // explicit param always wins
    role: data.role || 'student', // normalize missing role
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await upsertRow(COLLECTIONS.USERS, row, 'uid');
}

export async function getUser(uid) {
  const row = await selectRows(COLLECTIONS.USERS, {
    filters: [{ field: 'uid', op: 'eq', value: uid }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id || row.uid, ...row }) : null;
}

export async function getUserByEmail(email) {
  const row = await selectRows(COLLECTIONS.USERS, {
    filters: [{ field: 'email', op: 'eq', value: email }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id || row.uid, ...row }) : null;
}

export async function updateUser(uid, data) {
  await updateRows(
    COLLECTIONS.USERS,
    [{ field: 'uid', op: 'eq', value: uid }],
    { ...data, updatedAt: nowIso() }
  );
}

export async function getUsersByGroup(groupId) {
  const rows = await selectRows(COLLECTIONS.USERS, {
    filters: [{ field: 'groupId', op: 'eq', value: groupId }],
    orderBy: 'createdAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id || row.uid, ...row }));
}

// DELTA 6: alunos avulsos (sem grupo) deste admin — vinculados via adminuid.
// Retorna apenas students com groupid NULL para não duplicar os que já vêm por grupo.
export async function getAvulsosByAdmin(adminUid) {
  const rows = await selectRows(COLLECTIONS.USERS, {
    filters: [
      { field: 'adminUid', op: 'eq', value: adminUid },
      { field: 'role', op: 'eq', value: 'student' },
      { field: 'groupId', op: 'is', value: null },
    ],
    orderBy: 'createdAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id || row.uid, ...row }));
}

export function subscribeToUser(uid, callback) {
  getUser(uid).then(callback).catch(() => callback(null));
  return () => {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createGroup(data) {
  const row = await insertRow(COLLECTIONS.GROUPS, {
    ...data,
    memberIds: data.memberIds || [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return row?.id;
}

export async function getGroup(groupId) {
  const row = await selectRows(COLLECTIONS.GROUPS, {
    filters: [{ field: 'id', op: 'eq', value: groupId }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id, ...row }) : null;
}

export async function getGroupsByAdmin(adminUid) {
  const rows = await selectRows(COLLECTIONS.GROUPS, {
    filters: [{ field: 'adminUid', op: 'eq', value: adminUid }],
    orderBy: 'createdAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id, ...row }));
}

export async function updateGroup(groupId, data) {
  await updateRows(
    COLLECTIONS.GROUPS,
    [{ field: 'id', op: 'eq', value: groupId }],
    { ...data, updatedAt: nowIso() }
  );
}

export async function deleteGroup(groupId) {
  await deleteRows(COLLECTIONS.GROUPS, [{ field: 'id', op: 'eq', value: groupId }]);
}

export async function addMemberToGroup(groupId, uid) {
  const current = await getGroup(groupId);
  const memberIds = Array.isArray(current?.memberIds) ? current.memberIds : [];
  if (!memberIds.includes(uid)) memberIds.push(uid);
  await updateGroup(groupId, { memberIds });
}

export async function removeMemberFromGroup(groupId, uid) {
  const current = await getGroup(groupId);
  const memberIds = (Array.isArray(current?.memberIds) ? current.memberIds : []).filter((id) => id !== uid);
  await updateGroup(groupId, { memberIds });
}

export function subscribeToGroups(adminUid, callback) {
  getGroupsByAdmin(adminUid).then(callback).catch(() => callback([]));
  return () => {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════════════════════════════════════════

export async function createModule(data) {
  const row = await insertRow(COLLECTIONS.MODULES, {
    ...data,
    status: data.status || 'draft',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return row?.id;
}

export async function getModule(moduleId) {
  const row = await selectRows(COLLECTIONS.MODULES, {
    filters: [{ field: 'id', op: 'eq', value: moduleId }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id, ...row }) : null;
}

export async function getModules(groupId) {
  const filters = groupId
    ? [{ field: 'groupId', op: 'eq', value: groupId }]
    : [];
  const rows = await selectRows(COLLECTIONS.MODULES, {
    filters,
    orderBy: 'order',
    ascending: true,
  });
  return rows.map((row) => withDateWrapper({ id: row.id, ...row }));
}

export async function updateModule(moduleId, data) {
  await updateRows(
    COLLECTIONS.MODULES,
    [{ field: 'id', op: 'eq', value: moduleId }],
    { ...data, updatedAt: nowIso() }
  );
}

export async function deleteModule(moduleId) {
  await deleteRows(COLLECTIONS.MODULES, [{ field: 'id', op: 'eq', value: moduleId }]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESSMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAssessment(data) {
  const row = await insertRow(COLLECTIONS.ASSESSMENTS, {
    ...data,
    status: 'pending',
    answers: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return row?.id;
}

export async function getAssessment(assessmentId) {
  const row = await selectRows(COLLECTIONS.ASSESSMENTS, {
    filters: [{ field: 'id', op: 'eq', value: assessmentId }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id, ...row }) : null;
}

export async function getAssessmentsByUser(uid) {
  const rows = await selectRows(COLLECTIONS.ASSESSMENTS, {
    filters: [{ field: 'uid', op: 'eq', value: uid }],
    orderBy: 'createdAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id, ...row }));
}

export async function getAssessmentsByGroup(groupId) {
  const rows = await selectRows(COLLECTIONS.ASSESSMENTS, {
    filters: [{ field: 'groupId', op: 'eq', value: groupId }],
    orderBy: 'createdAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id, ...row }));
}

export async function updateAssessment(assessmentId, data) {
  await updateRows(
    COLLECTIONS.ASSESSMENTS,
    [{ field: 'id', op: 'eq', value: assessmentId }],
    { ...data, updatedAt: nowIso() }
  );
}

export async function saveAssessmentAnswer(assessmentId, questionId, answer) {
  const current = (await getAssessment(assessmentId)) || {};
  const answers = { ...(current.answers || {}) };
  answers[questionId] = answer;

  await updateAssessment(assessmentId, {
    answers,
    status: 'in_progress',
  });
}

export async function submitAssessment(assessmentId, answers) {
  await updateAssessment(assessmentId, {
    answers,
    status: 'submitted',
    submittedAt: nowIso(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

export async function createProfile(uid, data) {
  await upsertRow(COLLECTIONS.PROFILES, {
    uid,
    ...data,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }, 'uid');
}

/** Merge aiSummary JSON fields into the top-level profile object for easier consumption */
function flattenProfile(row) {
  if (!row) return row;
  const ai = row.aiSummary || {};
  return {
    ...row,
    summary: row.summary ?? ai.summary,
    strengths: row.strengths ?? ai.strengths ?? [],
    challenges: row.challenges ?? ai.challenges ?? [],
    motivators: row.motivators ?? ai.motivators ?? [],
    stressors: row.stressors ?? ai.stressors ?? [],
    scores: row.scores ?? ai.scores ?? {},
    adminStrategy: row.adminStrategy ?? ai.adminStrategy ?? null,
  };
}

export async function getProfile(uid) {
  const row = await selectRows(COLLECTIONS.PROFILES, {
    filters: [{ field: 'uid', op: 'eq', value: uid }],
    single: true,
  });
  return row ? withDateWrapper(flattenProfile({ id: row.id || row.uid, ...row })) : null;
}

export async function updateProfile(uid, data) {
  await updateRows(
    COLLECTIONS.PROFILES,
    [{ field: 'uid', op: 'eq', value: uid }],
    { ...data, updatedAt: nowIso() }
  );
}

export async function getProfilesByGroup(groupId) {
  const rows = await selectRows(COLLECTIONS.PROFILES, {
    filters: [{ field: 'groupId', op: 'eq', value: groupId }],
  });
  return rows.map((row) => withDateWrapper(flattenProfile({ id: row.id || row.uid, ...row })));
}

export function subscribeToProfile(uid, callback) {
  getProfile(uid).then(callback).catch(() => callback(null));
  return () => {};
}

/**
 * getAvaliadoLikeFromUid — adapta uma CONTA de aluno (app_users + app_profiles)
 * para o formato "avaliado" que o RelatorioOficial consome. Permite gerar o
 * Relatório Oficial individual para alunos de grupo/avulsos (que têm uid, não token).
 *
 * Retorna null se não houver perfil DISC (sem dominantProfile nem scores válidos).
 */
export async function getAvaliadoLikeFromUid(uid) {
  if (!uid) return null;
  const [u, p] = await Promise.all([getUser(uid), getProfile(uid)]);
  if (!p) return null;

  const scores = p.scores || {};
  const num = (v) => Math.round(Number(v) || 0);

  // perfilPrimario: usa dominantProfile; se faltar, deduz do maior score.
  let perfilPrimario = p.dominantProfile || null;
  if (!perfilPrimario) {
    const ordenado = [['D', scores.D], ['I', scores.I], ['S', scores.S], ['C', scores.C]]
      .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));
    if ((Number(ordenado[0]?.[1]) || 0) > 0) perfilPrimario = ordenado[0][0];
  }
  if (!perfilPrimario) return null; // sem DISC → não há relatório

  return {
    uid,
    nome: u?.displayName || u?.name || u?.email || 'Aluno',
    telefone: u?.phoneNumber || u?.telefone || '',
    email: u?.email || null,
    cpf: u?.cpf || p?.cpf || null,
    status: 'concluido',
    sessaoTitulo: u?.groupName || 'Conta de aluno',
    criadoEm: p?.updatedAt || p?.createdAt || null,
    perfil: {
      perfilPrimario,
      perfilSecundario: p.secondaryProfile || null,
      dominante: num(scores.D),
      influente: num(scores.I),
      estavel: num(scores.S),
      analitico: num(scores.C),
      pqScore: p.pqScore ?? scores.pqScore ?? null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVITES
// ═══════════════════════════════════════════════════════════════════════════════

// D5b: aceita expiryDays (padrão 7) — InviteLink.jsx passa 7/15/30
export async function createInvite(groupId, adminUid, expiryDays = 7) {
  const token = crypto.randomUUID();
  const days = Number(expiryDays) > 0 ? Number(expiryDays) : 7;
  await insertRow(COLLECTIONS.INVITES, {
    token,
    groupId,
    adminUid,
    used: false,
    createdAt: nowIso(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000)),
  });
  return token;
}

export async function getInvite(token) {
  const row = await selectRows(COLLECTIONS.INVITES, {
    filters: [{ field: 'token', op: 'eq', value: token }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id || row.token, ...row }) : null;
}

// Convite ativo (não usado e não expirado) mais recente de um grupo — usado
// pela aba Convite do grupo para reexibir o link após recarregar a página
// (o token não fica em app_groups, fica em app_invites).
export async function getActiveInviteForGroup(groupId) {
  const rows = await selectRows(COLLECTIONS.INVITES, {
    filters: [
      { field: 'groupId', op: 'eq', value: groupId },
      { field: 'used', op: 'eq', value: false },
    ],
    orderBy: 'createdAt',
    ascending: false,
    limit: 5,
  });
  const agora = Date.now();
  const ativo = rows.find((r) => !r.expiresAt || new Date(r.expiresAt).getTime() > agora);
  return ativo ? withDateWrapper({ id: ativo.id || ativo.token, ...ativo }) : null;
}

export async function markInviteUsed(token) {
  await updateRows(
    COLLECTIONS.INVITES,
    [{ field: 'token', op: 'eq', value: token }],
    { used: true, usedAt: nowIso() }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH-LIKE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function registerStudentWithGroup(uid, userData, groupId, inviteToken, adminUid = null) {
  await createUser(uid, {
    ...userData,
    role: 'student',
    groupId,
    // DELTA 6: vincula o aluno ao admin responsável (essencial p/ alunos avulsos
    // sem grupo, que de outra forma ficariam órfãos e invisíveis na tela de Alunos)
    adminUid,
  });

  if (groupId) {
    await addMemberToGroup(groupId, uid);
  }

  if (inviteToken) {
    await updateRows(
      COLLECTIONS.INVITES,
      [{ field: 'token', op: 'eq', value: inviteToken }],
      {
        used: true,
        usedAt: nowIso(),
        usedBy: uid,
      }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveGroupReport(data) {
  if (!data.groupId) throw new Error('groupId is required');
  const row = {
    ...data,
    updatedAt: nowIso(),
    createdAt: data.createdAt || nowIso(),
  };
  await upsertRow(GROUP_REPORTS, row, 'groupId');
  return data.groupId;
}

export async function getGroupReport(groupId) {
  if (!groupId) return null;
  const row = await selectRows(GROUP_REPORTS, {
    filters: [{ field: 'groupId', op: 'eq', value: groupId }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id || row.groupId, ...row }) : null;
}

export async function getGroupReportsByAdmin(adminUid) {
  const rows = await selectRows(GROUP_REPORTS, {
    filters: [{ field: 'adminUid', op: 'eq', value: adminUid }],
    orderBy: 'updatedAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id || row.groupId, ...row }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN STRATEGIES (DELTA 10) — Painel Estratégico do facilitador.
// Tabela própria isolada por adminuid (RLS); o aluno NUNCA lê esta tabela.
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAdminStrategy(adminUid, studentUid) {
  if (!adminUid || !studentUid) return null;
  const row = await selectRows(ADMIN_STRATEGIES, {
    filters: [
      { field: 'adminUid', op: 'eq', value: adminUid },
      { field: 'studentUid', op: 'eq', value: studentUid },
    ],
    single: true,
  });
  return row?.strategy ?? null;
}

export async function saveAdminStrategy(adminUid, studentUid, strategy) {
  if (!adminUid || !studentUid) throw new Error('adminUid e studentUid são obrigatórios');
  // unique(adminuid, studentuid) → upsert por conflito composto
  const row = await upsertRow(
    ADMIN_STRATEGIES,
    { adminUid, studentUid, strategy, atualizadoEm: nowIso() },
    'adminuid,studentuid'
  );
  return row?.strategy ?? strategy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSÕES
// ═══════════════════════════════════════════════════════════════════════════════

export async function criarSessao(adminUid, dados) {
  const row = await insertRow(COLLECTIONS.SESSOES, {
    adminUid,
    groupId: dados.groupId || null,
    titulo: dados.titulo,
    descricao: dados.descricao || '',
    status: 'ativa',
    criadaEm: nowIso(),
    atualizadaEm: nowIso(),
  });
  return row?.id;
}

export async function getSessoesByAdmin(adminUid) {
  const rows = await selectRows(COLLECTIONS.SESSOES, {
    filters: [{ field: 'adminUid', op: 'eq', value: adminUid }],
    orderBy: 'criadaEm',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id, ...row }));
}

export async function encerrarSessao(sessaoId) {
  await updateRows(
    COLLECTIONS.SESSOES,
    [{ field: 'id', op: 'eq', value: sessaoId }],
    { status: 'encerrada', atualizadaEm: nowIso() }
  );
}

export async function deletarSessao(sessaoId) {
  await deleteRows(COLLECTIONS.SESSOES, [{ field: 'id', op: 'eq', value: sessaoId }]);
}

export function subscribeToSessoes(adminUid, callback) {
  getSessoesByAdmin(adminUid).then(callback).catch(() => callback([]));
  return () => {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVALIADOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function criarAvaliado(adminUid, sessaoId, dados) {
  const token = crypto.randomUUID();
  await insertRow(COLLECTIONS.AVALIADOS, {
    sessaoId,
    adminUid,
    nome: dados.nome,
    telefone: dados.telefone,
    email: dados.email || null,
    // DELTA 7: CPF opcional + consentimento LGPD (só dígitos)
    cpf: dados.cpf || null,
    cpfConsent: dados.cpfConsent ?? false,
    cpfConsentAt: dados.cpfConsentAt || null,
    token,
    status: 'pendente',
    respostas: null,
    perfil: null,
    criadoEm: nowIso(),
    iniciadoEm: null,
    concluidoEm: null,
    atualizadoEm: nowIso(),
  });
  return token;
}

export async function getAvaliadosBySession(sessaoId) {
  const rows = await selectRows(COLLECTIONS.AVALIADOS, {
    filters: [{ field: 'sessaoId', op: 'eq', value: sessaoId }],
    orderBy: 'criadoEm',
    ascending: true,
  });
  return rows.map((row) => withDateWrapper({ id: row.id || row.token, ...row }));
}

export function subscribeToAvaliados(sessaoId, callback) {
  getAvaliadosBySession(sessaoId).then(callback).catch(() => callback([]));
  return () => {};
}

export async function getAvaliadoByToken(token) {
  const row = await selectRows(COLLECTIONS.AVALIADOS, {
    filters: [{ field: 'token', op: 'eq', value: token }],
    single: true,
  });
  return row ? withDateWrapper({ id: row.id || row.token, ...row }) : null;
}

export async function getAvaliadoByEmail(email) {
  const rows = await selectRows(COLLECTIONS.AVALIADOS, {
    filters: [
      { field: 'email', op: 'eq', value: email },
      { field: 'status', op: 'eq', value: 'concluido' },
    ],
    orderBy: 'concluidoEm',
    ascending: false,
    limit: 1,
  });
  return rows[0] ? withDateWrapper({ id: rows[0].id || rows[0].token, ...rows[0] }) : null;
}

export async function deleteAvaliado(avaliadoId) {
  await deleteRows(COLLECTIONS.AVALIADOS, [{ field: 'id', op: 'eq', value: avaliadoId }]);
}

// Disparo em massa: registra quando o convite WhatsApp foi enviado ao avaliado
// (coluna conviteenviadoem, DELTA 8.1) — permite "disparar só para quem falta".
export async function marcarConviteEnviado(avaliadoId) {
  await updateRows(
    COLLECTIONS.AVALIADOS,
    [{ field: 'id', op: 'eq', value: avaliadoId }],
    { conviteEnviadoEm: nowIso(), atualizadoEm: nowIso() }
  );
}

// Variante por token — usada no modal de cadastro em lote (AvaliadoForm),
// que só conhece o token retornado por criarAvaliado.
export async function marcarConviteEnviadoPorToken(token) {
  await updateRows(
    COLLECTIONS.AVALIADOS,
    [{ field: 'token', op: 'eq', value: token }],
    { conviteEnviadoEm: nowIso(), atualizadoEm: nowIso() }
  );
}

// Exclusão completa de um aluno (limpeza de testes/erros pelo admin):
// remove do grupo, apaga avaliações, perfil e o registro em app_users.
// Requer policies do DELTA 8.1 (users_delete / profiles_delete por admin).
// Obs.: a conta no Supabase Auth não é apagada — sem registro em app_users,
// um novo login recomeça como aluno sem vínculos.
export async function deleteStudent(uid, groupId = null) {
  // Proteção: nunca apagar uma conta admin pelo app (evita perda de acesso).
  // O banco também recusa via trigger (DELTA 8.3), esta é a primeira barreira.
  const alvo = await getUser(uid).catch(() => null);
  if (alvo?.role === 'admin') {
    throw new Error('Não é possível excluir uma conta de administrador.');
  }
  if (groupId) {
    try { await removeMemberFromGroup(groupId, uid); } catch { /* grupo pode já não existir */ }
  }
  await deleteRows(COLLECTIONS.ASSESSMENTS, [{ field: 'uid', op: 'eq', value: uid }]);
  await deleteRows(COLLECTIONS.PROFILES, [{ field: 'uid', op: 'eq', value: uid }]);
  await deleteRows(COLLECTIONS.USERS, [{ field: 'uid', op: 'eq', value: uid }]);
}

// Retorna todos os avaliados de sessão deste admin (com dados da sessão para exibição)
export async function getAvaliadosByAdmin(adminUid) {
  const rows = await selectRows(COLLECTIONS.AVALIADOS, {
    filters: [{ field: 'adminUid', op: 'eq', value: adminUid }],
    orderBy: 'criadoEm',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id || row.token, ...row }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY LINKS (DELTA 7 / Fase 2.3 — convergência por CPF)
// ═══════════════════════════════════════════════════════════════════════════════

// Alunos (contas) deste admin que possuem CPF — via adminuid (DELTA 6).
export async function getStudentsByAdmin(adminUid) {
  const rows = await selectRows(COLLECTIONS.USERS, {
    filters: [
      { field: 'adminUid', op: 'eq', value: adminUid },
      { field: 'role', op: 'eq', value: 'student' },
    ],
    orderBy: 'createdAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id || row.uid, ...row }));
}

// Vínculos de identidade já confirmados por este admin.
export async function getIdentityLinksByAdmin(adminUid) {
  const rows = await selectRows(COLLECTIONS.IDENTITY_LINKS, {
    filters: [{ field: 'linkedBy', op: 'eq', value: adminUid }],
    orderBy: 'linkedAt',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id, ...row }));
}

// Confirma um vínculo avaliado↔conta sob o mesmo CPF (admin é o autor).
// auto=true → vínculo criado automaticamente por CPF idêntico (Central de Pessoas);
// auto=false → confirmação manual do admin (Fase 2).
export async function createIdentityLink({ cpf, avaliadoId, userUid, adminUid, metadata, auto = false }) {
  const row = await insertRow(COLLECTIONS.IDENTITY_LINKS, {
    cpf,
    avaliadoId: avaliadoId || null,
    userUid: userUid || null,
    linkedBy: adminUid,
    linkedAt: nowIso(),
    auto: !!auto,
    metadata: metadata || {},
  });
  return row?.id;
}

// Remove um vínculo de identidade (desvincular). Só o admin autor consegue (RLS).
export async function deleteIdentityLink(linkId) {
  await deleteRows(COLLECTIONS.IDENTITY_LINKS, [{ field: 'id', op: 'eq', value: linkId }]);
}

/**
 * getSugestoesVinculo — Fase 2.3
 * Detecta automaticamente "a mesma pessoa" por CPF: agrupa avaliados de sessão
 * e contas de aluno que compartilham o mesmo CPF, excluindo grupos onde o vínculo
 * já foi confirmado. Retorna apenas grupos com 2+ registros (algo a vincular).
 *
 * Puro de I/O: faz 3 fetches e cruza em memória. Não grava nada.
 */
export async function getSugestoesVinculo(adminUid) {
  const [avaliados, students, links] = await Promise.all([
    getAvaliadosByAdmin(adminUid),
    getStudentsByAdmin(adminUid),
    getIdentityLinksByAdmin(adminUid),
  ]);

  // CPFs que já têm vínculo confirmado → não sugerir de novo
  const cpfsVinculados = new Set(links.map((l) => l.cpf).filter(Boolean));

  // Agrupa por CPF (só registros COM cpf)
  const porCpf = new Map();
  const add = (cpf, item) => {
    if (!cpf) return;
    if (!porCpf.has(cpf)) porCpf.set(cpf, { cpf, avaliados: [], contas: [] });
    porCpf.get(cpf)[item.tipo === 'conta' ? 'contas' : 'avaliados'].push(item);
  };

  for (const a of avaliados) {
    if (a.cpf) add(a.cpf, { tipo: 'avaliacao', id: a.id, nome: a.nome, perfil: a.perfil?.perfilPrimario || null, criadoEm: a.criadoEm });
  }
  for (const s of students) {
    if (s.cpf) add(s.cpf, { tipo: 'conta', id: s.uid || s.id, nome: s.displayName || s.name || s.email, email: s.email });
  }

  // Sugestões = CPFs com 2+ registros no total, ainda não confirmados
  const sugestoes = [];
  for (const grupo of porCpf.values()) {
    const total = grupo.avaliados.length + grupo.contas.length;
    if (total >= 2 && !cpfsVinculados.has(grupo.cpf)) {
      sugestoes.push(grupo);
    }
  }
  return sugestoes;
}

/**
 * getHistoricoEvolucao — Fase 3
 * Reúne todas as avaliações concluídas de UMA pessoa (mesmo CPF, via vínculos
 * confirmados em app_identity_links) para montar a linha do tempo de evolução.
 *
 * Estratégia (PRD F3 §4): vínculos confirmados como fonte da verdade.
 *  - Pega o avaliado atual (token) → seu CPF
 *  - Se não tem CPF: retorna só o ponto atual, sem histórico
 *  - Busca vínculos confirmados desse CPF; reúne os avaliado_id ligados
 *  - Monta os pontos a partir dos avaliados concluídos COM perfil/scores
 *  - Sinaliza se há outras avaliações com o mesmo CPF ainda não vinculadas
 *
 * @returns {{ pontos: Array, temOutrasNaoVinculadas: boolean, cpf: string|null }}
 */
export async function getHistoricoEvolucao(token, adminUid) {
  const atual = await getAvaliadoByToken(token);
  if (!atual) return { pontos: [], temOutrasNaoVinculadas: false, cpf: null };

  const PROFILE_NAMES = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };
  // concluidoEm/criadoEm vêm embrulhados por withDateWrapper ({ raw, toDate() }).
  // Normaliza para ISO string para ordenação e exibição corretas.
  const unwrapDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (d.raw) return d.raw;
    if (typeof d.toDate === 'function') { try { return d.toDate()?.toISOString?.() ?? null; } catch { return null; } }
    return null;
  };
  const toPonto = (a) => {
    const p = a.perfil || {};
    const quando = unwrapDate(a.concluidoEm) || unwrapDate(a.criadoEm);
    // Rótulo = data curta (dd/mm/aa) — útil para eixo temporal de evolução
    let rotulo = a.sessaoTitulo || 'Avaliação';
    try { if (quando) rotulo = new Date(quando).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch { /* mantém */ }
    return {
      avaliadoId: a.id,
      moduleTitle: rotulo,
      completedAt: quando,
      dominantProfile: p.perfilPrimario || null,
      dominantProfileName: PROFILE_NAMES[p.perfilPrimario] || null,
      scores: {
        D: p.dominante ?? p.scores?.D ?? 0,
        I: p.influente ?? p.scores?.I ?? 0,
        S: p.estavel ?? p.scores?.S ?? 0,
        C: p.analitico ?? p.scores?.C ?? 0,
      },
    };
  };

  // Sem CPF → não há como agrupar; retorna só o atual (se concluído com perfil)
  if (!atual.cpf) {
    const pontos = (atual.status === 'concluido' && atual.perfil) ? [toPonto(atual)] : [];
    return { pontos, temOutrasNaoVinculadas: false, cpf: null };
  }

  // Todos os avaliados deste admin com o mesmo CPF (para detectar não-vinculados)
  const todos = await getAvaliadosByAdmin(adminUid);
  const mesmosCpf = todos.filter((a) => a.cpf === atual.cpf && a.status === 'concluido' && a.perfil);

  // Vínculos confirmados deste CPF
  const links = await getIdentityLinksByAdmin(adminUid);
  const idsVinculados = new Set(
    links.filter((l) => l.cpf === atual.cpf && l.avaliadoId).map((l) => l.avaliadoId)
  );

  // Pontos = avaliações vinculadas + a atual (sempre incluída), deduplicado
  const incluir = new Map();
  for (const a of mesmosCpf) {
    if (idsVinculados.has(a.id) || a.id === atual.id) incluir.set(a.id, a);
  }
  // Garante a atual mesmo que não esteja em mesmosCpf (ex.: recém-concluída)
  if (atual.status === 'concluido' && atual.perfil && !incluir.has(atual.id)) {
    incluir.set(atual.id, atual);
  }

  const pontos = [...incluir.values()]
    .map(toPonto)
    .sort((x, y) => new Date(x.completedAt) - new Date(y.completedAt));

  // Há outras avaliações com o mesmo CPF que NÃO entraram (não vinculadas)?
  const temOutrasNaoVinculadas = mesmosCpf.some((a) => !incluir.has(a.id));

  return { pontos, temOutrasNaoVinculadas, cpf: atual.cpf };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CENTRAL DE PESSOAS (DELTA 9 — identidade unificada híbrida)
// ═══════════════════════════════════════════════════════════════════════════════

const PROFILE_NAMES_PT = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

// Extrai um diagnóstico consolidado a partir do objeto perfil de um avaliado.
function diagnosticoDoPerfil(perfil) {
  if (!perfil || !perfil.perfilPrimario) return null;
  return {
    perfilPrimario: perfil.perfilPrimario,
    perfilPrimarioNome: PROFILE_NAMES_PT[perfil.perfilPrimario] || perfil.perfilPrimario,
    perfilSecundario: perfil.perfilSecundario || null,
    scores: {
      D: perfil.dominante ?? perfil.scores?.D ?? 0,
      I: perfil.influente ?? perfil.scores?.I ?? 0,
      S: perfil.estavel ?? perfil.scores?.S ?? 0,
      C: perfil.analitico ?? perfil.scores?.C ?? 0,
    },
    pqScore: perfil.pqScore ?? null,
  };
}

const isoDe = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d.raw) return d.raw;
  if (typeof d?.toDate === 'function') { try { return d.toDate()?.toISOString?.() ?? null; } catch { return null; } }
  return null;
};

/**
 * getPessoas — Central de Pessoas (PRD §5).
 * Consolida toda pessoa física do admin numa lista única, cruzando avaliados de
 * sessão + contas de aluno + vínculos confirmados. Unificação HÍBRIDA (§4):
 *   - CPF idêntico  → mesma Pessoa (1 registro, sem duplicar)
 *   - mesmo nome SEM cpf comum → vira *sugestão* de duplicata (não unifica)
 *   - CPF diferente → pessoas separadas (homônimos preservados)
 *
 * Puro de I/O: faz os fetches e cruza em memória. NÃO grava nada.
 * @returns {{ pessoas: Array, sugestoes: Array }}
 */
export async function getPessoas(adminUid) {
  const [avaliados, students, links] = await Promise.all([
    getAvaliadosByAdmin(adminUid),
    getStudentsByAdmin(adminUid),
    getIdentityLinksByAdmin(adminUid),
  ]);

  // Chave de agrupamento: CPF (forte) quando existe; senão chave sintética por registro.
  const keyAvaliado = (a) => (a.cpf ? `cpf:${a.cpf}` : `av:${a.id}`);
  const keyConta = (s) => (s.cpf ? `cpf:${s.cpf}` : `user:${s.uid || s.id}`);

  const mapa = new Map(); // key → Pessoa em construção
  const garante = (key) => {
    if (!mapa.has(key)) {
      mapa.set(key, { id: key, nome: '', cpf: null, conta: null, avaliacoes: [], origem: new Set() });
    }
    return mapa.get(key);
  };

  for (const a of avaliados) {
    const p = garante(keyAvaliado(a));
    if (a.cpf) p.cpf = a.cpf;
    p.avaliacoes.push({
      avaliadoId: a.id,
      token: a.token || a.id,
      nome: a.nome || '',
      sessaoId: a.sessaoId || null,
      sessaoTitulo: a.sessaoTitulo || null,
      status: a.status || null,
      criadoEm: isoDe(a.criadoEm),
      concluidoEm: isoDe(a.concluidoEm),
      diagnostico: diagnosticoDoPerfil(a.perfil),
    });
    p.origem.add(a.groupId ? 'grupo' : 'sessao');
  }

  for (const s of students) {
    const p = garante(keyConta(s));
    if (s.cpf) p.cpf = s.cpf;
    p.conta = {
      uid: s.uid || s.id,
      nome: s.displayName || s.name || s.email || '',
      email: s.email || null,
      groupId: s.groupId || null,
    };
    p.origem.add(s.groupId ? 'grupo' : 'aluno');
  }

  // Vínculos confirmados manualmente apontam o "modo" da pessoa (auditoria/UI).
  const cpfsComLinkManual = new Set(links.filter((l) => !l.auto).map((l) => l.cpf).filter(Boolean));
  // Links por CPF (para a ação "desvincular" no detalhe).
  const linksPorCpf = new Map();
  for (const l of links) {
    if (!l.cpf) continue;
    if (!linksPorCpf.has(l.cpf)) linksPorCpf.set(l.cpf, []);
    linksPorCpf.get(l.cpf).push({ id: l.id, auto: !!l.auto, avaliadoId: l.avaliadoId || null });
  }

  // Finaliza cada Pessoa: melhor nome, diagnóstico consolidado (avaliação concluída
  // mais recente — PRD D5), origens e modo de vínculo.
  const pessoas = [...mapa.values()].map((p) => {
    const concluidas = p.avaliacoes
      .filter((av) => av.diagnostico)
      .sort((x, y) => new Date(y.concluidoEm || 0) - new Date(x.concluidoEm || 0));
    const diagnostico = concluidas[0]?.diagnostico || null;

    // Conclusão REAL independente do shape do perfil: o avaliado pode ter
    // status 'concluido' mesmo que `perfil` ainda não tenha sido populado
    // (ex.: avaliação concluída antes do deploy da Edge atualizarStatus).
    const concluiu = p.avaliacoes.some((av) => av.status === 'concluido' || !!av.diagnostico);

    const nomeAvaliacaoRecente = [...p.avaliacoes]
      .sort((x, y) => new Date(y.criadoEm || 0) - new Date(x.criadoEm || 0))[0]?.nome;
    const nome = p.conta?.nome || nomeAvaliacaoRecente || 'Sem nome';

    const totalRegistros = p.avaliacoes.length + (p.conta ? 1 : 0);
    let vinculo = 'isolado';
    if (totalRegistros >= 2) {
      vinculo = p.cpf
        ? (cpfsComLinkManual.has(p.cpf) ? 'manual' : 'auto')
        : 'isolado';
    }

    return {
      id: p.id,
      nome,
      cpf: p.cpf,
      temCpf: !!p.cpf,
      conta: p.conta,
      avaliacoes: p.avaliacoes,
      origem: [...p.origem],
      totalAvaliacoes: p.avaliacoes.length,
      diagnostico,
      concluiu,
      vinculo,
      vinculoLinks: p.cpf ? (linksPorCpf.get(p.cpf) || []) : [],
    };
  });

  // Sugestões por NOME (caso C): mesmas pessoas-chave distintas com nome igual,
  // onde pelo menos uma NÃO tem CPF (CPFs diferentes = caso B, homônimos → ignora).
  const porNome = new Map();
  for (const p of pessoas) {
    const chave = normalizeName(p.nome);
    if (!chave || chave === 'sem nome') continue;
    if (!porNome.has(chave)) porNome.set(chave, []);
    porNome.get(chave).push(p);
  }
  const sugestoes = [];
  for (const [chave, grupo] of porNome.entries()) {
    if (grupo.length < 2) continue;
    const cpfs = grupo.map((p) => p.cpf).filter(Boolean);
    const todosTemCpf = grupo.every((p) => p.cpf);
    const cpfsDistintos = new Set(cpfs).size;
    // caso B puro (todos com CPF e CPFs diferentes) → homônimos, não sugere
    if (todosTemCpf && cpfsDistintos > 1) continue;
    sugestoes.push({ nome: grupo[0].nome, chave, pessoas: grupo });
  }

  return { pessoas, sugestoes };
}

/**
 * autoVincularPorCpf — Central de Pessoas (PRD §4 caso A).
 * Materializa em app_identity_links os vínculos que o CPF idêntico já garante,
 * SEM clique do admin. Idempotente: não recria vínculos já existentes.
 *
 * Roda com a sessão do próprio admin (não service_role) → linked_by = ele.
 * @returns {{ criados: number }}
 */
export async function autoVincularPorCpf(adminUid) {
  const [avaliados, students, links] = await Promise.all([
    getAvaliadosByAdmin(adminUid),
    getStudentsByAdmin(adminUid),
    getIdentityLinksByAdmin(adminUid),
  ]);

  // Agrupa registros COM cpf por CPF.
  const porCpf = new Map();
  for (const a of avaliados) {
    if (!a.cpf) continue;
    if (!porCpf.has(a.cpf)) porCpf.set(a.cpf, { avaliados: [], contas: [] });
    porCpf.get(a.cpf).avaliados.push(a);
  }
  for (const s of students) {
    if (!s.cpf) continue;
    if (!porCpf.has(s.cpf)) porCpf.set(s.cpf, { avaliados: [], contas: [] });
    porCpf.get(s.cpf).contas.push(s);
  }

  // Vínculos já existentes por (cpf|avaliadoId) para não duplicar.
  const existentes = new Set(
    links.filter((l) => l.avaliadoId).map((l) => `${l.cpf}|${l.avaliadoId}`)
  );

  const tarefas = [];
  for (const [cpf, grupo] of porCpf.entries()) {
    const total = grupo.avaliados.length + grupo.contas.length;
    if (total < 2) continue; // nada a unificar (registro solitário)
    const conta = grupo.contas[0] || null;
    for (const av of grupo.avaliados) {
      if (existentes.has(`${cpf}|${av.id}`)) continue;
      tarefas.push(createIdentityLink({
        cpf,
        avaliadoId: av.id,
        userUid: conta?.uid || conta?.id || null,
        adminUid,
        auto: true,
        metadata: { auto: true, nome: av.nome || null },
      }));
    }
  }

  if (tarefas.length) await Promise.all(tarefas);
  return { criados: tarefas.length };
}

// Keep named export compatibility.
export const db = { provider: 'supabase-rest' };
