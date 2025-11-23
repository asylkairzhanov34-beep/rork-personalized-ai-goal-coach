import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import Step1Profile from '@/components/setup/Step1Profile';
import Step2Goal from '@/components/setup/Step2Goal';
import Step3Biorhythm from '@/components/setup/Step3Biorhythm';
import Step4Welcome from '@/components/setup/Step4Welcome';

export default function FirstTimeSetupScreen() {
  const { profile, updateProfile, completeSetup, setStep } = useFirstTimeSetup();
  const [localStep, setLocalStep] = useState<number>(0);

  const handleStep1Next = async (data: { nickname: string; birthdate: Date }) => {
    await updateProfile({
      nickname: data.nickname,
      birthdate: data.birthdate,
      isCompleted: false,
    });
    setLocalStep(1);
    setStep(1);
  };

  const handleStep2Next = async (goal: 'focus' | 'discipline' | 'calm' | 'ambition') => {
    await updateProfile({
      primaryGoal: goal,
    });
    setLocalStep(2);
    setStep(2);
  };

  const handleStep2Skip = () => {
    setLocalStep(2);
    setStep(2);
  };

  const handleStep3Next = async (time: 'morning' | 'afternoon' | 'evening') => {
    await updateProfile({
      productivityTime: time,
    });
    setLocalStep(3);
    setStep(3);
  };

  const handleStep3Skip = () => {
    setLocalStep(3);
    setStep(3);
  };

  const handleWelcomeComplete = async () => {
    await completeSetup();
    router.replace('/(tabs)/home');
  };

  const sanitizedProductivityTime: 'morning' | 'afternoon' | 'evening' | undefined =
    profile?.productivityTime && profile.productivityTime !== 'unknown'
      ? profile.productivityTime
      : undefined;

  const renderStep = () => {
    switch (localStep) {
      case 0:
        return (
          <Step1Profile
            onNext={handleStep1Next}
            initialData={{
              nickname: profile?.nickname || '',
              birthdate: profile?.birthdate,
            }}
          />
        );
      case 1:
        return (
          <Step2Goal
            onNext={handleStep2Next}
            onSkip={handleStep2Skip}
            initialGoal={profile?.primaryGoal}
          />
        );
      case 2:
        return (
          <Step3Biorhythm
            onNext={handleStep3Next}
            onSkip={handleStep3Skip}
            initialTime={sanitizedProductivityTime}
          />
        );
      case 3:
        return (
          <Step4Welcome
            nickname={profile?.nickname || 'друг'}
            onComplete={handleWelcomeComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderStep()}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
