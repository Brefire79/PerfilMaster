import { getValidAccessToken } from './auth.js';

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
};

const GROUP_REPORTS = import.meta.env.VITE_SB_TABLE_GROUP_REPORTS || 'app_group_reports';

// ─── Key mapping: camelCase (app) ↔ lowercase (PostgreSQL) ───────────────────
// PostgreSQL folds unquoted identifiers to lowercase; this table maps them back.
const CAMEL_TO_DB = {
  adminUid: 'adminuid',
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

export async function registerStudentWithGroup(uid, userData, groupId, inviteToken) {
  await createUser(uid, {
    ...userData,
    role: 'student',
    groupId,
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

// Retorna todos os avaliados de sessão deste admin (com dados da sessão para exibição)
export async function getAvaliadosByAdmin(adminUid) {
  const rows = await selectRows(COLLECTIONS.AVALIADOS, {
    filters: [{ field: 'adminUid', op: 'eq', value: adminUid }],
    orderBy: 'criadoEm',
    ascending: false,
  });
  return rows.map((row) => withDateWrapper({ id: row.id || row.token, ...row }));
}

// Keep named export compatibility.
export const db = { provider: 'supabase-rest' };
