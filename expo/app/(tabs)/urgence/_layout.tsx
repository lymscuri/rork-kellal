import { Stack } from "expo-router";
import React from "react";
import { MedicalColors } from "@/constants/colors";

export default function UrgenceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: MedicalColors.urgency,
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
          title: "Urgence",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: "Assistant IA",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="map"
        options={{
          title: "Carte des secours",
        }}
      />
    </Stack>
  );
}
