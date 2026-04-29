import { useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, Text, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { handleHardwareBack } from '@/src/lib/back-handler';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const pathname = usePathname();
  const isWebSandbox = Platform.OS === 'web' && pathname === '/sandboxtexttesting';

  const handleRetry = async () => {
    if (isWebSandbox) {
      setDbError(null);
      setDbReady(true);
      return;
    }

    try {
      setDbError(null);
      await import('@/src/composition');
      const { initDatabase } = await import('@/src/db/client');
      initDatabase();
      setDbReady(true);
    } catch (e) {
      console.error('DB init failed:', e);
      setDbError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    setDbReady(false);
    void handleRetry();
  }, [isWebSandbox]);

  useEffect(() => {
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack,
    );
    return () => sub.remove();
  }, []);

  if (dbError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#0f1117', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#f2f4f8', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            CodeLens could not open its local database.
          </Text>
          <Text style={{ color: '#a8b0c0', fontSize: 14, marginBottom: 24 }}>
            {dbError}
          </Text>
          <Pressable
            onPress={handleRetry}
            style={{
              minHeight: 44,
              backgroundColor: '#1f2331',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: '#f2f4f8', fontSize: 16, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  if (!dbReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#0f1117', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#a8b0c0', fontSize: 14 }}>Opening CodeLens...</Text>
        </View>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f1117' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="general-chat/[id]" />
          <Stack.Screen name="learning/index" />
          <Stack.Screen name="learning/chat/[id]" />
          <Stack.Screen name="recent-chats" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="dev" />
          <Stack.Screen name="sandboxtexttesting" />
        </Stack>
        <StatusBar style="light" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
