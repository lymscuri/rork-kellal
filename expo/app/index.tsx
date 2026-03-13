import { Redirect } from "expo-router";
import React from "react";
import { useAuthStore } from "@/store/authStore";
import { View, ActivityIndicator } from "react-native";
import { MedicalColors } from "@/constants/colors";

export default function Index() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: MedicalColors.background }}>
        <ActivityIndicator size="large" color={MedicalColors.medical} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href="/(tabs)/urgence" />;
}
