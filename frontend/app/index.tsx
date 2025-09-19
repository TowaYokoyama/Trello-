import { useAuth } from '../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useEffect } from 'react';

export default function StartPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ローディングが完了したら
    if (!isLoading) {
      if (token) {
        // トークンがあればタスク一覧へ
        router.replace('/(app)');
      } else {
        // トークンがなければログイン画面へ
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, token, router]); // isLoadingとtokenの変化を監視

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ローディングが完了し、useEffectでリダイレクトされるため、このコンポーネントは何も表示しない
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
