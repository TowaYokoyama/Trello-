import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router'; // useRouterをインポート

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
  const router = useRouter(); // useRouterフックを使用

  // アプリ起動時にトークンを読み込む
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          // トークンがあれば、ユーザー情報を取得してsetUserする
          const { data } = await apiClient.get<User>('/api/users/me'); 
          setUser(data);
        }
      } catch (e) {
        console.error('Failed to load token or user data', e);
        // エラー時はトークンをクリアしてログアウト状態にする
        await AsyncStorage.removeItem('token');
        setToken(null);
        setUser(null);
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
      console.log('Login successful, token received:', access_token);

      setToken(access_token);
      await AsyncStorage.setItem('token', access_token);
      console.log('Token saved to AsyncStorage');
      // ここでaxiosのデフォルトヘッダーにトークンを設定
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // ログイン成功後、ユーザー情報を取得してsetUserする
      const { data: userData } = await apiClient.get<User>('/api/users/me'); 
      setUser(userData);

      // ログイン成功後、タスク一覧画面へ遷移
      router.replace('/(app)');

    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      console.error('Login failed', axiosError.response?.data);
      throw new Error(axiosError.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await apiClient.post('/api/auth/register', { email, password });
      // 登録後、そのままログイン処理を呼ぶ
      await login(email, password);
      // 登録成功後、タスク一覧画面へ遷移
      router.replace('/(app)');

    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string }>;
      console.error('Registration failed', axiosError.response?.data);
      throw new Error(axiosError.response?.data?.detail || 'Registration failed. Please try again.');
    }
  };

  const logout = async () => {
    console.log('Logout function called');
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('token');
    console.log('Token removed from AsyncStorage');
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
