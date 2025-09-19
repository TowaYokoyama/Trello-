import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { AxiosError } from 'axios';

// --- 型定義 ---

// ユーザー情報の型
interface User {
  id: number;
  email: string;
}

// Contextが提供するデータの型
interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
}

// ProviderのPropsの型
interface AuthProviderProps {
  children: ReactNode;
}

// --- Contextの作成 ---

// デフォルト値は空。実際の値はProviderから提供される。
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// --- Providerコンポーネント ---

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // アプリ起動時にトークンを読み込む
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          // TODO: トークンを使ってユーザー情報を取得するAPIを呼び出す
          // apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          // const { data } = await apiClient.get('/api/users/me'); 
          // setUser(data);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await apiClient.post('/api/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      setToken(access_token);
      await AsyncStorage.setItem('token', access_token);
      
      // TODO: ログイン成功後、ユーザー情報を取得してsetUserする

    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Login failed', axiosError.response?.data);
      throw new Error('Login failed');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await apiClient.post('/api/auth/register', { email, password });
      // 登録後、そのままログイン処理を呼ぶ
      await login(email, password);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Registration failed', axiosError.response?.data);
      throw new Error('Registration failed');
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- カスタムフック ---

// コンポーネントから簡単にContextの値を使えるようにするためのフック
export const useAuth = () => {
  return useContext(AuthContext);
};
