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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Bot, MoreHorizontal, Sparkles, User } from 'lucide-react-native';
import { useChat } from '@/hooks/use-chat-store';
import { ChatMessage } from '@/types/chat';
import { theme } from '@/constants/theme';

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
  }, []);

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
  const [inputText, setInputText] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (inputText.trim()) {
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerContainer} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Sparkles size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Coach</Text>
              <Text style={styles.headerSubtitle}>Всегда на связи</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={clearChat} 
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreHorizontal size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoiding} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
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
              <View style={styles.emptyIcon}>
                <Bot size={40} color={theme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Привет! Я Rork AI.</Text>
              <Text style={styles.emptyText}>
                Я помогу организовать твои дела, дам совет и поддержу мотивацию. Просто напиши мне!
              </Text>
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

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Написать сообщение..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={1000}
              returnKeyType="default"
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
    </View>
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
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
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
  avatarContainer: {
    width: 28,
    height: 28,
    marginRight: 8,
    marginLeft: 0,
  },
  hiddenAvatar: {
    opacity: 0,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
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
    color: theme.colors.background, // Black text on yellow
    fontWeight: '500',
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
    color: 'rgba(0,0,0,0.5)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
