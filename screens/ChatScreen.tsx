import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Send, Bot, MessageSquarePlus, Sparkles, X } from 'lucide-react-native';
import { useChat } from '@/hooks/use-chat-store';
import { ChatMessage } from '@/types/chat';
import { theme } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription-store';
import PaywallModal from '@/components/PaywallModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MessageBubbleProps {
  message: ChatMessage;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isFirstInGroup, isLastInGroup }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, translateY]);

  const getBubbleStyle = () => {
    if (message.isBot) {
      return {
        borderTopLeftRadius: isFirstInGroup ? 20 : 6,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: isLastInGroup ? 20 : 6,
        borderBottomRightRadius: 20,
      };
    }
    return {
      borderTopLeftRadius: 20,
      borderTopRightRadius: isFirstInGroup ? 20 : 6,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: isLastInGroup ? 20 : 6,
    };
  };

  return (
    <Animated.View 
      style={[
        styles.messageRow, 
        { 
          opacity: fadeAnim, 
          transform: [{ translateY }],
          marginBottom: isLastInGroup ? 16 : 3,
        },
        message.isBot ? styles.botRow : styles.userRow
      ]}
    >
      {message.isBot && isLastInGroup && (
        <View style={styles.avatarWrapper}>
          <View style={styles.botAvatar}>
            <Sparkles size={14} color="#000" />
          </View>
        </View>
      )}
      {message.isBot && !isLastInGroup && <View style={styles.avatarPlaceholder} />}
      
      <View style={[
        styles.messageBubble,
        message.isBot ? styles.botBubble : styles.userBubble,
        getBubbleStyle()
      ]}>
        <Text style={[
          styles.messageText,
          message.isBot ? styles.botText : styles.userText
        ]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const ChatScreen: React.FC = () => {
  const { messages, sendMessage, clearChat, isLoading, error } = useChat();
  const router = useRouter();
  const [inputText, setInputText] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const [isSending, setIsSending] = useState(false);
  const { getFeatureAccess, checkSubscriptionStatus, status, isPremium, trialState } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const featureAccess = getFeatureAccess();

  useEffect(() => {
    console.log('[ChatScreen] Mounted - checking subscription status');
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const handleSend = async () => {
    if (inputText.trim()) {
      if (!featureAccess.aiChatAssistant) {
        setShowPaywall(true);
        return;
      }

      const text = inputText.trim();
      setInputText('');
      setIsSending(true);
      try {
        await sendMessage(text);
      } catch (e) {
        console.error('[ChatScreen] sendMessage failed:', e);
      } finally {
        setIsSending(false);
      }
    }
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages]);

  const shouldBlockChat = false;
  
  if (shouldBlockChat && !featureAccess.aiChatAssistant) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerContainer} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarGradient}>
                  <Sparkles size={20} color={theme.colors.background} />
                </View>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>GoalForge</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.textSecondary }]} />
                  <Text style={styles.headerSubtitle}>Premium Feature</Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
        <PaywallModal
          visible
          variant="feature"
          featureName="GoalForge AI Chat"
          onPrimaryAction={() => router.push('/subscription')}
          onSecondaryAction={() => router.back()}
          onRequestClose={() => router.back()}
          primaryLabel="Get Premium"
          secondaryLabel="Go Back"
          testID="chat-paywall"
        />
      </View>
    );
  }

  const getMessageGroups = () => {
    const groups: { message: ChatMessage; isFirstInGroup: boolean; isLastInGroup: boolean }[] = [];
    
    messages.forEach((message, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      
      const isFirstInGroup = !prevMessage || prevMessage.isBot !== message.isBot;
      const isLastInGroup = !nextMessage || nextMessage.isBot !== message.isBot;
      
      groups.push({ message, isFirstInGroup, isLastInGroup });
    });
    
    return groups;
  };

  return (
    <>
      <PaywallModal
        visible={showPaywall}
        variant="feature"
        featureName="GoalForge AI Chat"
        onPrimaryAction={() => {
          setShowPaywall(false);
          router.push('/subscription');
        }}
        onSecondaryAction={() => setShowPaywall(false)}
        onRequestClose={() => setShowPaywall(false)}
        primaryLabel="Get Premium"
        secondaryLabel="Not Now"
      />
      <View style={styles.container}>
        <SafeAreaView style={styles.headerContainer} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="chat-close-button"
            >
              <X size={22} color={theme.colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <View style={styles.headerAvatarSmall}>
                <Sparkles size={16} color="#000" />
              </View>
              <View>
                <Text style={styles.headerTitle}>GoalForge</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusDot} />
                  <Text style={styles.headerSubtitle}>Online</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={clearChat} 
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MessageSquarePlus size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.chatContainer}>
            {!!error && (
              <View style={styles.errorBanner} testID="chat-error-banner">
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}
            
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <View style={styles.emptyIconGlow} />
                    <View style={styles.emptyIcon}>
                      <Bot size={32} color="#FFD600" />
                    </View>
                  </View>
                  <Text style={styles.emptyTitle}>GoalForge AI</Text>
                  <Text style={styles.emptyText}>
                    I can help analyze your progress{'\n'}and edit your existing tasks
                  </Text>
                  
                  <View style={styles.suggestionsGrid}>
                    <TouchableOpacity 
                      style={styles.suggestionCard}
                      onPress={() => setInputText("Analyze my progress")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionIcon}>📊</Text>
                      <Text style={styles.suggestionText}>Analyze Progress</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.suggestionCard}
                      onPress={() => setInputText("Show my tasks")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionIcon}>📋</Text>
                      <Text style={styles.suggestionText}>My Tasks</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.suggestionCard}
                      onPress={() => setInputText("Mark my first task as complete")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionIcon}>✅</Text>
                      <Text style={styles.suggestionText}>Complete Task</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.suggestionCard}
                      onPress={() => setInputText("Productivity tips")}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionIcon}>💡</Text>
                      <Text style={styles.suggestionText}>Tips</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {getMessageGroups().map(({ message, isFirstInGroup, isLastInGroup }, index) => (
                <MessageBubble 
                  key={message.id || index} 
                  message={message}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                />
              ))}
              
              {(isLoading || isSending) && (
                <View style={styles.typingRow}>
                  <View style={styles.avatarWrapper}>
                    <View style={styles.botAvatar}>
                      <Sparkles size={14} color="#000" />
                    </View>
                  </View>
                  <View style={styles.typingBubble}>
                    <View style={styles.typingDots}>
                      <Animated.View style={[styles.typingDot, { opacity: 0.4 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: 0.7 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: 1 }]} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
          
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputText.trim() || isSending}
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isSending) && styles.sendButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Send size={18} color="#000" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  headerContainer: {
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  avatarWrapper: {
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: 8,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botBubble: {
    backgroundColor: '#1A1A1A',
  },
  userBubble: {
    backgroundColor: '#FFD600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  botText: {
    color: '#FFFFFF',
  },
  userText: {
    color: '#000000',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  emptyIconGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFD600',
    opacity: 0.15,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD600',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  suggestionCard: {
    width: (SCREEN_WIDTH - 62) / 2,
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  suggestionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD600',
  },
  inputContainer: {
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    backgroundColor: '#FFD600',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});

export default ChatScreen;
