import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Task, ViewMode } from '../types';
import { useAuth } from '../contexts/AuthContext';
import DatabaseService from '../services/database';
import SyncService from '../services/sync';
import { auth } from '../services/firebase';
import TaskCard from '../components/TaskCard';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('priority');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Pull latest from cloud before loading local
      const uid = auth.currentUser?.uid || user.email;
      await SyncService.pullCloudTasksToLocal(user.user_id, uid);
      const userTasks = await DatabaseService.getTasksByUserId(user.user_id);
      setTasks(userTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [user])
  );

  const handleToggleComplete = async (taskId: number) => {
    try {
      const task = tasks.find(t => t.task_id === taskId);
      if (!task) return;

      await DatabaseService.updateTask(taskId, { completed: !task.completed });
      const uid = auth.currentUser?.uid || user!.email;
      await SyncService.pushLocalTasksToCloud(user!.user_id, uid);
      await loadTasks();
    } catch (error) {
      console.error('Error toggling task completion:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  const handleEditTask = (task: Task) => {
    navigation.navigate('AddTask', { task });
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await DatabaseService.deleteTask(taskId);
      if (user) {
        const uid = auth.currentUser?.uid || user.email;
        await SyncService.pushLocalTasksToCloud(user.user_id, uid);
      }
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task. Please try again.');
    }
  };

  const groupTasksByPriority = (taskList: Task[]) => {
    const incomplete = taskList.filter(task => !task.completed);
    const completed = taskList.filter(task => task.completed);

    const groupedIncomplete = {
      High: incomplete.filter(task => task.importance === 'High'),
      Medium: incomplete.filter(task => task.importance === 'Medium'),
      Low: incomplete.filter(task => task.importance === 'Low'),
    };

    return { groupedIncomplete, completed };
  };

  const sortTasksByDueDate = (taskList: Task[]) => {
    const incomplete = taskList.filter(task => !task.completed);
    const completed = taskList.filter(task => task.completed);

    incomplete.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    return { incomplete, completed };
  };

  const renderPriorityView = () => {
    const { groupedIncomplete, completed } = groupTasksByPriority(tasks);

    return (
      <>
        {(['High', 'Medium', 'Low'] as const).map(priority => {
          const priorityTasks = groupedIncomplete[priority];
          if (priorityTasks.length === 0) return null;

          return (
            <View key={priority} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{priority} Priority</Text>
                <Text style={styles.sectionCount}>{priorityTasks.length}</Text>
              </View>
              {priorityTasks.map(task => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </View>
          );
        })}

        {completed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, styles.completedTitle]}>Completed</Text>
              <Text style={styles.sectionCount}>{completed.length}</Text>
            </View>
            {completed.map(task => (
              <TaskCard
                key={task.task_id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </View>
        )}
      </>
    );
  };

  const renderDueDateView = () => {
    const { incomplete, completed } = sortTasksByDueDate(tasks);

    return (
      <>
        {incomplete.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
              <Text style={styles.sectionCount}>{incomplete.length}</Text>
            </View>
            {incomplete.map(task => (
              <TaskCard
                key={task.task_id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </View>
        )}

        {completed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, styles.completedTitle]}>Completed</Text>
              <Text style={styles.sectionCount}>{completed.length}</Text>
            </View>
            {completed.map(task => (
              <TaskCard
                key={task.task_id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'priority' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('priority')}>
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === 'priority' && styles.toggleButtonTextActive,
              ]}>
              Priority
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'dueDate' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('dueDate')}>
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === 'dueDate' && styles.toggleButtonTextActive,
              ]}>
              Due Date
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddTask', {})}>
            <Text style={styles.addButtonText}>+ Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📝</Text>
            <Text style={styles.emptyStateTitle}>No tasks yet</Text>
            <Text style={styles.emptyStateMessage}>
              Get started by adding your first task!
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('AddTask', {})}>
              <Text style={styles.emptyStateButtonText}>Add Your First Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {viewMode === 'priority' ? renderPriorityView() : renderDueDateView()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#6366f1',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  completedTitle: {
    color: '#6b7280',
  },
  sectionCount: {
    fontSize: 14,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;