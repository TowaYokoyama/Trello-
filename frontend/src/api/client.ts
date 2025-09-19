import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// バックエンドサーバーのベースURL
const apiClient = axios.create({
  baseURL: 'http://localhost:8088',
});

// リクエストインターセプターの設定
apiClient.interceptors.request.use(
  async (config) => {
    // AsyncStorageからトークンを非同期で取得
    const token = await AsyncStorage.getItem('token');
    if (token) {
      // トークンがあれば、Authorizationヘッダーにセット
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // リクエストエラーのハンドリング
    return Promise.reject(error);
  }
);

export default apiClient;
