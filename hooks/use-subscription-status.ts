import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from './use-subscription-store';

const HAS_SEEN_SUB_OFFER = 'hasSeenPaywall';
const TRIAL_START_ISO = 'trialStartedAt';
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type TrialSnapshot = {
  startedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  remainingMs: number;
};

const buildTrialSnapshot = (iso: string | null): TrialSnapshot => {
  if (!iso) {
    return {
      startedAt: null,
      expiresAt: null,
      isActive: false,
      isExpired: false,
      remainingMs: 0,
    };
  }

  const startedMs = Date.parse(iso);
  if (Number.isNaN(startedMs)) {
    return {
      startedAt: null,
      expiresAt: null,
      isActive: false,
      isExpired: false,
      remainingMs: 0,
    };
  }

  const expiresMs = startedMs + TRIAL_DURATION_MS;
  const now = Date.now();

  return {
    startedAt: new Date(startedMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
    isActive: now < expiresMs,
    isExpired: now >= expiresMs,
    remainingMs: Math.max(expiresMs - now, 0),
  };
};

export type SubscriptionStatusHook = {
  isPremium: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  checking: boolean;
  shouldShowOffer: boolean;
  trialExpiresAt: string | null;
  startTrial: (source?: 'primary' | 'skip' | 'dev') => Promise<void>;
  refreshStatus: () => Promise<void>;
};

export function useSubscriptionStatus(): SubscriptionStatusHook {
  const {
    status,
    trialState,
    startTrial: startTrialFromStore,
    checkSubscriptionStatus,
    isInitialized,
  } = useSubscription();
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hasSeenOffer, setHasSeenOffer] = useState(false);
  const [trialStartIso, setTrialStartIso] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const entries = await AsyncStorage.multiGet([HAS_SEEN_SUB_OFFER, TRIAL_START_ISO]);
        if (!mounted) {
          return;
        }
        const seen = entries.find(([key]) => key === HAS_SEEN_SUB_OFFER)?.[1];
        const trial = entries.find(([key]) => key === TRIAL_START_ISO)?.[1];
        setHasSeenOffer(seen === 'true');
        setTrialStartIso(trial ?? null);
      } catch (error) {
        console.error('[useSubscriptionStatus] hydrate failed', error);
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!trialState.startedAt || trialStartIso) {
      return;
    }
    AsyncStorage.setItem(TRIAL_START_ISO, trialState.startedAt).catch(() => undefined);
    setTrialStartIso(trialState.startedAt);
  }, [trialStartIso, trialState.startedAt]);

  useEffect(() => {
    if (status === 'premium' && !hasSeenOffer) {
      AsyncStorage.setItem(HAS_SEEN_SUB_OFFER, 'true').catch(() => undefined);
      setHasSeenOffer(true);
    }
  }, [hasSeenOffer, status]);

  const trialSnapshot = useMemo(() => {
    const source = trialStartIso ?? trialState.startedAt ?? null;
    return buildTrialSnapshot(source);
  }, [trialStartIso, trialState.startedAt]);

  const shouldShowOffer = useMemo(() => {
    if (!hydrated || !isInitialized) {
      return false;
    }
    if (status === 'premium') {
      return false;
    }
    if (hasSeenOffer) {
      return false;
    }
    return !trialSnapshot.startedAt;
  }, [hasSeenOffer, hydrated, isInitialized, status, trialSnapshot.startedAt]);

  const startTrial = useCallback(
    async (source: 'primary' | 'skip' | 'dev' = 'primary') => {
      if (checking) {
        return;
      }
      setChecking(true);
      try {
        const now = new Date().toISOString();
        // Both primary and skip give 24h free access
        await AsyncStorage.multiSet([
          [TRIAL_START_ISO, now],
          [HAS_SEEN_SUB_OFFER, 'true'],
        ]);
        setTrialStartIso(now);
        setHasSeenOffer(true);
        await startTrialFromStore(now);
        console.log('[useSubscriptionStatus] trial started', { source, trialStart: now });
        
        // Analytics
        if (source === 'primary' || source === 'skip') {
          console.log('[Analytics] trial_started', { source });
        }
      } catch (error) {
        console.error('[useSubscriptionStatus] trial start failed', error);
      } finally {
        setChecking(false);
      }
    },
    [checking, startTrialFromStore],
  );

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    try {
      await checkSubscriptionStatus();
      if (!trialSnapshot.startedAt) {
        const stored = await AsyncStorage.getItem(TRIAL_START_ISO);
        setTrialStartIso(stored ?? null);
      }
    } finally {
      setChecking(false);
    }
  }, [checkSubscriptionStatus, trialSnapshot.startedAt]);

  return {
    isPremium: status === 'premium',
    isTrialActive: trialSnapshot.isActive,
    isTrialExpired: trialSnapshot.isExpired,
    checking: checking || !hydrated,
    shouldShowOffer,
    trialExpiresAt: trialSnapshot.expiresAt,
    startTrial,
    refreshStatus,
  };
}
