import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// バックエンドサーバーのベースURL
const apiClient = axios.create({
  baseURL: 'http://localhost:8088',
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
