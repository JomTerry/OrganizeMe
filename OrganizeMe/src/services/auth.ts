import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './database';
import { User } from '../types';

const CURRENT_USER_KEY = 'current_user';

class AuthService {
  async login(email: string, password: string): Promise<User | null> {
    try {
      const user = await DatabaseService.getUserByEmail(email);
      
      if (user && user.password === password) {
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  async register(userData: Omit<User, 'user_id'>): Promise<User | null> {
    try {
      // Check if user already exists
      const existingUser = await DatabaseService.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const userId = await DatabaseService.createUser(userData);
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
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      console.error('Logout error:', error);
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
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }
}

export default new AuthService();