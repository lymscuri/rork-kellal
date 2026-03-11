import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Text, TextInput, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    clearError();
    setLocalError(null);
    
    if (!email.trim()) {
      setLocalError('Veuillez entrer votre email');
      return;
    }
    
    if (!password.trim()) {
      setLocalError('Veuillez entrer votre mot de passe');
      return;
    }
    
    console.log('[Login] Attempting login...');
    const success = await login(email.trim(), password);
    console.log('[Login] Result:', success);
    if (success) {
      setTimeout(() => {
        router.replace('/');
      }, 100);
    }
  }, [email, password, login, clearError, router]);

  const navigateToSignup = useCallback(() => {
    clearError();
    router.push('/auth/signup');
  }, [router, clearError]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Heart size={48} color={MedicalColors.urgency} fill={MedicalColors.urgency} />
            </View>
            <Text style={styles.title}>Keneya</Text>
            <Text style={styles.subtitle}>Votre assistant de santé personnel</Text>
          </View>

          {/* Form */}
          <Surface style={styles.formContainer} elevation={2}>
            <Text style={styles.formTitle}>Connexion</Text>
            
            {(error || localError) && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || localError}</Text>
              </View>
            )}

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon={() => <Mail size={20} color={MedicalColors.textSecondary} />} />}
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
              disabled={isLoading}
            />

            <TextInput
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon={() => <Lock size={20} color={MedicalColors.textSecondary} />} />}
              right={
                <TextInput.Icon 
                  icon={() => showPassword ? <EyeOff size={20} color={MedicalColors.textSecondary} /> : <Eye size={20} color={MedicalColors.textSecondary} />} 
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
              disabled={isLoading}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Pas encore de compte ?</Text>
              <Button 
                mode="text" 
                onPress={navigateToSignup}
                textColor={MedicalColors.medical}
                disabled={isLoading}
              >
                Créer un compte
              </Button>
            </View>
          </Surface>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Vos données médicales sont stockées localement et sécurisées
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MedicalColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: MedicalColors.urgency,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: MedicalColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: MedicalColors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: MedicalColors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: MedicalColors.urgencyLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: MedicalColors.urgency,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: MedicalColors.white,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: MedicalColors.medical,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  signupText: {
    color: MedicalColors.textSecondary,
    fontSize: 14,
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
