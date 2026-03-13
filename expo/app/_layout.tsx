import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { View, ActivityIndicator, LogBox } from "react-native";
import { theme } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { MedicalColors } from "@/constants/colors";
import { AppErrorBoundary } from "@/components/ErrorBoundary";

LogBox.ignoreLogs(['Require cycle']);

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      console.log('[AuthGuard] Starting hydration...');
      hydrate().catch((e) => {
        console.error('[AuthGuard] Hydration failed:', e);
      });
    }
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
          router.replace("/auth/login");
        } else if (isAuthenticated && (inAuthGroup || isIndex)) {
          console.log('[AuthGuard] Redirecting to tabs');
          router.replace("/(tabs)/urgence");
        }
      } catch (e) {
        console.error('[AuthGuard] Navigation error:', e);
      }
    }, 150);

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
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch((e) => {
        console.warn('[Layout] SplashScreen hide error:', e);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppErrorBoundary fallbackMessage="Une erreur est survenue dans l'application. Veuillez redémarrer.">
              <AuthGuard>
                <RootLayoutNav />
              </AuthGuard>
            </AppErrorBoundary>
          </GestureHandlerRootView>
        </PaperProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
