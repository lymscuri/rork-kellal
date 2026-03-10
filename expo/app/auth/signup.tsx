import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Text, TextInput, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react-native';

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignup = useCallback(async () => {
    clearError();
    setLocalError(null);
    
    // Validation
    if (!firstName.trim()) {
      setLocalError('Veuillez entrer votre prénom');
      return;
    }
    
    if (!lastName.trim()) {
      setLocalError('Veuillez entrer votre nom');
      return;
    }
    
    if (!email.trim()) {
      setLocalError('Veuillez entrer votre email');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError('Veuillez entrer un email valide');
      return;
    }
    
    if (!password.trim()) {
      setLocalError('Veuillez entrer un mot de passe');
      return;
    }
    
    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas');
      return;
    }
    
    console.log('[Signup] Attempting signup...');
    const success = await signup({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
    });
    
    console.log('[Signup] Result:', success);
    if (success) {
      setTimeout(() => {
        router.replace('/');
      }, 100);
    }
  }, [firstName, lastName, email, phone, password, confirmPassword, signup, clearError, router]);

  const navigateToLogin = useCallback(() => {
    clearError();
    router.back();
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
              <UserPlus size={40} color={MedicalColors.medical} />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez SanteConnect</Text>
          </View>

          {/* Form */}
          <Surface style={styles.formContainer} elevation={2}>
            {(error || localError) && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || localError}</Text>
              </View>
            )}

            <View style={styles.row}>
              <TextInput
                label="Prénom"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                left={<TextInput.Icon icon={() => <User size={20} color={MedicalColors.textSecondary} />} />}
                outlineColor={MedicalColors.border}
                activeOutlineColor={MedicalColors.medical}
                disabled={isLoading}
              />
              
              <TextInput
                label="Nom"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                outlineColor={MedicalColors.border}
                activeOutlineColor={MedicalColors.medical}
                disabled={isLoading}
              />
            </View>

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
              label="Téléphone (optionnel)"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon={() => <Phone size={20} color={MedicalColors.textSecondary} />} />}
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

            <TextInput
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              left={<TextInput.Icon icon={() => <Lock size={20} color={MedicalColors.textSecondary} />} />}
              right={
                <TextInput.Icon 
                  icon={() => showConfirmPassword ? <EyeOff size={20} color={MedicalColors.textSecondary} /> : <Eye size={20} color={MedicalColors.textSecondary} />} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              outlineColor={MedicalColors.border}
              activeOutlineColor={MedicalColors.medical}
              disabled={isLoading}
            />

            <Button
              mode="contained"
              onPress={handleSignup}
              style={styles.signupButton}
              contentStyle={styles.signupButtonContent}
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Création...' : 'Créer mon compte'}
            </Button>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Déjà un compte ?</Text>
              <Button 
                mode="text" 
                onPress={navigateToLogin}
                textColor={MedicalColors.medical}
                disabled={isLoading}
              >
                Se connecter
              </Button>
            </View>
          </Surface>
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
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MedicalColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: MedicalColors.medical,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: MedicalColors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: MedicalColors.textSecondary,
  },
  formContainer: {
    backgroundColor: MedicalColors.white,
    borderRadius: 16,
    padding: 24,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    marginBottom: 16,
    backgroundColor: MedicalColors.white,
  },
  halfInput: {
    flex: 1,
  },
  signupButton: {
    marginTop: 8,
    backgroundColor: MedicalColors.medical,
    borderRadius: 8,
  },
  signupButtonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: MedicalColors.textSecondary,
    fontSize: 14,
  },
});
