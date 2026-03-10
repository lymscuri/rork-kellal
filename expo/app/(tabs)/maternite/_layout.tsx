import { Stack } from "expo-router";
import React from "react";
import { MedicalColors } from "@/constants/colors";

export default function MaterniteLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: MedicalColors.maternity,
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
          title: "Santé Maternelle",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="vaccinations"
        options={{
          title: "Vaccinations",
        }}
      />
      <Stack.Screen
        name="reminders"
        options={{
          title: "Rappels SMS/Voix",
        }}
      />
      <Stack.Screen
        name="reports"
        options={{
          title: "Rapports",
        }}
      />
      <Stack.Screen
        name="communication"
        options={{
          title: "Messages",
        }}
      />
      <Stack.Screen
        name="child-details"
        options={{
          title: "Détails enfant",
        }}
      />
    </Stack>
  );
}
