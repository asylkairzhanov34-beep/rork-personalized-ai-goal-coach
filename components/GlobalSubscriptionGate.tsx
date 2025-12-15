import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { useAuth } from '@/hooks/use-auth-store';
import TrialExpiredModal from '@/components/TrialExpiredModal';

export function GlobalSubscriptionGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTrialExpired, isPremium, checking } = useSubscriptionStatus();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Give a small buffer for hydration
    const timer = setTimeout(() => setIsReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const isAuthScreen = pathname === '/auth' || pathname === '/' || pathname === '/first-time-setup';

  const shouldBlock = 
    isReady && 
    !checking && 
    !authLoading &&
    isAuthenticated &&
    !isPremium && 
    isTrialExpired && 
    !isAuthScreen &&
    pathname !== '/subscription' && 
    pathname !== '/subscription-success';

  const handleGetPremium = () => {
    // We are blocked, so we need to go to subscription.
    // Since TrialExpiredModal is likely a full screen modal, 
    // navigating might be tricky if the modal stays open.
    // But our logic says "pathname !== '/subscription'", so once we navigate,
    // the modal should disappear (unmount/hide), allowing the screen to show.
    router.push('/subscription');
  };

  if (!shouldBlock) {
    return null;
  }

  return (
    <TrialExpiredModal
      visible={true}
      onGetPremium={handleGetPremium}
      testID="global-subscription-gate"
    />
  );
}
