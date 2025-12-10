import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Timer, BarChart3, Settings, Maximize2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { PomodoroStats } from '@/components/PomodoroStats';
import { FocusSettingsModal } from '@/components/FocusSettingsModal';
import { useTimer } from '@/hooks/use-timer-store';
import { DEFAULT_SOUND_ID } from '@/constants/sounds';
import { SoundManager } from '@/utils/SoundManager';


type TabType = 'timer' | 'stats';

export default function TimerScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('timer');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const timerStore = useTimer();
  
  const notificationSound = timerStore?.notificationSound ?? DEFAULT_SOUND_ID;
  const setNotificationSound = timerStore?.setNotificationSound;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const preloadInBackground = async () => {
      if (!SoundManager.areAllLoaded()) {
        console.log('🎵 Background preloading sounds for instant Focus settings...');
        await SoundManager.preloadAll();
        console.log('✅ Background preload complete - sounds ready!');
      } else {
        console.log('✅ Sounds already loaded');
      }
    };
    
    preloadInBackground();
  }, []);


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Focus</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/timer-fullscreen')}
          >
            <Maximize2 size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'timer' && styles.tabButtonActive]}
          onPress={() => setActiveTab('timer')}
        >
          <Timer size={18} color={activeTab === 'timer' ? theme.colors.background : theme.colors.textSecondary} />
          <Text style={[styles.tabLabel, activeTab === 'timer' && styles.tabLabelActive]}>
            Timer
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
          onPress={() => setActiveTab('stats')}
        >
          <BarChart3 size={18} color={activeTab === 'stats' ? theme.colors.background : theme.colors.textSecondary} />
          <Text style={[styles.tabLabel, activeTab === 'stats' && styles.tabLabelActive]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'timer' ? (
          <PomodoroTimer />
        ) : (
          <PomodoroStats />
        )}
      </ScrollView>
      
      {/* Settings Modal */}
      {setNotificationSound && (
        <FocusSettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          selectedSound={notificationSound}
          onSoundChange={setNotificationSound}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  tabLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.background,
    fontWeight: theme.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
});
