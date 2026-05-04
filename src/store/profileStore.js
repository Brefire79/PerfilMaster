import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useProfileStore = create(
  devtools(
    (set, get) => ({
      // ─── State ─────────────────────────────────────────────────────────────
      profiles: [],
      currentProfile: null,
      loading: false,
      error: null,

      // ─── Actions ───────────────────────────────────────────────────────────

      /**
       * Set the current user's behavioral profile
       * @param {object|null} profile
       */
      setProfile: (profile) =>
        set(
          { currentProfile: profile, loading: false, error: null },
          false,
          'profile/setProfile'
        ),

      /**
       * Set list of profiles (e.g., for group view)
       * @param {Array} profiles
       */
      setProfiles: (profiles) =>
        set(
          { profiles, loading: false, error: null },
          false,
          'profile/setProfiles'
        ),

      /**
       * Update the current profile with partial data
       * @param {object} updates
       */
      updateCurrentProfile: (updates) =>
        set(
          (state) => ({
            currentProfile: state.currentProfile
              ? { ...state.currentProfile, ...updates }
              : null,
          }),
          false,
          'profile/updateCurrentProfile'
        ),

      /**
       * Add a profile to the list
       * @param {object} profile
       */
      addProfile: (profile) =>
        set(
          (state) => ({
            profiles: [...state.profiles.filter((p) => p.uid !== profile.uid), profile],
          }),
          false,
          'profile/addProfile'
        ),

      /**
       * Update a specific profile in the list
       * @param {string} uid
       * @param {object} updates
       */
      updateProfile: (uid, updates) =>
        set(
          (state) => ({
            profiles: state.profiles.map((p) =>
              p.uid === uid ? { ...p, ...updates } : p
            ),
          }),
          false,
          'profile/updateProfile'
        ),

      setLoading: (loading) =>
        set({ loading }, false, 'profile/setLoading'),

      setError: (error) =>
        set({ error, loading: false }, false, 'profile/setError'),

      reset: () =>
        set(
          { profiles: [], currentProfile: null, loading: false, error: null },
          false,
          'profile/reset'
        ),

      // ─── Selectors ─────────────────────────────────────────────────────────
      hasProfile: () => get().currentProfile !== null,
      getProfileByUid: (uid) =>
        get().profiles.find((p) => p.uid === uid) || null,
      getProfileDistribution: () => {
        const profiles = get().profiles;
        const dist = { D: 0, I: 0, S: 0, C: 0 };
        profiles.forEach((p) => {
          if (p.primaryType && dist[p.primaryType] !== undefined) {
            dist[p.primaryType]++;
          }
        });
        return dist;
      },
    }),
    { name: 'ProfileStore' }
  )
);

export default useProfileStore;
