import React from 'react';
import ChatScreen from '@/screens/ChatScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Chat() {
  return (
    <ErrorBoundary name="Chat">
      <ChatScreen />
    </ErrorBoundary>
  );
}