import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 開発用PCのIPアドレスを設定
// このIPアドレスは、バックエンドサーバーが動作しているPCのローカルIPアドレスに置き換えてください。
// Windowsでは `ipconfig`、macOSでは `ifconfig` コマンドで確認できます。
const DEV_SERVER_IP = '192.168.0.11';

// プラットフォームに応じてbaseURLを決定
const baseURL = Platform.OS === 'web'
  ? 'http://localhost:8088' // Webの場合はlocalhost
  : `http://${DEV_SERVER_IP}:8088`; // ネイティブの場合はIPアドレス

// バックエンドサーバーのベースURL
const apiClient = axios.create({
  baseURL: baseURL,
});

// リクエストインターセプターの設定
apiClient.interceptors.request.use(
  async (config) => {
    console.log('API Client: Attempting to get token from AsyncStorage');
    const token = await AsyncStorage.getItem('token');
    console.log('API Client: Token from AsyncStorage:', token ? '[TOKEN_EXISTS]' : '[NO_TOKEN]');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Client: Setting Authorization header:', config.headers.Authorization ? '[HEADER_SET]' : '[HEADER_NOT_SET]');
    } else {
      console.log('API Client: No token found, Authorization header not set.');
    }
    return config;
  },
  (error) => {
    // リクエストエラーのハンドリング
    return Promise.reject(error);
  }
);

export default apiClient;