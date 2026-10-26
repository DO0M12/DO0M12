import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import '@/lib/notifications';
import { useStore } from '@/lib/store';
import { useHealthAutoSync, useReminderAutoSync } from '@/lib/sync';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    ArchivoNarrow_600SemiBold,
    ArchivoNarrow_700Bold,
  });
  const hydrated = useStore((s) => s.hydrated);
  const healthEnabled = useStore((s) => s.data.healthEnabled);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  useHealthAutoSync(ready && healthEnabled);
  useReminderAutoSync(ready);

  if (!ready) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
