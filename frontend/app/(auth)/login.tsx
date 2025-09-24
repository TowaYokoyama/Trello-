import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, useWindowDimensions } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.contentContainer, isWeb && styles.contentContainerWeb]}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <Link href="/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Don&apos;t have an account? Register</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  contentContainer: {
    width: '100%',
  },
  contentContainerWeb: {
    maxWidth: 400,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1f2937',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  link: {
    marginTop: 16,
  },
  linkText: {
    color: '#3b82f6',
  },
});
