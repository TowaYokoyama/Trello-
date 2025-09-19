import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import tw from 'twrnc';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login(email, password);
      // ログイン成功時のナビゲーションは後ほどルートのindex.tsxで自動的に処理
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your credentials.');
    }
  };

  return (
    <View style={tw`flex-1 justify-center items-center bg-gray-100 p-4`}>
      <Text style={tw`text-3xl font-bold mb-6 text-gray-800`}>Login</Text>
      <TextInput
        style={tw`w-full bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4`}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={tw`w-full bg-white border border-gray-300 rounded-lg px-4 py-3 mb-6`}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={tw`w-full bg-blue-500 rounded-lg py-3`}
        onPress={handleLogin}
      >
        <Text style={tw`text-white text-center font-bold text-lg`}>Login</Text>
      </TouchableOpacity>
      <Link href="/register" asChild>
        <TouchableOpacity style={tw`mt-4`}>
          <Text style={tw`text-blue-500`}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
