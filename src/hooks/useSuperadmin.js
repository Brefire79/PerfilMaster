import { useEffect, useState } from 'react';
import useAuthStore from '@/store/authStore.js';
import { getIsSuperadmin } from '@/firebase/firestore.js';

// Cache em módulo: o status de superadmin não muda durante a sessão.
let _cache = null; // null = desconhecido | true | false

/**
 * useSuperadmin — resolve, uma vez por sessão, se o usuário logado é superadmin
 * (allowlist app_superadmins via RPC is_superadmin()). Fail-safe: false.
 */
export function useSuperadmin() {
  const user = useAuthStore((s) => s.user);
  const [isSuperadmin, setIsSuperadmin] = useState(_cache === true);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    let ativo = true;
    if (!user) {
      _cache = null;
      setIsSuperadmin(false);
      setLoading(false);
      return;
    }
    if (_cache !== null) {
      setIsSuperadmin(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    getIsSuperadmin()
      .then((res) => {
        _cache = !!res;
        if (ativo) {
          setIsSuperadmin(_cache);
          setLoading(false);
        }
      })
      .catch(() => {
        _cache = false;
        if (ativo) {
          setIsSuperadmin(false);
          setLoading(false);
        }
      });
    return () => { ativo = false; };
  }, [user]);

  return { isSuperadmin, loading };
}

/** Limpa o cache (chamar no logout). */
export function resetSuperadminCache() {
  _cache = null;
}
