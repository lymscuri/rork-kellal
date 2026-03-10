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
    </Stack>
  );
}
