import { Stack } from "expo-router";
import React from "react";
import { MedicalColors } from "@/constants/colors";

export default function DossierLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: MedicalColors.white,
        },
        headerTintColor: MedicalColors.medical,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Mon Dossier",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="consultations"
        options={{
          title: "Consultations",
        }}
      />
      <Stack.Screen
        name="add-record"
        options={{
          title: "Nouveau",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="lab-results"
        options={{
          title: "Analyses",
        }}
      />
      <Stack.Screen
        name="share"
        options={{
          title: "Partager",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="profile-edit"
        options={{
          title: "Mon Profil",
        }}
      />
    </Stack>
  );
}
