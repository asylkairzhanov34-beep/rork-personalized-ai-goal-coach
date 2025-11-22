import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useSubscription } from '@/hooks/use-subscription-store';
import PaywallModal from './PaywallModal';

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
  fallback?: React.ReactNode;
}

export default function PremiumGate({ 
  children, 
  feature = 'Эта функция',
  fallback 
}: PremiumGateProps) {
  const { canAccessPremiumFeatures } = useSubscription();
  const hasAccess = canAccessPremiumFeatures();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!hasAccess) {
      setShowPaywall(true);
    }
  }, [hasAccess]);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {fallback ? (
        fallback
      ) : (
        <View style={styles.lockedContainer}>
          <Lock size={48} color="#FFD700" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>{feature} доступна в Premium</Text>
          <Text style={styles.subtitle}>
            Оформите подписку, чтобы получить доступ к этому функционалу
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setShowPaywall(true)}
          >
            <Text style={styles.buttonText}>Разблокировать</Text>
          </TouchableOpacity>
        </View>
      )}

      <PaywallModal 
        visible={showPaywall} 
        onClose={() => setShowPaywall(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedContainer: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
