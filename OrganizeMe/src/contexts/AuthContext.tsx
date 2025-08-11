import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import AuthService from '../services/auth';
import DatabaseService from '../services/database';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize local database (used for tasks and user profile)
      await DatabaseService.initDatabase();

      // Subscribe to Firebase auth state
      onAuthStateChanged(auth, async (fbUser) => {
        try {
          if (!fbUser) {
            setUser(null);
            setIsLoading(false);
            return;
          }

          // Map Firebase user to local user row by email
          const email = fbUser.email || '';
          let localUser = await DatabaseService.getUserByEmail(email);

          if (!localUser) {
            // Create a minimal local user to own tasks
            const userId = await DatabaseService.createUser({
              name: fbUser.displayName || email.split('@')[0] || 'User',
              email,
              password: 'firebase_auth',
              birthday: '1970-01-01',
              phone_number: fbUser.phoneNumber || '',
            });
            localUser = await DatabaseService.getUserById(userId);
          }

          setUser(localUser || null);
        } catch (innerErr) {
          console.error('Auth state mapping error:', innerErr);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await AuthService.login(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (userData: Omit<User, 'user_id'>): Promise<boolean> => {
    try {
      const newUser = await AuthService.register(userData);
      if (newUser) {
        setUser(newUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return null; // You could return a loading screen here
    }

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};