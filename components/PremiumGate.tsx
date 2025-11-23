import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';
import PaywallModal from './PaywallModal';

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  fallback?: ReactNode;
}

export default function PremiumGate({
  children,
  feature = 'эта функция',
  fallback = null,
}: PremiumGateProps) {
  const router = useRouter();
  const { canAccessPremiumFeatures } = useSubscription();
  const hasAccess = canAccessPremiumFeatures();
  const [showPaywall, setShowPaywall] = useState(!hasAccess);

  useEffect(() => {
    setShowPaywall(!hasAccess);
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <>
        {fallback}
        <PaywallModal
          visible={showPaywall}
          variant="feature"
          featureName={feature}
          onPrimaryAction={() => router.push('/subscription')}
          onSecondaryAction={() => setShowPaywall(false)}
          onRequestClose={() => setShowPaywall(false)}
          primaryLabel="Оформить Premium"
          secondaryLabel="Позже"
        />
      </>
    );
  }

  return <>{children}</>;
}

export function usePremiumGate() {
  const router = useRouter();
  const { canAccessPremiumFeatures, getFeatureAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const checkAccess = (featureName?: string): boolean => {
    const allowed = canAccessPremiumFeatures();
    if (!allowed) {
      setShowPaywall(true);
      console.log('[PremiumGate] Access denied:', featureName || 'premium feature');
    }
    return allowed;
  };

  const Paywall = () => (
    <PaywallModal
      visible={showPaywall}
      variant="feature"
      featureName="GoalForge Premium"
      onPrimaryAction={() => {
        setShowPaywall(false);
        router.push('/subscription');
      }}
      onSecondaryAction={() => setShowPaywall(false)}
      onRequestClose={() => setShowPaywall(false)}
      primaryLabel="Оформить Premium"
      secondaryLabel="Не сейчас"
    />
  );

  return {
    checkAccess,
    hasAccess: canAccessPremiumFeatures(),
    featureAccess: getFeatureAccess(),
    PaywallModal: Paywall,
  };
}
