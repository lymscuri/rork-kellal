import { Tabs } from "expo-router";
import { AlertCircle, Baby, FileText, User } from "lucide-react-native";
import React from "react";
import { MedicalColors } from "@/constants/colors";
import { useSyncEngine } from "@/store/syncEngine";

export default function TabLayout() {
  // SyncEngine définitif : synchronisation médecin↔patient
  // S'active automatiquement pour tous les écrans (tabs)
  const { isSyncing } = useSyncEngine();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: MedicalColors.urgency,
        tabBarInactiveTintColor: MedicalColors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: MedicalColors.white,
          borderTopColor: MedicalColors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="urgence"
        options={{
          title: "Urgence",
          tabBarIcon: ({ color, size }) => (
            <AlertCircle color={color} size={size} />
          ),
          tabBarActiveTintColor: MedicalColors.urgency,
        }}
      />
      <Tabs.Screen
        name="maternite"
        options={{
          title: "Maternité",
          tabBarIcon: ({ color, size }) => (
            <Baby color={color} size={size} />
          ),
          tabBarActiveTintColor: MedicalColors.maternity,
        }}
      />
      <Tabs.Screen
        name="dossier"
        options={{
          title: "Mon Dossier",
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
          tabBarActiveTintColor: MedicalColors.medical,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
          tabBarActiveTintColor: MedicalColors.medical,
        }}
      />
    </Tabs>
  );
}
