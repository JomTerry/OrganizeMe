import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/auth';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, initialTab = 'signin' }) => {
  const { login, register } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPassword, setShowSigninPassword] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupBirthday, setSignupBirthday] = useState('1970-01-01');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSignin = async () => {
    if (!signinEmail.trim() || !signinPassword) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const ok = await login(signinEmail.trim().toLowerCase(), signinPassword);
      if (ok) onClose();
      else Alert.alert('Error', 'Invalid email or password');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupName.trim()) return Alert.alert('Error', 'Please enter your name');
    if (!signupEmail.trim()) return Alert.alert('Error', 'Please enter your email');
    if (!AuthService.validateEmail(signupEmail)) return Alert.alert('Error', 'Enter a valid email');
    if (signupPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    if (signupPassword !== signupConfirm) return Alert.alert('Error', 'Passwords do not match');
    if (!signupPhone.trim() || !AuthService.validatePhoneNumber(signupPhone)) return Alert.alert('Error', 'Enter a valid phone');

    setLoading(true);
    try {
      const ok = await register({
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        birthday: signupBirthday,
        phone_number: signupPhone.trim(),
      });
      if (ok) onClose();
      else Alert.alert('Error', 'Failed to create account');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    Alert.alert('Google Sign-In', 'Google sign-in for mobile is not configured yet. We will enable this once Google OAuth is set up for iOS/Android.');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{activeTab === 'signin' ? 'Sign in' : 'Sign up'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'signin' && styles.tabActive]}
              onPress={() => setActiveTab('signin')}
            >
              <Text style={[styles.tabText, activeTab === 'signin' && styles.tabTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
              onPress={() => setActiveTab('signup')}
            >
              <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle}>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
          <Text style={styles.orText}>or</Text>

          {activeTab === 'signin' ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={signinEmail}
                onChangeText={setSigninEmail}
              />
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password"
                  secureTextEntry={!showSigninPassword}
                  value={signinPassword}
                  onChangeText={setSigninPassword}
                />
                <TouchableOpacity
                  style={styles.toggle}
                  onPress={() => setShowSigninPassword(s => !s)}
                >
                  <Text style={styles.toggleText}>{showSigninPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSignin} disabled={loading}>
                <Text style={styles.primaryText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={signupName}
                onChangeText={setSignupName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={signupEmail}
                onChangeText={setSignupEmail}
              />
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password (min 6)"
                  secureTextEntry={!showSignupPassword}
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                />
                <TouchableOpacity style={styles.toggle} onPress={() => setShowSignupPassword(s => !s)}>
                  <Text style={styles.toggleText}>{showSignupPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Confirm password"
                  secureTextEntry={!showSignupConfirm}
                  value={signupConfirm}
                  onChangeText={setSignupConfirm}
                />
                <TouchableOpacity style={styles.toggle} onPress={() => setShowSignupConfirm(s => !s)}>
                  <Text style={styles.toggleText}>{showSignupConfirm ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                keyboardType="phone-pad"
                value={signupPhone}
                onChangeText={setSignupPhone}
              />
              <TextInput
                style={styles.input}
                placeholder="Birthday (YYYY-MM-DD)"
                value={signupBirthday}
                onChangeText={setSignupBirthday}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={loading}>
                <Text style={styles.primaryText}>{loading ? 'Creating account…' : 'Create account'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  close: { fontSize: 18, color: '#374151' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  tabActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  tabText: { color: '#374151', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  googleBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  googleText: { color: '#111827', fontWeight: '600' },
  orText: { textAlign: 'center', color: '#6b7280', marginVertical: 8 },
  form: { gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  toggle: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6 },
  toggleText: { color: '#374151', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
});

export default AuthModal;