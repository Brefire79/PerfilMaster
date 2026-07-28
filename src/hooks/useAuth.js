import { useEffect, useCallback } from 'react';
import { onAuthStateChange, signOut as firebaseSignOut } from '@/firebase/auth.js';
import { getUser } from '@/firebase/firestore.js';
import { isBackendDown, mensagemDeRede } from '@/firebase/http.js';
import { reportClientError } from '@/lib/clientErrors.js';
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
  const { user, role, loading, initialized, initError, setUser, clearUser, setLoading, setInitError } =
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
          // C1/A2: antes assumia 'student' aqui. Um blip de rede rebaixava o
          // facilitador a aluno e o jogava em /student/dashboard. Quando a
          // falha é de transporte, não sabemos o papel — mostramos a tela de
          // indisponibilidade em vez de adivinhar.
          if (isBackendDown(err)) {
            // M2: registra a indisponibilidade — é o sintoma do Supabase pausado.
            reportClientError(err, { source: 'auth/init', adminUid: firebaseUser.uid });
            setInitError(mensagemDeRede(err));
          } else {
            // Resposta veio do servidor, mas sem documento do usuário:
            // conta recém-criada ainda sem linha em app_users → aluno.
            setUser(firebaseUser, 'student');
          }
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
    initError,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isStudent: role === 'student',
    signOut,
  };
}

export default useAuth;
