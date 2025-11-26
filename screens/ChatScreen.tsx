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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, Bot, MoreHorizontal, Sparkles } from 'lucide-react-native';
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
  const { messages, sendMessage, clearChat, isLoading } = useChat();
  const params = useLocalSearchParams<{ initialMessage?: string }>();
  const router = useRouter();
  const [inputText, setInputText] = useState<string>(params.initialMessage || '');
  const scrollViewRef = useRef<ScrollView>(null);

  const [isSending, setIsSending] = useState(false);
  const { getFeatureAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const featureAccess = getFeatureAccess();

  const handleSend = async () => {
    if (inputText.trim()) {
      // Check if AI chat is available
      if (!featureAccess.aiChatAssistant) {
        setShowPaywall(true);
        return;
      }
      
      const text = inputText.trim();
      setInputText('');
      setIsSending(true);
      try {
        await sendMessage(text);
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

  // Show paywall if feature not available
  if (!featureAccess.aiChatAssistant) {
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
                  <Text style={styles.headerSubtitle}>Premium функция</Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
        <PaywallModal
          visible
          variant="feature"
          featureName="ИИ-чат GoalForge"
          onPrimaryAction={() => router.push('/subscription')}
          onSecondaryAction={() => router.back()}
          onRequestClose={() => router.back()}
          primaryLabel="Оформить Premium"
          secondaryLabel="Вернуться"
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
        featureName="ИИ-чат GoalForge"
        onPrimaryAction={() => {
          setShowPaywall(false);
          router.push('/subscription');
        }}
        onSecondaryAction={() => setShowPaywall(false)}
        onRequestClose={() => setShowPaywall(false)}
        primaryLabel="Оформить Premium"
        secondaryLabel="Не сейчас"
      />
      <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
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
                <Text style={styles.headerSubtitle}>Онлайн</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            onPress={clearChat} 
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreHorizontal size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.chatContainer}>
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
                <Bot size={48} color={theme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Привет! Я GoalForge</Text>
              <Text style={styles.emptyText}>
                Я помогу проанализировать твой прогресс и дам советы.{"\n"}
                Спроси меня о продуктивности или анализе твоих целей.
              </Text>
              
              <View style={styles.suggestionsContainer}>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInputText("Дай советы по продуктивности")}
                >
                  <Text style={styles.suggestionText}>📝 Советы по продуктивности</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInputText("Проанализируй мой прогресс")}
                >
                  <Text style={styles.suggestionText}>📊 Проанализируй прогресс</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInputText("Дай совет по продуктивности")}
                >
                  <Text style={styles.suggestionText}>💡 Дай совет</Text>
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
      
      <View style={[styles.inputContainer, { paddingBottom: 8 }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Написать сообщение..."
            placeholderTextColor={theme.colors.textSecondary}
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
                <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
                <Send size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
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
    marginTop: 40,
    paddingHorizontal: 24,
  },
  emptyIconGlow: {
    position: 'absolute',
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
    transform: [{ scale: 1.5 }],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
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
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    marginRight: 2,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface,
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
