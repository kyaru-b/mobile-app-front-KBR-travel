import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router, SplashScreen, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/hooks';
import { OfflineBanner, Toast } from '@/components';
import { useAuth } from '@/store/auth';
import { color } from '@/theme';

void SplashScreen.preventAutoHideAsync();

// TanStack Query ставит запросы на паузу без сети и отдаёт данные из кэша.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

/**
 * Неавторизованного пользователя отправляем на вход: у группы (auth) нет экрана для «/»,
 * а защищённые вкладки при выходе из аккаунта пропадают из стека.
 */
function AuthRedirect({ signedIn }: { signedIn: boolean }) {
  const segments = useSegments();
  const inAuth = segments[0] === '(auth)';

  useEffect(() => {
    if (!signedIn && !inAuth) router.replace('/phone');
  }, [signedIn, inAuth]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const status = useAuth((s) => s.status);

  useEffect(() => {
    void useAuth.getState().hydrate();
  }, []);

  useEffect(() => {
    // Выход из аккаунта — чистим кэш, чтобы следующий пользователь не увидел чужие данные.
    if (status === 'signedOut') queryClient.clear();
  }, [status]);

  const ready = (fontsLoaded || fontError !== null) && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = status === 'signedIn';

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="trip/[id]" />
            <Stack.Screen name="trip/create" options={{ gestureEnabled: false }} />
            <Stack.Screen name="chat/[tripId]" />
            <Stack.Screen name="booking/[id]" />
            <Stack.Screen name="participants/[tripId]" />
            <Stack.Screen name="scan" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="notifications" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
        <AuthRedirect signedIn={signedIn} />
        <OfflineBanner />
        <Toast />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
