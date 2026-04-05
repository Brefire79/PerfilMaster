/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * StudentSidebar.jsx — Sidebar em tempo real de alunos (Supabase Realtime)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { getTestStudents, subscribeToTestStudents, addToGroup, removeFromGroup } from '../../lib/mentorApi.js';
import { StatusBadge, Spinner } from './MentorLayout.jsx';

const STATUS_ORDER = { in_progress: 0, registered: 1, completed: 2 };

export default function StudentSidebar({ testId, mode, groups, onGroupsChange }) {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dragOver, setDragOver] = useState(null);    // groupId being dragged over
  const [dragging, setDragging] = useState(null);    // { studentId }

  // ── Carregar alunos ───────────────────────────────────────────────────────
  const loadStudents = useCallback(async () => {
    if (!testId) return;
    try {
      const data = await getTestStudents(testId);
      setStudents(data);
    } catch (e) {
      console.error('[StudentSidebar]', e);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) return;
    const channel = subscribeToTestStudents(testId, (updated) => {
      setStudents(prev => {
        const idx = prev.findIndex(s => s.id === updated.id);
        if (idx === -1) return [updated, ...prev];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    });
    return () => { supabase.removeChannel(channel); };
  }, [testId]);

  // ── Drag-and-drop nativo ──────────────────────────────────────────────────
  function handleDragStart(e, studentId) {
    setDragging({ studentId });
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDropOnGroup(e, groupId) {
    e.preventDefault();
    setDragOver(null);
    if (!dragging) return;
    try {
      await addToGroup(groupId, dragging.studentId);
      onGroupsChange?.();
    } catch (err) { console.error(err); }
    setDragging(null);
  }

  const sorted = [...students].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
  );

  const unassigned = sorted.filter(s => {
    if (!groups?.length) return true;
    const allMemberIds = groups.flatMap(g => g.group_members?.map(m => m.student_id) ?? []);
    return !allMemberIds.includes(s.id);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
            Alunos Cadastrados
          </span>
          <span style={{
            background: '#6366f115', color: '#6366f1', borderRadius: 999,
            fontSize: 12, fontWeight: 700, padding: '2px 10px',
          }}>{students.length}</span>
        </div>
        {/* Pulsing dot — realtime ativo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: '#64748b' }}>Atualização em tempo real</span>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
      </div>

      {/* Lista de alunos */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
            Nenhum aluno cadastrado ainda
          </div>
        ) : (
          sorted.map(s => (
            <StudentRow
              key={s.id}
              student={s}
              draggable={mode === 'group'}
              onDragStart={(e) => handleDragStart(e, s.id)}
              onDragEnd={() => setDragging(null)}
            />
          ))
        )}
      </div>

      {/* Grupos (modo grupo) */}
      {mode === 'group' && groups && (
        <GroupZones
          groups={groups}
          students={students}
          unassigned={unassigned}
          dragOver={dragOver}
          setDragOver={setDragOver}
          dragging={dragging}
          onDrop={handleDropOnGroup}
          onRemoveMember={async (groupId, studentId) => {
            await removeFromGroup(groupId, studentId);
            onGroupsChange?.();
          }}
        />
      )}
    </div>
  );
}

// ── StudentRow ────────────────────────────────────────────────────────────────
function StudentRow({ student, draggable, onDragStart, onDragEnd }) {
  const initials = student.name.substring(0, 2).toUpperCase();
  const dt = new Date(student.registered_at);
  const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', cursor: draggable ? 'grab' : 'default',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {student.name}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {student.email}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <StatusBadge status={student.status} />
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{date} {time}</span>
      </div>
    </div>
  );
}

// ── GroupZones ────────────────────────────────────────────────────────────────
function GroupZones({ groups, students, unassigned, dragOver, setDragOver, dragging, onDrop, onRemoveMember }) {
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  return (
    <div style={{ borderTop: '2px solid #e2e8f0', padding: '12px 0', flexShrink: 0, maxHeight: 320, overflowY: 'auto' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', padding: '0 16px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Grupos
      </div>

      {/* Sem grupo */}
      {unassigned.length > 0 && (
        <div style={{ padding: '4px 16px 8px', fontSize: 11, color: '#94a3b8' }}>
          Sem grupo: {unassigned.map(s => s.name).join(', ')}
        </div>
      )}

      {groups.map(g => {
        const members = (g.group_members ?? []).map(m => studentMap[m.student_id]).filter(Boolean);
        const isDragOver = dragOver === g.id;
        return (
          <div
            key={g.id}
            onDragOver={e => { e.preventDefault(); setDragOver(g.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => onDrop(e, g.id)}
            style={{
              margin: '4px 12px', borderRadius: 10,
              border: `2px ${isDragOver ? 'solid' : 'dashed'} ${isDragOver ? g.color : '#e2e8f0'}`,
              background: isDragOver ? g.color + '10' : '#f8fafc',
              padding: '8px 12px', transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{g.name}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{members.length} aluno{members.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {members.map(m => (
                <div key={m.id} style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
                  padding: '2px 8px', fontSize: 11, color: '#374151',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {m.name.split(' ')[0]}
                  <button onClick={() => onRemoveMember(g.id, m.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
              {members.length === 0 && (
                <div style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>Arraste alunos aqui</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
