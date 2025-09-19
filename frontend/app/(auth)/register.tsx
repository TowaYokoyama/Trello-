import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import tw from 'twrnc';
import { Link } from 'expo-router';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useAuth();

  const handleRegister = async () => {
    try {
      await register(email, password);
      // 登録成功後、自動的にログインされ、ナビゲーションは後ほど自動処理
    } catch (error) {
      Alert.alert('Registration Failed', 'Please try again.');
    }
  };

  return (
    <View style={tw`flex-1 justify-center items-center bg-gray-100 p-4`}>
      <Text style={tw`text-3xl font-bold mb-6 text-gray-800`}>Register</Text>
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
        style={tw`w-full bg-green-500 rounded-lg py-3`}
        onPress={handleRegister}
      >
        <Text style={tw`text-white text-center font-bold text-lg`}>Register</Text>
      </TouchableOpacity>
      <Link href="/login" asChild>
        <TouchableOpacity style={tw`mt-4`}>
          <Text style={tw`text-blue-500`}>Already have an account? Login</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
