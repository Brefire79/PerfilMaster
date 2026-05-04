import { useEffect, useCallback, useState } from 'react';
import {
  getGroupsByAdmin,
  getGroup,
  createGroup as createGroupInDB,
  updateGroup as updateGroupInDB,
  deleteGroup as deleteGroupInDB,
  subscribeToGroups,
  createInvite,
} from '@/firebase/firestore.js';
import useGroupStore from '@/store/groupStore.js';
import useAuthStore from '@/store/authStore.js';

/**
 * useGroup — Group management hook for admin
 *
 * Subscribes to real-time group updates and provides CRUD operations.
 */
export function useGroup() {
  const { user } = useAuthStore();
  const {
    groups,
    currentGroup,
    loading,
    error,
    setGroups,
    setCurrentGroup,
    addGroup,
    updateGroup,
    removeGroup,
    setLoading,
    setError,
  } = useGroupStore();

  const [inviteLoading, setInviteLoading] = useState(false);

  // ─── Real-time subscription to groups ──────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);

    const unsubscribe = subscribeToGroups(user.uid, (updatedGroups) => {
      setGroups(updatedGroups);
    });

    return () => unsubscribe();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Create a new group ─────────────────────────────────────────────────────
  const createGroup = useCallback(
    async (data) => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const groupId = await createGroupInDB({
          ...data,
          adminUid: user.uid,
          adminName: user.displayName || user.email,
        });
        return groupId;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [user, setLoading, setError]
  );

  // ─── Update a group ─────────────────────────────────────────────────────────
  const editGroup = useCallback(
    async (groupId, updates) => {
      try {
        await updateGroupInDB(groupId, updates);
        updateGroup(groupId, updates);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [updateGroup, setError]
  );

  // ─── Delete a group ─────────────────────────────────────────────────────────
  const deleteGroup = useCallback(
    async (groupId) => {
      try {
        await deleteGroupInDB(groupId);
        removeGroup(groupId);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [removeGroup, setError]
  );

  // ─── Select a group to work with ───────────────────────────────────────────
  const selectGroup = useCallback(
    async (groupId) => {
      if (!groupId) {
        setCurrentGroup(null);
        return;
      }
      try {
        const group = await getGroup(groupId);
        setCurrentGroup(group);
        return group;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [setCurrentGroup, setError]
  );

  // ─── Generate invite link ───────────────────────────────────────────────────
  const generateInvite = useCallback(
    async (groupId) => {
      if (!user?.uid) return null;
      setInviteLoading(true);
      try {
        const token = await createInvite(groupId, user.uid);
        const inviteUrl = `${window.location.origin}/join/${token}`;
        return { token, inviteUrl };
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setInviteLoading(false);
      }
    },
    [user?.uid, setError]
  );

  return {
    groups,
    currentGroup,
    loading,
    error,
    inviteLoading,
    createGroup,
    editGroup,
    deleteGroup,
    selectGroup,
    generateInvite,
  };
}

export default useGroup;
