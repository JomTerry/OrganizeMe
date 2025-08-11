import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your own Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4',
  authDomain: 'jomterryy417-c0c.firebaseapp.com',
  projectId: 'jomterryy417-c0c',
  storageBucket: 'jomterryy417-c0c.appspot.com',
  messagingSenderId: '993273611189',
  appId: '1:993273611189:web:baba2cdc4ff30682904ffc',
};

const app = initializeApp(firebaseConfig);

// Use React Native AsyncStorage for persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export default app;