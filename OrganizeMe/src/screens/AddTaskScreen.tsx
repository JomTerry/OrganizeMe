import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import DatabaseService from '../services/database';

type AddTaskScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddTask'>;
type AddTaskScreenRouteProp = RouteProp<RootStackParamList, 'AddTask'>;

interface Props {
  navigation: AddTaskScreenNavigationProp;
  route: AddTaskScreenRouteProp;
}

const AddTaskScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { task: editingTask } = route.params || {};
  const isEditing = !!editingTask;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: new Date(),
    importance: 'Medium' as 'High' | 'Medium' | 'Low',
    reminder_enabled: false,
    reminder_offset: 10, // minutes before due date
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description || '',
        due_date: new Date(editingTask.due_date),
        importance: editingTask.importance,
        reminder_enabled: editingTask.reminder_enabled,
        reminder_offset: editingTask.reminder_time 
          ? Math.floor((new Date(editingTask.due_date).getTime() - new Date(editingTask.reminder_time).getTime()) / (1000 * 60))
          : 10,
      });
    }
  }, [editingTask]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    const now = new Date();
    if (formData.due_date <= now) {
      newErrors.due_date = 'Please choose a future date and time';
    }

    if (formData.reminder_enabled && formData.reminder_offset <= 0) {
      newErrors.reminder_offset = 'Reminder time must be greater than 0 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateReminderTime = (): string => {
    const reminderTime = new Date(formData.due_date);
    reminderTime.setMinutes(reminderTime.getMinutes() - formData.reminder_offset);
    return reminderTime.toISOString();
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsLoading(true);
    try {
      const taskData = {
        user_id: user.user_id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        due_date: formData.due_date.toISOString(),
        importance: formData.importance,
        reminder_enabled: formData.reminder_enabled,
        reminder_time: formData.reminder_enabled ? calculateReminderTime() : undefined,
        completed: false,
      };

      if (isEditing && editingTask) {
        await DatabaseService.updateTask(editingTask.task_id, taskData);
      } else {
        await DatabaseService.createTask(taskData);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving task:', error);
      Alert.alert('Error', error.message || 'Failed to save task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(formData.due_date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setFormData({ ...formData, due_date: newDate });
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(formData.due_date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setFormData({ ...formData, due_date: newDate });
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const ImportanceButton: React.FC<{ 
    level: 'High' | 'Medium' | 'Low'; 
    color: string; 
  }> = ({ level, color }) => (
    <TouchableOpacity
      style={[
        styles.importanceButton,
        formData.importance === level && styles.importanceButtonActive,
        formData.importance === level && { backgroundColor: color },
      ]}
      onPress={() => setFormData({ ...formData, importance: level })}>
      <Text
        style={[
          styles.importanceButtonText,
          formData.importance === level && styles.importanceButtonTextActive,
        ]}>
        {level}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.input, errors.title ? styles.inputError : null]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter task title"
                maxLength={100}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter task description (optional)"
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Due Date & Time *</Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={[styles.dateTimeButton, errors.due_date ? styles.inputError : null]}
                  onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateTimeText}>{formatDate(formData.due_date)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateTimeButton, errors.due_date ? styles.inputError : null]}
                  onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.dateTimeText}>{formatTime(formData.due_date)}</Text>
                </TouchableOpacity>
              </View>
              {errors.due_date && <Text style={styles.errorText}>{errors.due_date}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Importance</Text>
              <View style={styles.importanceContainer}>
                <ImportanceButton level="High" color="#ef4444" />
                <ImportanceButton level="Medium" color="#f59e0b" />
                <ImportanceButton level="Low" color="#10b981" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.reminderHeader}>
                <Text style={styles.label}>Reminder</Text>
                <Switch
                  value={formData.reminder_enabled}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reminder_enabled: value })
                  }
                  trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                  thumbColor={formData.reminder_enabled ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              {formData.reminder_enabled && (
                <View style={styles.reminderOptions}>
                  <Text style={styles.reminderLabel}>Remind me</Text>
                  <View style={styles.reminderOffsetContainer}>
                    <TextInput
                      style={[styles.reminderInput, errors.reminder_offset ? styles.inputError : null]}
                      value={formData.reminder_offset.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setFormData({ ...formData, reminder_offset: value });
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.reminderUnit}>minutes before</Text>
                  </View>
                  {errors.reminder_offset && (
                    <Text style={styles.errorText}>{errors.reminder_offset}</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isLoading}>
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : isEditing ? 'Update Task' : 'Save Task'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={formData.due_date}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={formData.due_date}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#374151',
  },
  importanceContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  importanceButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  importanceButtonActive: {
    borderColor: 'transparent',
  },
  importanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  importanceButtonTextActive: {
    color: '#ffffff',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderOptions: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reminderLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  reminderOffsetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#ffffff',
    width: 80,
    textAlign: 'center',
  },
  reminderUnit: {
    fontSize: 14,
    color: '#6b7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default AddTaskScreen;