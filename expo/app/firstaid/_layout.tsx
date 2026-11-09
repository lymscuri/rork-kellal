import { Stack } from 'expo-router';
import React from 'react';
import { MedicalColors } from '@/constants/colors';

// Groupe PUBLIC : accessible sans connexion (autorisé dans AuthGuard).
export default function FirstAidLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: MedicalColors.urgency },
        headerTintColor: MedicalColors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Retour',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Premiers secours' }} />
      <Stack.Screen name="[id]" options={{ title: 'Protocole' }} />
    </Stack>
  );
}
