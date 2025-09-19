import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { TouchableOpacity, Text } from 'react-native';
import tw from 'twrnc';

export default function AppLayout() {
  const { token, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 読み込みが完了し、かつトークンがない場合
    if (!isLoading && !token) {
      // ログイン画面にリダイレクト
      router.replace('/login');
    }
  }, [isLoading, token, router]);

  // 認証状態を確認中は何も表示しない
  if (isLoading) {
    return null; // またはスピナーなどのローディング表示
  }

  // 認証済みの場合、子画面を表示
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'My Tasks',
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={tw`mr-4`}>
              <Text style={tw`text-blue-500`}>Logout</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
