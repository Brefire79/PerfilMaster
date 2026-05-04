import { useState, useCallback, useRef } from 'react';
import {
  getGroup,
  getUsersByGroup,
  getProfilesByGroup,
} from '@/firebase/firestore.js';
import {
  saveGroupReport,
  getGroupReport,
} from '@/firebase/firestore.js';
import useAuthStore from '@/store/authStore.js';
import { groupInsights } from '@/firebase/functions.js';

// ─── Profile order ────────────────────────────────────────────────────────────
const PROFILE_KEYS = ['D', 'I', 'S', 'C'];

// ─── Distribution calculator ──────────────────────────────────────────────────
function computeDistribution(profilesArray) {
  const counts = { D: 0, I: 0, S: 0, C: 0 };
  for (const p of profilesArray) {
    if (p.dominantProfile && counts[p.dominantProfile] !== undefined) {
      counts[p.dominantProfile]++;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.fromEntries(
    PROFILE_KEYS.map((k) => [k, total > 0 ? Math.round((counts[k] / total) * 100) : 0])
  );
}

// ─── Dominant profile of a group ─────────────────────────────────────────────
function computeDominantProfile(profilesArray) {
  const counts = { D: 0, I: 0, S: 0, C: 0 };
  for (const p of profilesArray) {
    if (p.dominantProfile && counts[p.dominantProfile] !== undefined) {
      counts[p.dominantProfile]++;
    }
  }
  let dominant = null;
  let max = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) { max = v; dominant = k; }
  }
  return dominant;
}

/**
 * useGroupReport — hook that orchestrates group report data and AI generation.
 *
 * @param {string} groupId
 */
export function useGroupReport(groupId) {
  const { user } = useAuthStore();

  const [loading, setLoading]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState(null);
  const [group, setGroup]           = useState(null);
  const [members, setMembers]       = useState([]);
  // profiles: map of userId → profile object
  const [profiles, setProfiles]     = useState({});
  const [report, setReport]         = useState(null);

  const loadedRef = useRef(false);

  // ─── loadReport ─────────────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch: group meta, members, profiles
      const [groupData, membersData, profilesArray] = await Promise.all([
        getGroup(groupId),
        getUsersByGroup(groupId),
        getProfilesByGroup(groupId),
      ]);

      setGroup(groupData);
      setMembers(membersData);

      // Build profiles map: uid → profile
      const profilesMap = {};
      for (const p of profilesArray) {
        profilesMap[p.uid || p.id] = p;
      }
      setProfiles(profilesMap);

      // Try to load existing group report
      try {
        const existingReport = await getGroupReport(groupId);
        setReport(existingReport || null);
      } catch {
        setReport(null);
      }

      loadedRef.current = true;
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados do grupo.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // ─── generateInsights ────────────────────────────────────────────────────────
  const generateInsights = useCallback(async () => {
    if (!groupId || !user?.uid) return;
    setGenerating(true);
    setError(null);

    try {
      const profilesArray = Object.values(profiles);
      const completedProfiles = profilesArray.filter((p) => p.dominantProfile);

      if (completedProfiles.length < 2) {
        throw new Error('É necessário pelo menos 2 avaliações concluídas para gerar insights.');
      }

      const payload = {
        groupId,
        groupName: group?.name || '',
        profiles: completedProfiles.map((p) => ({
          uid:             p.uid || p.id,
          dominantProfile: p.dominantProfile,
          scores:          p.scores || {},
          summary:         p.aiSummary?.summary || '',
          strengths:       p.aiSummary?.strengths || [],
          challenges:      p.aiSummary?.challenges || [],
        })),
        distribution: computeDistribution(completedProfiles),
      };

      const insightData = await groupInsights(payload);

      // Persist to Firestore
      const reportPayload = {
        groupId,
        adminUid:       user.uid,
        generatedAt:    new Date().toISOString(),
        memberCount:    members.length,
        completedCount: completedProfiles.length,
        distribution:   computeDistribution(completedProfiles),
        dominantProfile: computeDominantProfile(completedProfiles),
        aiInsight:      insightData?.insight || insightData?.text || '',
        teamDynamics:   insightData?.teamDynamics || '',
        collaborationTips: insightData?.collaborationTips || [],
        conflictRisks:  insightData?.conflictRisks || [],
        recommendedRoles: insightData?.recommendedRoles || {},
      };

      await saveGroupReport(reportPayload);
      setReport(reportPayload);
    } catch (err) {
      setError(err.message || 'Erro ao gerar insights.');
    } finally {
      setGenerating(false);
    }
  }, [groupId, user?.uid, profiles, group, members]);

  // ─── refreshReport ───────────────────────────────────────────────────────────
  const refreshReport = useCallback(async () => {
    if (!groupId) return;
    try {
      const fresh = await getGroupReport(groupId);
      setReport(fresh || null);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar relatório.');
    }
  }, [groupId]);

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const profilesArray    = Object.values(profiles);
  const completedProfiles = profilesArray.filter((p) => p.dominantProfile);
  const distribution     = computeDistribution(completedProfiles);
  const dominantProfile  = computeDominantProfile(completedProfiles);

  const completionRate = members.length > 0
    ? Math.round((completedProfiles.length / members.length) * 100)
    : 0;

  // Last assessment date: newest updatedAt among profiles
  const lastAssessmentDate = completedProfiles.reduce((latest, p) => {
    const ts = p.updatedAt?.toDate?.() || (p.updatedAt ? new Date(p.updatedAt) : null);
    if (!ts) return latest;
    return !latest || ts > latest ? ts : latest;
  }, null);

  const canGenerate = completedProfiles.length >= 2;

  return {
    loading,
    generating,
    error,
    group,
    members,
    profiles,
    profilesArray,
    completedProfiles,
    report,
    distribution,
    dominantProfile,
    completionRate,
    lastAssessmentDate,
    canGenerate,
    loadReport,
    generateInsights,
    refreshReport,
  };
}

export default useGroupReport;
