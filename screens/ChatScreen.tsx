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
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, Bot, MessageSquarePlus, Sparkles } from 'lucide-react-native';
import { useChat } from '@/hooks/use-chat-store';
import { ChatMessage } from '@/types/chat';
import { theme } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription-store';
import PaywallModal from '@/components/PaywallModal';

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showAvatar }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View 
      style={[
        styles.messageContainer, 
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        message.isBot ? styles.botContainer : styles.userContainer
      ]}
    >
      {message.isBot && (
        <View style={[styles.avatarContainer, !showAvatar && styles.hiddenAvatar]}>
          <View style={styles.botAvatar}>
            <Bot size={14} color={theme.colors.background} />
          </View>
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        message.isBot ? styles.botBubble : styles.userBubble
      ]}>
        <Text style={[
          styles.messageText,
          message.isBot ? styles.botText : styles.userText
        ]}>
          {message.text}
        </Text>
        <Text style={[
          styles.timestamp,
          message.isBot ? styles.botTimestamp : styles.userTimestamp
        ]}>
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>

      {!message.isBot && (
         <View style={[styles.avatarContainer, !showAvatar && styles.hiddenAvatar]}>
          {/* Placeholder for user avatar if needed, or just empty space for alignment */}
         </View>
      )}
    </Animated.View>
  );
};


const ChatScreen: React.FC = () => {
  const { messages, sendMessage, clearChat, isLoading, error } = useChat();
  const params = useLocalSearchParams<{ initialMessage?: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState<string>(params.initialMessage || '');
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const insets = useSafeAreaInsets();

  const [isSending, setIsSending] = useState(false);
  const { getFeatureAccess, checkSubscriptionStatus, status, isPremium, trialState } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const featureAccess = getFeatureAccess();

  useEffect(() => {
    console.log('[ChatScreen] Mounted - checking subscription status');
    console.log('[ChatScreen] Current status:', status);
    console.log('[ChatScreen] Is Premium:', isPremium);
    console.log('[ChatScreen] Trial active:', trialState.isActive);
    console.log('[ChatScreen] Has AI chat access:', featureAccess.aiChatAssistant);
    console.log('[ChatScreen] Trial state full:', JSON.stringify(trialState));
    console.log('[ChatScreen] Feature access full:', JSON.stringify(featureAccess));
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus, status, isPremium, trialState.isActive, featureAccess.aiChatAssistant]);

  useEffect(() => {
    console.log('[ChatScreen] Status changed:', status);
    console.log('[ChatScreen] AI chat access:', featureAccess.aiChatAssistant);
  }, [status, featureAccess.aiChatAssistant]);

  const handleSend = async () => {
    if (inputText.trim()) {
      console.log('[ChatScreen] handleSend called');
      console.log('[ChatScreen] Has AI chat access:', featureAccess.aiChatAssistant);
      console.log('[ChatScreen] Is Premium:', isPremium);
      console.log('[ChatScreen] Trial active:', trialState.isActive);
      
      if (!featureAccess.aiChatAssistant) {
        console.log('[ChatScreen] No access - showing paywall');
        setShowPaywall(true);
        return;
      }

      const text = inputText.trim();
      console.log('[ChatScreen] Sending message:', text);
      setInputText('');
      setIsSending(true);
      try {
        await sendMessage(text);
        console.log('[ChatScreen] Message sent successfully');
      } catch (e) {
        console.error('[ChatScreen] sendMessage failed:', e);
        if (e instanceof Error) {
          console.error('[ChatScreen] Error message:', e.message);
          console.error('[ChatScreen] Error stack:', e.stack);
        }
      } finally {
        setIsSending(false);
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    // Small timeout to ensure layout is updated
    setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Always allow access to chat screen, check inside handleSend instead
  const shouldBlockChat = false; // Removed blocking at screen level
  
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
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGradient}>
                <Sparkles size={20} color={theme.colors.background} />
              </View>
            </View>
            <View style={styles.headerTextContainer}>
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
            <MessageSquarePlus size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.chatContainer}>
        {!!error && (
          <View style={styles.errorBanner} testID="chat-error-banner">
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: Platform.OS === 'android' ? 20 : 10 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconGlow} />
              <View style={styles.emptyIcon}>
                <Bot size={36} color={theme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Hi! I’m GoalForge</Text>
              <Text style={styles.emptyText}>
                I’ll help analyze your progress and give you advice.{"\n"}
                Ask me about productivity or your goals analysis.
              </Text>
              
              <View style={styles.suggestionsContainer}>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInputText("Give me productivity tips")}
                >
                  <Text style={styles.suggestionText}>📝 Productivity Tips</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInputText("Analyze my progress")}
                >
                  <Text style={styles.suggestionText}>📊 Analyze Progress</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInputText("Add a task for tomorrow")}
                >
                  <Text style={styles.suggestionText}>➕ Add Task</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInputText("Show my tasks")}
                >
                  <Text style={styles.suggestionText}>📋 Show Tasks</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            const isNextSame = !isLast && messages[index + 1].isBot === message.isBot;
            // Show avatar only if it's the last message of a sequence from the same user
            const showAvatar = !isNextSame; 
            
            return (
              <MessageBubble 
                key={message.id || index} 
                message={message} 
                showAvatar={showAvatar}
              />
            );
          })}
          
          {(isLoading || isSending) && (
            <View style={styles.typingContainer}>
               <View style={styles.botAvatar}>
                 <Bot size={14} color={theme.colors.background} />
               </View>
               <View style={styles.typingBubble}>
                 <ActivityIndicator size="small" color={theme.colors.textSecondary} />
               </View>
            </View>
          )}
        </ScrollView>
      </View>
      
      <View style={[
        styles.inputContainer,
        {
          paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 16),
          position: keyboardHeight > 0 ? 'absolute' : 'relative',
          bottom: keyboardHeight > 0 ? keyboardHeight : 0,
          left: 0,
          right: 0,
        }
      ]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (inputText.trim()) {
                handleSend();
              }
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled
            ]}
          >
            {isSending ? (
                <ActivityIndicator size="small" color="#000000" />
            ) : (
                <Send size={20} color="#000000" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'none', // Hide old styles
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    display: 'none', // Hide old styles
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary, // Changed color
    fontWeight: '500',
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chatContainer: {
    flex: 1,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  errorBannerText: {
    color: 'rgba(255, 59, 48, 0.95)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  // Removed old avatarContainer
  hiddenAvatar: {
    opacity: 0,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  botBubble: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  botText: {
    color: theme.colors.text,
  },
  userText: {
    color: theme.colors.background,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  botTimestamp: {
    color: theme.colors.textSecondary,
  },
  userTimestamp: {
    color: 'rgba(0,0,0,0.6)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  emptyIconGlow: {
    position: 'absolute',
    top: -10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    opacity: 0.15,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#000000',
    paddingTop: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
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
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTextContainer: {
    justifyContent: 'center',
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
    backgroundColor: theme.colors.success,
    marginRight: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#FFD600',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginLeft: 0,
  },
});

export default ChatScreen;
