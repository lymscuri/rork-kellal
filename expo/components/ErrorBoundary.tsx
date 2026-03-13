import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MedicalColors } from '@/constants/colors';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.title}>Oups, une erreur est survenue</Text>
            <Text style={styles.message}>
              {this.props.fallbackMessage || "L'application a rencontré un problème. Veuillez réessayer."}
            </Text>
            <ScrollView style={styles.errorScroll} horizontal={false}>
              <Text style={styles.errorDetail}>
                {this.state.error?.message || 'Erreur inconnue'}
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.7}>
              <Text style={styles.buttonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MedicalColors.background,
    padding: 24,
  },
  card: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: MedicalColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorScroll: {
    maxHeight: 80,
    width: '100%',
    backgroundColor: MedicalColors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  errorDetail: {
    fontSize: 12,
    color: MedicalColors.urgency,
    fontFamily: undefined,
  },
  button: {
    backgroundColor: MedicalColors.medical,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: MedicalColors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
