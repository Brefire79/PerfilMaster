import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { ConfirmModal } from '@/components/ui/Modal.jsx';
import { deleteGroup } from '@/firebase/firestore.js';
import useGroupStore from '@/store/groupStore.js';

/**
 * Returns initials from a display name (max 2 chars)
 * @param {string} name
 * @returns {string}
 */
function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * AvatarStack — shows up to maxVisible initials circles + overflow count
 * @param {Array<{id: string, displayName?: string, name?: string}>} members
 * @param {number} maxVisible
 * @param {string} groupColor
 */
function AvatarStack({ members = [], maxVisible = 3, groupColor }) {
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m, i) => (
        <div
          key={m.id || i}
          title={m.displayName || m.name || '?'}
          className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-bold border-2 border-[#242736] select-none flex-shrink-0"
          style={{
            backgroundColor: `${groupColor}25`,
            color: groupColor,
            zIndex: maxVisible - i,
          }}
        >
          {getInitials(m.displayName || m.name || '?')}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-bold bg-[#2D3047] text-[#A0A3B1] border-2 border-[#242736] flex-shrink-0"
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

/**
 * GroupCard — card component for a single group
 *
 * @param {{ id: string, name: string, color: string, description?: string, members?: Array, memberIds?: Array, moduleId?: string, moduleName?: string, createdAt?: any }} group
 * @param {() => void} onEdit - callback to open edit modal
 * @param {() => void} onDeleted - callback after successful delete
 */
export default function GroupCard({ group, onEdit, onDeleted }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { removeGroup } = useGroupStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);

  const color = group.color || '#6366F1';
  const memberCount = group.memberIds?.length ?? group.members?.length ?? 0;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleCardClick = () => {
    navigate(`/admin/groups/${group.id}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGroup(group.id);
      removeGroup(group.id);
      onDeleted?.();
    } catch (err) {
      console.error('Error deleting group:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Card
        variant="default"
        hoverable
        className="relative overflow-hidden cursor-pointer group/card transition-all duration-200 hover:border-[#6366F1]/30"
        onClick={handleCardClick}
      >
        {/* Colored left border accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />

        <div className="pl-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {/* Color dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-[#F7F8FC] truncate font-heading">
                {group.name}
              </h3>
            </div>

            {/* 3-dot menu */}
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A0A3B1] hover:text-[#F7F8FC] hover:bg-[#2D3047] transition-colors opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                aria-label={t('app.edit')}
                aria-expanded={menuOpen}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 w-44 bg-[#1A1D2E] border border-[#2D3047] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-30 overflow-hidden animate-fade-in">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit?.(group);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#F7F8FC] hover:bg-[#242736] transition-colors text-left"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      className="w-4 h-4 text-[#A0A3B1]"
                      aria-hidden="true"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {t('app.edit')}
                  </button>
                  <div className="h-px bg-[#2D3047]" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors text-left"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    {t('app.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <p className="text-xs text-[#A0A3B1] line-clamp-2 mb-3">
              {group.description}
            </p>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between mt-auto gap-2 flex-wrap">
            <AvatarStack
              members={group.members || []}
              groupColor={color}
              maxVisible={3}
            />

            <div className="flex items-center gap-2">
              {group.moduleName && (
                <Badge variant="accent" size="sm">
                  {group.moduleName}
                </Badge>
              )}
              <Badge variant="neutral" size="sm">
                {t('admin.groups.membersCount', { count: memberCount })}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('admin.groups.deleteConfirm')}
        description={t('admin.groups.deleteWarning')}
        confirmLabel={t('app.delete')}
        cancelLabel={t('app.cancel')}
        variant="danger"
        loading={deleting}
      />
    </>
  );
}
