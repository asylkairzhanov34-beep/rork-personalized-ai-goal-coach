import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
import { BreathingTechnique, BreathingSession } from '@/types/breathing';
import { BREATHING_TECHNIQUES } from '@/constants/breathing';

export function useBreathingTimer() {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTechnique, setCurrentTechnique] = useState<BreathingTechnique | null>(null);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);
  const [sessions, setSessions] = useState<BreathingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<BreathingSession | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const currentPhase = currentTechnique?.phases[currentPhaseIndex] || null;

  const startSession = (technique: BreathingTechnique) => {
    if (!technique || !technique.id || !technique.phases.length) return;
    const session: BreathingSession = {
      id: Date.now().toString(),
      techniqueId: technique.id,
      startTime: new Date(),
      completedCycles: 0,
      totalCycles: technique.totalCycles,
      completed: false
    };

    setCurrentSession(session);
    setCurrentTechnique(technique);
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeLeft(technique.phases[0].duration);
    setTotalTimeElapsed(0);
    setIsActive(true);
    setIsPaused(false);
    startTimeRef.current = new Date();
  };

  const pauseSession = () => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resumeSession = () => {
    setIsPaused(false);
    startTimeRef.current = new Date();
  };

  const stopSession = () => {
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        endTime: new Date(),
        completedCycles: currentCycle,
        completed: false
      };
      setSessions(prev => [...prev, updatedSession]);
    }

    setIsActive(false);
    setIsPaused(false);
    setCurrentSession(null);
    setCurrentTechnique(null);
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeLeft(0);
    setTotalTimeElapsed(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const completeSession = useCallback(() => {
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        endTime: new Date(),
        completedCycles: currentTechnique?.totalCycles || 0,
        completed: true
      };
      setSessions(prev => [...prev, completedSession]);
    }

    setIsActive(false);
    setIsPaused(false);
    setCurrentSession(null);
    setCurrentTechnique(null);
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeLeft(0);
    setTotalTimeElapsed(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [currentSession, currentTechnique]);

  // Timer effect
  useEffect(() => {
    if (isActive && !isPaused && currentTechnique) {
      intervalRef.current = setInterval(() => {
        setPhaseTimeLeft(prev => {
          if (prev <= 1) {
            // Vibrate on exhale phases
            if (currentPhase?.type === 'exhale' && Platform.OS !== 'web') {
              Vibration.vibrate(200);
            }

            // Move to next phase
            const nextPhaseIndex = currentPhaseIndex + 1;
            
            if (nextPhaseIndex >= currentTechnique.phases.length) {
              // Cycle completed
              const nextCycle = currentCycle + 1;
              
              if (nextCycle >= currentTechnique.totalCycles) {
                // Session completed
                completeSession();
                return 0;
              } else {
                // Start next cycle
                setCurrentCycle(nextCycle);
                setCurrentPhaseIndex(0);
                return currentTechnique.phases[0].duration;
              }
            } else {
              // Move to next phase in current cycle
              setCurrentPhaseIndex(nextPhaseIndex);
              return currentTechnique.phases[nextPhaseIndex].duration;
            }
          }
          return prev - 1;
        });
        
        setTotalTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isActive, isPaused, currentTechnique, currentPhaseIndex, currentCycle, currentPhase, completeSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getTechnique = (id: string) => {
    return BREATHING_TECHNIQUES.find(t => t.id === id) || null;
  };

  const getTodaySessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  };

  const getProgress = () => {
    if (!currentTechnique || !currentPhase) return 0;
    
    const totalPhaseTime = currentPhase.duration;
    const timeElapsed = totalPhaseTime - phaseTimeLeft;
    return timeElapsed / totalPhaseTime;
  };

  const getOverallProgress = () => {
    if (!currentTechnique) return 0;
    
    const totalPhases = currentTechnique.totalCycles * currentTechnique.phases.length;
    const completedPhases = currentCycle * currentTechnique.phases.length + currentPhaseIndex;
    const currentPhaseProgress = getProgress();
    
    return (completedPhases + currentPhaseProgress) / totalPhases;
  };

  return {
    // State
    isActive,
    isPaused,
    currentTechnique,
    currentCycle,
    currentPhase,
    phaseTimeLeft,
    totalTimeElapsed,
    sessions,
    currentSession,
    
    // Actions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    
    // Helpers
    getTechnique,
    getTodaySessions,
    getProgress,
    getOverallProgress,
    
    // Constants
    techniques: BREATHING_TECHNIQUES
  };
}