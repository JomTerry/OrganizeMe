import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPriorityColor = (importance: string): string => {
    switch (importance) {
      case 'High':
        return '#ef4444';
      case 'Medium':
        return '#f59e0b';
      case 'Low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const isOverdue = (): boolean => {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now && !task.completed;
  };

  const handleLongPress = () => {
    Alert.alert(
      'Task Options',
      `What would you like to do with "${task.title}"?`,
      [
        {
          text: 'Edit',
          onPress: () => onEdit(task),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Task',
              'Are you sure you want to delete this task?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(task.task_id) },
              ]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        task.completed && styles.completedContainer,
        isOverdue() && styles.overdueContainer,
      ]}
      onLongPress={handleLongPress}
      delayLongPress={500}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              task.completed && styles.checkboxCompleted,
            ]}
            onPress={() => onToggleComplete(task.task_id)}>
            {task.completed && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          
          <View style={styles.taskInfo}>
            <Text
              style={[
                styles.title,
                task.completed && styles.completedText,
              ]}>
              {task.title}
            </Text>
            {task.description ? (
              <Text
                style={[
                  styles.description,
                  task.completed && styles.completedText,
                ]}>
                {task.description}
              </Text>
            ) : null}
          </View>
          
          <View
            style={[
              styles.priorityIndicator,
              { backgroundColor: getPriorityColor(task.importance) },
            ]}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, isOverdue() && styles.overdueText]}>
              {formatDate(task.due_date)} at {formatTime(task.due_date)}
            </Text>
          </View>
          
          {task.reminder_enabled && (
            <View style={styles.reminderBadge}>
              <Text style={styles.reminderText}>🔔</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedContainer: {
    opacity: 0.7,
  },
  overdueContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  overdueText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  reminderBadge: {
    marginLeft: 8,
  },
  reminderText: {
    fontSize: 14,
  },
});

export default TaskCard;