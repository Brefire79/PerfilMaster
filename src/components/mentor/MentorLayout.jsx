/**
 * ProfileAI — AMB FUSI | Sistema de Mentoria
 * MentorLayout.jsx — Layout base para todas as páginas do mentor
 */
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

const NAV_ITEMS = [
  { path: '/mentor/dashboard', label: 'Dashboard',  icon: '◼' },
  { path: '/mentor/testes',    label: 'Testes',      icon: '📋' },
  { path: '/mentor/alunos',    label: 'Alunos',      icon: '👥' },
  { path: '/mentor/admin',     label: 'Admin',       icon: '⚙️' },
];

export default function MentorLayout({ user, children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const initials = (user?.email ?? 'M').substring(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: '#0f172a',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #1e293b',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            ProfileAI
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Sistema de Mentoria</div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px',
                  borderRadius: '0 12px 12px 0',
                  marginRight: 12, marginBottom: 2,
                  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                  borderLeft: `3px solid ${active ? '#6366f1' : 'transparent'}`,
                  color: active ? '#a5b4fc' : '#64748b',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              <div style={{ color: '#475569', fontSize: 11 }}>Mentor</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, color: '#fca5a5', fontSize: 13, padding: '7px 0',
              cursor: 'pointer', fontWeight: 500,
            }}>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}

// ── Subcomponentes re-exportados ──────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e2e8f0',
      padding: '20px 32px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

export function PageBody({ children, style }) {
  return (
    <div style={{ padding: '28px 32px', flex: 1, ...style }}>
      {children}
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 16, padding: '20px 24px',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', disabled, style, type = 'button', title }) {
  const variants = {
    primary:   { background: '#6366f1', color: '#fff', border: 'none' },
    secondary: { background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' },
    danger:    { background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' },
    success:   { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
    ghost:     { background: 'transparent', color: '#6b7280', border: 'none' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...variants[variant],
        borderRadius: 10, padding: '8px 16px',
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, transition: 'all 0.15s',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Badge({ children, color = '#6366f1' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px',
      borderRadius: 999,
      backgroundColor: color + '18',
      color,
      border: `1px solid ${color}30`,
    }}>{children}</span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    draft:       { label: 'Rascunho',  color: '#64748b' },
    active:      { label: 'Ativo',     color: '#10b981' },
    closed:      { label: 'Encerrado', color: '#ef4444' },
    registered:  { label: 'Cadastrado',  color: '#6366f1' },
    in_progress: { label: 'Em teste',    color: '#f59e0b' },
    completed:   { label: 'Concluído',   color: '#10b981' },
  };
  const cfg = map[status] ?? { label: status, color: '#64748b' };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{title}</h3>
      {description && <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>{description}</p>}
      {action}
    </div>
  );
}

export function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size,
      border: '2px solid #e2e8f0', borderTopColor: '#6366f1',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Spinner size={40} />
    </div>
  );
}
