import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useGroupStore = create(
  devtools(
    (set, get) => ({
      // ─── State ─────────────────────────────────────────────────────────────
      groups: [],
      currentGroup: null,
      loading: false,
      error: null,

      // ─── Actions ───────────────────────────────────────────────────────────

      /**
       * Replace the full groups list
       * @param {Array} groups
       */
      setGroups: (groups) =>
        set({ groups, loading: false, error: null }, false, 'group/setGroups'),

      /**
       * Set the currently selected/active group
       * @param {object|null} group
       */
      setCurrentGroup: (group) =>
        set({ currentGroup: group }, false, 'group/setCurrentGroup'),

      /**
       * Add a new group to the list
       * @param {object} group
       */
      addGroup: (group) =>
        set(
          (state) => ({ groups: [group, ...state.groups] }),
          false,
          'group/addGroup'
        ),

      /**
       * Update an existing group in the list
       * @param {string} groupId
       * @param {object} updates
       */
      updateGroup: (groupId, updates) =>
        set(
          (state) => ({
            groups: state.groups.map((g) =>
              g.id === groupId ? { ...g, ...updates } : g
            ),
            currentGroup:
              state.currentGroup?.id === groupId
                ? { ...state.currentGroup, ...updates }
                : state.currentGroup,
          }),
          false,
          'group/updateGroup'
        ),

      /**
       * Remove a group from the list
       * @param {string} groupId
       */
      removeGroup: (groupId) =>
        set(
          (state) => ({
            groups: state.groups.filter((g) => g.id !== groupId),
            currentGroup:
              state.currentGroup?.id === groupId ? null : state.currentGroup,
          }),
          false,
          'group/removeGroup'
        ),

      /**
       * Add a member UID to the current group
       * @param {string} uid
       */
      addMember: (uid) =>
        set(
          (state) => {
            if (!state.currentGroup) return {};
            return {
              currentGroup: {
                ...state.currentGroup,
                memberIds: [...(state.currentGroup.memberIds || []), uid],
              },
            };
          },
          false,
          'group/addMember'
        ),

      /**
       * Remove a member UID from the current group
       * @param {string} uid
       */
      removeMember: (uid) =>
        set(
          (state) => {
            if (!state.currentGroup) return {};
            return {
              currentGroup: {
                ...state.currentGroup,
                memberIds: (state.currentGroup.memberIds || []).filter(
                  (id) => id !== uid
                ),
              },
            };
          },
          false,
          'group/removeMember'
        ),

      setLoading: (loading) =>
        set({ loading }, false, 'group/setLoading'),

      setError: (error) =>
        set({ error, loading: false }, false, 'group/setError'),

      reset: () =>
        set(
          { groups: [], currentGroup: null, loading: false, error: null },
          false,
          'group/reset'
        ),

      // ─── Selectors ─────────────────────────────────────────────────────────
      getGroupById: (id) => get().groups.find((g) => g.id === id) || null,
    }),
    { name: 'GroupStore' }
  )
);

export default useGroupStore;
