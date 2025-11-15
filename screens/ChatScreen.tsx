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
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Bot, MoreHorizontal } from 'lucide-react-native';
import { useChat } from '@/hooks/use-chat-store';
import { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
      <View style={[
        styles.messageBubble,
        message.isBot ? styles.botBubble : styles.userBubble
      ]}>
        {message.isBot && (
          <View style={styles.botAvatar}>
            <Bot size={14} color="#000000" />
          </View>
        )}
        <View style={[
          styles.messageContent,
          message.isBot ? styles.botMessageContent : styles.userMessageContent
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
            {message.timestamp.toLocaleTimeString('ru-RU', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const ChatScreen: React.FC = () => {
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const [inputText, setInputText] = useState<string>('');
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const handleSend = async () => {
    if (inputText.trim()) {
      const messageText = inputText.trim();
      setInputText('');
      await sendMessage(messageText);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerBotIcon}>
              <Bot size={20} color="#FFD600" />
            </View>
            <Text style={styles.headerTitle}>Помощник</Text>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <MoreHorizontal size={20} color="#FFD600" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={[
            styles.messagesContainer,
            { marginBottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0 }
          ]}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIcon}>
                  <Bot size={24} color="#000000" />
                </View>
                <Text style={styles.welcomeTitle}>Добро пожаловать! ✨</Text>
                <Text style={styles.welcomeText}>
                  Я ваш персональный помощник по достижению целей. Расскажите мне о своих планах, и я помогу вам их реализовать!
                </Text>
              </View>
            </View>
          )}
          
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.botAvatar}>
                <Bot size={14} color="#000000" />
              </View>
              <View style={styles.loadingBubble}>
                <Text style={styles.loadingText}>Печатает...</Text>
              </View>
            </View>
          )}
        </ScrollView>

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
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Напишите сообщение..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendButton,
                { opacity: inputText.trim() ? 1 : 0.5 }
              ]}
              disabled={!inputText.trim() || isLoading}
            >
              <Send size={20} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBotIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  welcomeCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD600',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageContent: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
  },
  botMessageContent: {
    backgroundColor: '#1C1C1E',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  userMessageContent: {
    backgroundColor: '#FFD600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  botText: {
    color: '#FFFFFF',
  },
  userText: {
    color: '#000000',
    fontWeight: '600' as const,
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  botTimestamp: {
    color: 'rgba(255,255,255,0.6)',
  },
  userTimestamp: {
    color: 'rgba(0,0,0,0.6)',
  },
  loadingContainer: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  loadingBubble: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontStyle: 'italic' as const,
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
  textInput: {
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
});

export default ChatScreen;