import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function AppLayout() {
  const { token, isLoading, logout } = useAuth();
  const router = useRouter();

  // このuseEffectは、app/index.tsxにリダイレクトロジックを移管したため不要になります。
  // useEffect(() => {
  //   if (!isLoading && !token) {
  //     router.replace('/login');
  //   }
  // }, [isLoading, token, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
  },
  logoutButtonText: {
    color: '#3b82f6',
    fontSize: 16,
  },
});
