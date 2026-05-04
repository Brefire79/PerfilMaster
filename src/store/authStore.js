import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ─── State ───────────────────────────────────────────────────────────
        user: null,
        role: null,
        loading: true,
        initialized: false,
        error: null,

        // ─── Actions ─────────────────────────────────────────────────────────

        /**
         * Set the authenticated user and their role
         * @param {object} user - Firebase user object
         * @param {string} role - 'admin' | 'student'
         */
        setUser: (user, role = null) =>
          set(
            {
              user: user
                ? {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                  }
                : null,
              role,
              loading: false,
              initialized: true,
              error: null,
            },
            false,
            'auth/setUser'
          ),

        /**
         * Clear user state on sign out
         */
        clearUser: () => {
          // Also wipe persisted role so stale 'student'/'admin' doesn't bleed into next session
          try { localStorage.removeItem('profileai-auth'); } catch (_) {}
          set(
            {
              user: null,
              role: null,
              loading: false,
              initialized: true,
              error: null,
            },
            false,
            'auth/clearUser'
          );
        },

        /**
         * Set loading state
         */
        setLoading: (loading) =>
          set({ loading }, false, 'auth/setLoading'),

        /**
         * Set error state
         */
        setError: (error) =>
          set({ error }, false, 'auth/setError'),

        /**
         * Mark auth as initialized (first load complete)
         */
        setInitialized: () =>
          set({ initialized: true, loading: false }, false, 'auth/setInitialized'),

        // ─── Selectors ───────────────────────────────────────────────────────

        isAuthenticated: () => get().user !== null,
        isAdmin: () => get().role === 'admin',
        isStudent: () => get().role === 'student',
      }),
      {
        name: 'profileai-auth',
        partialize: (state) => ({
          // Only persist non-sensitive, non-reactive data
          role: state.role,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

export default useAuthStore;
