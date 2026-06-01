import { useEffect, useCallback } from 'react';
import { onAuthStateChange, signOut as firebaseSignOut } from '@/firebase/auth.js';
import { getUser } from '@/firebase/firestore.js';
import useAuthStore from '@/store/authStore.js';
import useGroupStore from '@/store/groupStore.js';
import useProfileStore from '@/store/profileStore.js';
import useAssessmentStore from '@/store/assessmentStore.js';

/**
 * useAuth — Primary authentication hook
 *
 * Initializes Firebase Auth state listener, syncs user + role to Zustand,
 * and provides auth action helpers.
 */
export function useAuth() {
  const { user, role, loading, initialized, setUser, clearUser, setLoading } =
    useAuthStore();
  const resetGroups = useGroupStore((s) => s.reset);
  const resetProfiles = useProfileStore((s) => s.reset);
  const resetAssessment = useAssessmentStore((s) => s.resetAssessment);

  // ─── Initialize auth state listener ────────────────────────────────────────
  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user document from Firestore to get role + displayName fallback
          const userDoc = await getUser(firebaseUser.uid);
          const resolvedDisplayName =
            firebaseUser.displayName || userDoc?.displayName || userDoc?.name || null;
          setUser(
            { ...firebaseUser, displayName: resolvedDisplayName },
            userDoc?.role || 'student'
          );
        } catch (err) {
          console.error('[useAuth] Failed to fetch user document:', err);
          setUser(firebaseUser, 'student');
        }
      } else {
        clearUser();
      }
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sign out with full state cleanup ──────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut();
      clearUser();
      resetGroups();
      resetProfiles();
      resetAssessment();
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
      throw err;
    }
  }, [clearUser, resetGroups, resetProfiles, resetAssessment]);

  return {
    user,
    role,
    loading,
    initialized,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isStudent: role === 'student',
    signOut,
  };
}

export default useAuth;
