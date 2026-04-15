import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { handleHardwareBack } from '@/src/lib/back-handler';

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack,
    );
    return () => sub.remove();
  }, []);

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
        </Stack>
        <StatusBar style="light" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
