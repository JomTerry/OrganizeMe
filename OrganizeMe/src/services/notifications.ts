import { Alert } from 'react-native';
import DatabaseService from './database';
import { Reminder, Task } from '../types';

class NotificationService {
  private intervalId: NodeJS.Timeout | null = null;

  // Initialize the notification checker
  startNotificationChecker(): void {
    // Check for pending reminders every minute
    this.intervalId = setInterval(() => {
      this.checkPendingReminders();
    }, 60000); // 60 seconds

    // Also check immediately
    this.checkPendingReminders();
  }

  stopNotificationChecker(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkPendingReminders(): Promise<void> {
    try {
      const pendingReminders = await DatabaseService.getPendingReminders();
      
      for (const reminder of pendingReminders) {
        await this.showReminder(reminder);
        await DatabaseService.markReminderSent(reminder.reminder_id);
      }
    } catch (error) {
      console.error('Error checking pending reminders:', error);
    }
  }

  private async showReminder(reminder: Reminder): Promise<void> {
    try {
      // Get the task details
      const task = await DatabaseService.getTaskById(reminder.task_id);
      
      if (!task) {
        console.warn('Task not found for reminder:', reminder.reminder_id);
        return;
      }

      // Show alert notification
      this.showAlertNotification(task);
    } catch (error) {
      console.error('Error showing reminder:', error);
    }
  }

  private showAlertNotification(task: Task): void {
    const dueDate = new Date(task.due_date);
    const formattedTime = dueDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    Alert.alert(
      '🔔 Task Reminder',
      `${task.title}\n\nDue: ${formattedTime}`,
      [
        {
          text: 'Dismiss',
          style: 'cancel',
        },
        {
          text: 'Mark Complete',
          onPress: async () => {
            try {
              await DatabaseService.updateTask(task.task_id, { completed: true });
            } catch (error) {
              console.error('Error marking task complete:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  // Method to schedule a notification for a specific task
  async scheduleNotification(taskId: number, reminderTime: string): Promise<void> {
    try {
      // In a full implementation, this would integrate with native notification APIs
      // For now, we rely on the database and interval checker
      console.log(`Notification scheduled for task ${taskId} at ${reminderTime}`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Method to cancel notifications for a task
  async cancelNotification(taskId: number): Promise<void> {
    try {
      await DatabaseService.deleteRemindersByTaskId(taskId);
      console.log(`Notifications cancelled for task ${taskId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Check if notifications are supported (placeholder for platform-specific checks)
  isNotificationSupported(): boolean {
    // In a real app, this would check for notification permissions
    return true;
  }

  // Request notification permissions (placeholder)
  async requestPermissions(): Promise<boolean> {
    // In a real app, this would request notification permissions
    // For now, we'll assume permissions are granted
    return true;
  }
}

export default new NotificationService();