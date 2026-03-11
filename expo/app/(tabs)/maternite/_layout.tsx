import { Stack } from "expo-router";
import React from "react";
import { MedicalColors } from "@/constants/colors";

export default function MaterniteLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: MedicalColors.maternity },
        headerTintColor: MedicalColors.white,
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Santé Maternelle", headerShown: false }} />
      <Stack.Screen name="weekly-checkup" options={{ title: "Suivi hebdomadaire" }} />
      <Stack.Screen name="prenatal-calendar" options={{ title: "Calendrier prénatal" }} />
      <Stack.Screen name="child-tracking" options={{ title: "Suivi pédiatrique" }} />
      <Stack.Screen name="patient-dossier" options={{ title: "Dossier prénatal" }} />
      <Stack.Screen name="soignant-dashboard" options={{ title: "Tableau de bord" }} />
      <Stack.Screen name="sms-system" options={{ title: "SMS Rappels" }} />
      <Stack.Screen name="add-maternity-patient" options={{ title: "Nouvelle patiente" }} />
    </Stack>
  );
}
