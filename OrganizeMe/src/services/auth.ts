import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './database';
import { User } from '../types';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const CURRENT_USER_KEY = 'current_user';
const FIREBASE_PASSWORD_SENTINEL = 'firebase_auth';

class AuthService {
  async login(email: string, password: string): Promise<User | null> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = credential.user;

      // Find existing local user or create a minimal one if missing
      let localUser = await DatabaseService.getUserByEmail(email);
      if (!localUser) {
        const defaultName = fbUser.displayName || email.split('@')[0];
        const defaultBirthday = '1970-01-01';
        const defaultPhone = fbUser.phoneNumber || '';
        const userId = await DatabaseService.createUser({
          name: defaultName,
          email,
          password: FIREBASE_PASSWORD_SENTINEL,
          birthday: defaultBirthday,
          phone_number: defaultPhone,
        });
        localUser = await DatabaseService.getUserById(userId);
      }

      if (localUser) {
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(localUser));
        return localUser;
      }

      return null;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData: Omit<User, 'user_id'>): Promise<User | null> {
    try {
      // Create Firebase user
      await createUserWithEmailAndPassword(auth, userData.email, userData.password);

      // Ensure a local profile exists for tasks linkage
      const existingUser = await DatabaseService.getUserByEmail(userData.email);
      if (existingUser) {
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingUser));
        return existingUser;
      }

      const userId = await DatabaseService.createUser({
        ...userData,
        // Do not store real password locally; mark as Firebase-managed
        password: FIREBASE_PASSWORD_SENTINEL,
      });
      const newUser = await DatabaseService.getUserById(userId);

      if (newUser) {
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
        return newUser;
      }

      return null;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' };
    }
    return { isValid: true, message: '' };
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^[\+]?[^\D][\d]{0,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }
}

export default new AuthService();