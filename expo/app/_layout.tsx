import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { View, ActivityIndicator } from "react-native";
import { theme } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { MedicalColors } from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();
  const hasNavigated = React.useRef(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) {
      console.log('[AuthGuard] Waiting for hydration...');
      return;
    }

    const inAuthGroup = segments[0] === "auth";
    const isIndex = !segments[0];
    console.log('[AuthGuard] isAuthenticated:', isAuthenticated, 'inAuthGroup:', inAuthGroup, 'segments:', segments);

    const timer = setTimeout(() => {
      try {
        if (!isAuthenticated && !inAuthGroup) {
          console.log('[AuthGuard] Redirecting to login');
          hasNavigated.current = true;
          router.replace("/auth/login");
        } else if (isAuthenticated && (inAuthGroup || isIndex)) {
          console.log('[AuthGuard] Redirecting to tabs');
          hasNavigated.current = true;
          router.replace("/(tabs)/urgence");
        }
      } catch (e) {
        console.error('[AuthGuard] Navigation error:', e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, segments, isHydrated, router]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: MedicalColors.background }}>
        <ActivityIndicator size="large" color={MedicalColors.medical} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Retour" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthGuard>
              <RootLayoutNav />
            </AuthGuard>
          </GestureHandlerRootView>
        </PaperProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
