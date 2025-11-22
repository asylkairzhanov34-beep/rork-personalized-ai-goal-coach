import React, { useState, ReactNode } from 'react';
import { useSubscription } from '@/hooks/use-subscription-store';
import SubscriptionPaywall from './SubscriptionPaywall';

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  message?: string;
  fallback?: ReactNode;
}

export default function PremiumGate({
  children,
  feature = 'эта функция',
  message = 'Получите полный доступ к GoalForge',
  fallback = null,
}: PremiumGateProps) {
  const { canAccessPremiumFeatures } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const hasAccess = canAccessPremiumFeatures();

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <>
        <SubscriptionPaywall
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          feature={feature}
          message={message}
          fullscreen={false}
        />
      </>
    );
  }

  return <>{children}</>;
}

export function usePremiumGate() {
  const { canAccessPremiumFeatures, getFeatureAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const checkAccess = (featureName?: string): boolean => {
    const hasAccess = canAccessPremiumFeatures();
    if (!hasAccess) {
      setShowPaywall(true);
      console.log('[PremiumGate] Access denied:', featureName || 'premium feature');
    }
    return hasAccess;
  };

  return {
    checkAccess,
    hasAccess: canAccessPremiumFeatures(),
    featureAccess: getFeatureAccess(),
    PaywallModal: () => (
      <SubscriptionPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        fullscreen={false}
      />
    ),
  };
}
