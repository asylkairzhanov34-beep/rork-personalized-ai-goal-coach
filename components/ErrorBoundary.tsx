import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  children: React.ReactNode;
  name?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string | null;
};

export default class ErrorBoundary extends React.PureComponent<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): State {
    const message = (error as any)?.message ? String((error as any).message) : 'Unknown error';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error(`[ErrorBoundary:${this.props.name ?? 'App'}]`, error);
    console.error(`[ErrorBoundary:${this.props.name ?? 'App'}] info`, info);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }

  private onRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container} testID="error-boundary">
        <Text style={styles.title} testID="error-boundary-title">Something went wrong</Text>
        <Text style={styles.subtitle} testID="error-boundary-subtitle">
          {this.props.name ? `${this.props.name} crashed.` : 'This screen crashed.'}
        </Text>
        <Text style={styles.message} numberOfLines={4} testID="error-boundary-message">
          {this.state.errorMessage ?? 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.onRetry} activeOpacity={0.8} testID="error-boundary-retry">
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD600',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
