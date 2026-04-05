/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * mentorApi.js — Funções utilitárias de API para o Mentor
 */
import { supabase } from './supabase.js';

// ── Perfil ────────────────────────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Testes ────────────────────────────────────────────────────────────────────
export async function listTests(mentorId) {
  const { data, error } = await supabase
    .from('tests')
    .select(`
      *,
      questions(count),
      test_students(count)
    `)
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTest(testId) {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .single();
  if (error) throw error;
  return data;
}

export async function getTestByToken(token) {
  const { data, error } = await supabase
    .from('tests')
    .select('*, questions(id, order_index, type, content, options, required)')
    .eq('invite_token', token)
    .eq('status', 'active')
    .single();
  if (error) throw error;
  return data;
}

export async function createTest(mentorId, payload) {
  const { data, error } = await supabase
    .from('tests')
    .insert({ ...payload, mentor_id: mentorId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTest(testId, payload) {
  const { data, error } = await supabase
    .from('tests')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', testId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTest(testId) {
  const { error } = await supabase.from('tests').delete().eq('id', testId);
  if (error) throw error;
}

// ── Perguntas ─────────────────────────────────────────────────────────────────
export async function getQuestions(testId) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testId)
    .order('order_index');
  if (error) throw error;
  return data ?? [];
}

export async function saveQuestions(testId, questions) {
  // Remove antigas e insere novas (simplificado)
  await supabase.from('questions').delete().eq('test_id', testId);
  if (!questions.length) return [];
  const rows = questions.map((q, i) => ({ ...q, test_id: testId, order_index: i }));
  const { data, error } = await supabase.from('questions').insert(rows).select();
  if (error) throw error;
  return data;
}

// ── Alunos ────────────────────────────────────────────────────────────────────
export async function getTestStudents(testId) {
  const { data, error } = await supabase
    .from('test_students')
    .select('*')
    .eq('test_id', testId)
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllStudents(mentorId) {
  // Alunos de todos os testes do mentor
  const { data, error } = await supabase
    .from('test_students')
    .select('*, tests!inner(title, mentor_id)')
    .eq('tests.mentor_id', mentorId)
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function registerStudent(testId, payload) {
  const { data, error } = await supabase
    .from('test_students')
    .insert({ test_id: testId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudentStatus(studentId, status, extra = {}) {
  const { data, error } = await supabase
    .from('test_students')
    .update({ status, ...extra })
    .eq('id', studentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Grupos ────────────────────────────────────────────────────────────────────
export async function getGroups(testId) {
  const { data, error } = await supabase
    .from('test_groups')
    .select('*, group_members(student_id)')
    .eq('test_id', testId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createGroup(testId, name, color = '#6366f1') {
  const { data, error } = await supabase
    .from('test_groups')
    .insert({ test_id: testId, name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGroup(groupId) {
  const { error } = await supabase.from('test_groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function addToGroup(groupId, studentId) {
  // Remove de grupos anteriores no mesmo teste
  const { data: grp } = await supabase.from('test_groups').select('test_id').eq('id', groupId).single();
  if (grp) {
    const { data: otherGroups } = await supabase.from('test_groups').select('id').eq('test_id', grp.test_id);
    if (otherGroups?.length) {
      await supabase.from('group_members').delete()
        .in('group_id', otherGroups.map(g => g.id))
        .eq('student_id', studentId);
    }
  }
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, student_id: studentId });
  if (error) throw error;
}

export async function removeFromGroup(groupId, studentId) {
  const { error } = await supabase.from('group_members')
    .delete().eq('group_id', groupId).eq('student_id', studentId);
  if (error) throw error;
}

// ── Respostas e Resultados ────────────────────────────────────────────────────
export async function saveAnswers(testId, studentId, answers) {
  // answers: [{ question_id, answer_value }]
  const rows = answers.map(a => ({ test_id: testId, student_id: studentId, ...a }));
  const { error } = await supabase.from('test_answers').upsert(rows, { onConflict: 'student_id,question_id' });
  if (error) throw error;
}

export async function saveResult(testId, studentId, summary) {
  const { data, error } = await supabase
    .from('test_results')
    .upsert({ test_id: testId, student_id: studentId, answers_summary: summary }, { onConflict: 'test_id,student_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTestResults(testId) {
  const { data, error } = await supabase
    .from('test_results')
    .select('*, test_students(name, email)')
    .eq('test_id', testId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllResultsForMentor(mentorId) {
  const { data, error } = await supabase
    .from('test_results')
    .select('*, tests!inner(title, mentor_id), test_students(name, email)')
    .eq('tests.mentor_id', mentorId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export async function getDashboardStats(mentorId) {
  const [testsRes, studentsRes, completedRes] = await Promise.all([
    supabase.from('tests').select('id, status', { count: 'exact' }).eq('mentor_id', mentorId),
    supabase.from('test_students')
      .select('id', { count: 'exact' })
      .in('test_id',
        (await supabase.from('tests').select('id').eq('mentor_id', mentorId)).data?.map(t => t.id) ?? []
      ),
    supabase.from('test_results')
      .select('id', { count: 'exact' })
      .in('test_id',
        (await supabase.from('tests').select('id').eq('mentor_id', mentorId)).data?.map(t => t.id) ?? []
      ),
  ]);

  const tests = testsRes.data ?? [];
  return {
    totalTests:     tests.length,
    activeTests:    tests.filter(t => t.status === 'active').length,
    totalStudents:  studentsRes.count ?? 0,
    completedTests: completedRes.count ?? 0,
  };
}

// ── Realtime ──────────────────────────────────────────────────────────────────
export function subscribeToTestStudents(testId, onInsert) {
  return supabase
    .channel(`test_students_${testId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'test_students', filter: `test_id=eq.${testId}` },
      payload => onInsert(payload.new)
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'test_students', filter: `test_id=eq.${testId}` },
      payload => onInsert(payload.new)
    )
    .subscribe();
}

// ── Exportação CSV ────────────────────────────────────────────────────────────
export function exportCSV(rows, filename = 'export') {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}
