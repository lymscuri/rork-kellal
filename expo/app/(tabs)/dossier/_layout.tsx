import { Stack } from "expo-router";
import React from "react";
import { MedicalColors } from "@/constants/colors";

export default function DossierLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: MedicalColors.medical,
        },
        headerTintColor: MedicalColors.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Mon Dossier Médical",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
