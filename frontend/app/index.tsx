import { useAuth } from '../src/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';

export default function StartPage() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    // 読み込み中はスピナーを表示
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (token) {
    // トークンがあれば、(app)グループのindex（タスク一覧）にリダイレクト
    return <Redirect href="/(app)" />;
  } else {
    // トークンがなければ、(auth)グループのloginにリダイレクト
    return <Redirect href="/(auth)/login" />;
  }
}
