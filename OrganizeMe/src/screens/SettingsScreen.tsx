import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPhoneNumber = (phone: string): string => {
    // Simple phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const SettingItem: React.FC<{
    label: string;
    value: string;
    icon: string;
  }> = ({ label, value, icon }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Text style={styles.settingIconText}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No user data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <View style={styles.settingsContainer}>
            <SettingItem
              label="Full Name"
              value={user.name}
              icon="👤"
            />
            <SettingItem
              label="Email Address"
              value={user.email}
              icon="📧"
            />
            <SettingItem
              label="Phone Number"
              value={formatPhoneNumber(user.phone_number)}
              icon="📱"
            />
            <SettingItem
              label="Birthday"
              value={formatDate(user.birthday)}
              icon="🎂"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.settingsContainer}>
            <SettingItem
              label="Version"
              value="1.0.0"
              icon="📱"
            />
            <SettingItem
              label="Build"
              value="2024.1.0"
              icon="🔧"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.settingsContainer}>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>❓</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Help & FAQ</Text>
                <Text style={styles.settingSubtext}>Get answers to common questions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>💬</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Contact Support</Text>
                <Text style={styles.settingSubtext}>Get help from our team</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>⭐</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Rate OrganizeMe</Text>
                <Text style={styles.settingSubtext}>Share your feedback</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={[styles.actionItem, styles.logoutItem]}
              onPress={handleLogout}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>🚪</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, styles.logoutText]}>Log Out</Text>
                <Text style={styles.settingSubtext}>Sign out of your account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ by the OrganizeMe Team
          </Text>
          <Text style={styles.footerSubtext}>
            © 2024 OrganizeMe. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingVertical: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#64748b',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingIconText: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#64748b',
  },
  settingSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  logoutText: {
    color: '#ef4444',
  },
  chevron: {
    fontSize: 20,
    color: '#9ca3af',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default SettingsScreen;