import { Stack } from "expo-router";
import React from "react";
import { MedicalColors } from "@/constants/colors";

export default function DossierLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: MedicalColors.medical },
        headerTintColor: MedicalColors.white,
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Mon Dossier", headerShown: false }} />
      <Stack.Screen name="patient-record" options={{ title: "Dossier Patient" }} />
      <Stack.Screen name="new-consultation" options={{ title: "Nouvelle Consultation" }} />
      <Stack.Screen name="add-patient" options={{ title: "Nouveau Patient" }} />
      <Stack.Screen name="my-qrcode" options={{ title: "Mon QR Code" }} />
      <Stack.Screen name="prescriptions" options={{ title: "Mes Ordonnances" }} />
      <Stack.Screen name="scanner" options={{ title: "Scanner QR", presentation: "modal" }} />
      <Stack.Screen name="doctor-reports" options={{ title: "Rapports" }} />
      <Stack.Screen name="new-lab-result" options={{ title: "Nouveau Résultat" }} />
      <Stack.Screen name="new-vaccine" options={{ title: "Nouveau Vaccin" }} />
    </Stack>
  );
}
