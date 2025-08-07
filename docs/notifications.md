# Notification Logic - OrganizeMe App

## Overview

The OrganizeMe app uses a sophisticated notification system to remind users about upcoming tasks and overdue items. This document outlines the complete notification logic, scheduling algorithms, and implementation details.

## Notification Types

### 1. Task Reminders
**Purpose:** Remind users about upcoming task deadlines
**Trigger:** User-defined time before task due date
**Frequency:** One-time per task (unless snoozed)

### 2. Overdue Notifications  
**Purpose:** Alert users about tasks past their due date
**Trigger:** Daily check for overdue tasks
**Frequency:** Daily until task is completed or dismissed

### 3. Daily Summary (Optional)
**Purpose:** Morning overview of today's tasks
**Trigger:** User-defined time each morning
**Frequency:** Daily

### 4. Achievement Notifications
**Purpose:** Celebrate task completion milestones
**Trigger:** Completing tasks or reaching streaks
**Frequency:** As earned

## Notification Scheduling Algorithm

### Core Scheduling Logic

```python
from datetime import datetime, timedelta
import uuid
from plyer import notification
import sqlite3

class NotificationScheduler:
    def __init__(self, db_connection):
        self.db = db_connection
        self.scheduled_notifications = {}
    
    def schedule_task_reminder(self, task_id, task_title, due_datetime, reminder_offset_minutes):
        """
        Schedule a reminder notification for a task
        
        Args:
            task_id: Database ID of the task
            task_title: Title of the task for notification
            due_datetime: When the task is due
            reminder_offset_minutes: How many minutes before due date to remind
        
        Returns:
            notification_id: Unique ID for the scheduled notification
        """
        # Calculate reminder time
        reminder_time = due_datetime - timedelta(minutes=reminder_offset_minutes)
        
        # Don't schedule notifications in the past
        if reminder_time <= datetime.now():
            return None
            
        # Generate unique notification ID
        notification_id = str(uuid.uuid4())
        
        # Store in database
        self.db.execute("""
            INSERT INTO notifications (notification_id, task_id, scheduled_time, status)
            VALUES (?, ?, ?, 'SCHEDULED')
        """, (notification_id, task_id, reminder_time))
        
        # Schedule with system
        self._schedule_system_notification(
            notification_id=notification_id,
            title="Task Reminder",
            message=f"{task_title} is due {self._format_due_time(due_datetime)}",
            scheduled_time=reminder_time,
            task_id=task_id
        )
        
        return notification_id
    
    def _format_due_time(self, due_datetime):
        """Format due time in human-readable format"""
        now = datetime.now()
        time_diff = due_datetime - now
        
        if time_diff.days > 1:
            return f"in {time_diff.days} days"
        elif time_diff.days == 1:
            return "tomorrow"
        elif time_diff.seconds > 3600:
            hours = time_diff.seconds // 3600
            return f"in {hours} hours"
        else:
            minutes = time_diff.seconds // 60
            return f"in {minutes} minutes"
```

### Reminder Offset Calculations

```python
class ReminderCalculator:
    """Calculate optimal reminder times based on task priority and user preferences"""
    
    PRIORITY_MULTIPLIERS = {
        1: 1.5,  # High priority - more advance notice
        2: 1.0,  # Medium priority - standard notice  
        3: 0.7   # Low priority - less advance notice
    }
    
    DEFAULT_OFFSETS = {
        'minutes': [15, 30, 60],           # For tasks due within hours
        'hours': [2, 4, 8, 24],            # For tasks due within days  
        'days': [1, 2, 3, 7],              # For tasks due within weeks
        'weeks': [1, 2]                    # For tasks due far out
    }
    
    def calculate_reminder_time(self, due_datetime, priority, user_preference=None):
        """
        Calculate optimal reminder time based on task characteristics
        
        Args:
            due_datetime: When task is due
            priority: Task priority (1=High, 2=Medium, 3=Low)
            user_preference: User's default reminder preference
            
        Returns:
            reminder_datetime: When to send reminder
        """
        now = datetime.now()
        time_until_due = due_datetime - now
        
        # Use user preference if provided
        if user_preference:
            base_offset = user_preference
        else:
            # Auto-calculate based on time until due
            if time_until_due.days > 7:
                base_offset = timedelta(days=2)
            elif time_until_due.days > 1:
                base_offset = timedelta(days=1)
            elif time_until_due.seconds > 14400:  # 4 hours
                base_offset = timedelta(hours=2)
            else:
                base_offset = timedelta(minutes=30)
        
        # Apply priority multiplier
        multiplier = self.PRIORITY_MULTIPLIERS.get(priority, 1.0)
        adjusted_offset = base_offset * multiplier
        
        # Calculate reminder time
        reminder_time = due_datetime - adjusted_offset
        
        # Ensure reminder is not in the past
        if reminder_time <= now:
            reminder_time = now + timedelta(minutes=5)
            
        return reminder_time
```

### Overdue Task Detection

```python
class OverdueManager:
    """Manage notifications for overdue tasks"""
    
    def __init__(self, db_connection, notification_scheduler):
        self.db = db_connection
        self.scheduler = notification_scheduler
        
    def check_overdue_tasks(self):
        """Check for overdue tasks and schedule notifications"""
        cursor = self.db.execute("""
            SELECT task_id, title, due_date, due_time, priority
            FROM tasks 
            WHERE status = 1 
              AND datetime(due_date || ' ' || due_time) < datetime('now')
              AND task_id NOT IN (
                  SELECT task_id FROM notifications 
                  WHERE status = 'SCHEDULED' 
                    AND notification_id LIKE 'overdue_%'
              )
        """)
        
        overdue_tasks = cursor.fetchall()
        
        for task in overdue_tasks:
            self._schedule_overdue_notification(task)
    
    def _schedule_overdue_notification(self, task):
        """Schedule daily overdue reminder"""
        task_id, title, due_date, due_time, priority = task
        
        # Calculate how many days overdue
        due_datetime = datetime.strptime(f"{due_date} {due_time}", "%Y-%m-%d %H:%M:%S")
        days_overdue = (datetime.now() - due_datetime).days
        
        # Create overdue notification
        notification_id = f"overdue_{task_id}_{datetime.now().strftime('%Y%m%d')}"
        
        # Schedule for next morning (9 AM)
        tomorrow_9am = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
        
        self.scheduler._schedule_system_notification(
            notification_id=notification_id,
            title="⚠️ Overdue Task",
            message=f"{title} was due {days_overdue} days ago",
            scheduled_time=tomorrow_9am,
            task_id=task_id,
            is_overdue=True
        )
```

## System Integration

### Android Notification Implementation

```python
from plyer import notification
from kivy.clock import Clock
import threading

class AndroidNotificationHandler:
    """Handle Android-specific notification functionality"""
    
    def __init__(self):
        self.pending_notifications = {}
        self.notification_thread = None
        
    def schedule_notification(self, notification_id, title, message, scheduled_time, task_id=None):
        """Schedule a notification with the Android system"""
        
        # Calculate delay until notification time
        delay = (scheduled_time - datetime.now()).total_seconds()
        
        if delay <= 0:
            # Send immediately
            self._send_notification(title, message, task_id)
        else:
            # Schedule for later
            self.pending_notifications[notification_id] = {
                'title': title,
                'message': message,
                'scheduled_time': scheduled_time,
                'task_id': task_id
            }
            
            # Use Kivy's Clock to schedule
            Clock.schedule_once(
                lambda dt: self._send_notification(title, message, task_id), 
                delay
            )
    
    def _send_notification(self, title, message, task_id=None):
        """Send notification to Android system"""
        try:
            notification.notify(
                title=title,
                message=message,
                app_name="OrganizeMe",
                app_icon="assets/icon.png",
                timeout=10
            )
            
            # Log notification sent
            self._log_notification_sent(title, message, task_id)
            
        except Exception as e:
            print(f"Failed to send notification: {e}")
    
    def cancel_notification(self, notification_id):
        """Cancel a scheduled notification"""
        if notification_id in self.pending_notifications:
            del self.pending_notifications[notification_id]
            # Note: Plyer doesn't support canceling scheduled notifications
            # This would need platform-specific implementation
    
    def _log_notification_sent(self, title, message, task_id):
        """Log that notification was successfully sent"""
        # Update database to mark notification as fired
        # Implementation depends on database connection
        pass
```

### Notification Actions

```python
class NotificationActionHandler:
    """Handle user interactions with notifications"""
    
    def __init__(self, task_manager):
        self.task_manager = task_manager
        
    def handle_notification_action(self, action, task_id):
        """Process user action on notification"""
        
        if action == "mark_complete":
            self._mark_task_complete(task_id)
        elif action == "snooze":
            self._snooze_task(task_id)
        elif action == "view_task":
            self._open_task_details(task_id)
        elif action == "dismiss":
            self._dismiss_notification(task_id)
    
    def _mark_task_complete(self, task_id):
        """Mark task as complete from notification"""
        self.task_manager.complete_task(task_id)
        
        # Send confirmation notification
        notification.notify(
            title="✅ Task Completed",
            message="Great job! Task marked as complete.",
            timeout=3
        )
    
    def _snooze_task(self, task_id):
        """Snooze task reminder for later"""
        # Reschedule reminder for 15 minutes later
        snooze_time = datetime.now() + timedelta(minutes=15)
        
        task = self.task_manager.get_task(task_id)
        self.scheduler.schedule_task_reminder(
            task_id=task_id,
            task_title=task['title'],
            due_datetime=snooze_time,
            reminder_offset_minutes=0
        )
```

## Smart Notification Features

### Intelligent Timing

```python
class SmartNotificationTiming:
    """Optimize notification timing based on user behavior"""
    
    def __init__(self):
        self.user_active_hours = self._detect_active_hours()
        self.notification_effectiveness = {}
    
    def _detect_active_hours(self):
        """Detect when user is most active in the app"""
        # Analyze app usage patterns from database
        # Return hours when user is most likely to be available
        return {'start': 8, 'end': 22}  # 8 AM to 10 PM default
    
    def optimize_notification_time(self, scheduled_time):
        """Adjust notification time to when user is most likely to see it"""
        
        hour = scheduled_time.hour
        
        # If notification is scheduled outside active hours, adjust
        if hour < self.user_active_hours['start']:
            # Move to start of active period
            return scheduled_time.replace(hour=self.user_active_hours['start'])
        elif hour > self.user_active_hours['end']:
            # Move to next day's start of active period
            next_day = scheduled_time + timedelta(days=1)
            return next_day.replace(hour=self.user_active_hours['start'])
        
        return scheduled_time
    
    def track_notification_effectiveness(self, notification_id, user_action):
        """Track how user responds to notifications for future optimization"""
        self.notification_effectiveness[notification_id] = {
            'action': user_action,  # 'completed', 'snoozed', 'dismissed', 'ignored'
            'timestamp': datetime.now()
        }
```

### Batch Notifications

```python
class BatchNotificationManager:
    """Group multiple notifications to avoid spam"""
    
    def __init__(self, max_notifications_per_hour=3):
        self.max_per_hour = max_notifications_per_hour
        self.recent_notifications = []
    
    def should_send_notification(self, notification_type, priority):
        """Determine if notification should be sent based on recent activity"""
        
        # Clean old notifications (older than 1 hour)
        cutoff_time = datetime.now() - timedelta(hours=1)
        self.recent_notifications = [
            n for n in self.recent_notifications 
            if n['timestamp'] > cutoff_time
        ]
        
        # Count recent notifications
        recent_count = len(self.recent_notifications)
        
        # Always allow high priority notifications
        if priority == 1:  # High priority
            return True
        
        # Limit medium and low priority notifications
        if recent_count >= self.max_per_hour:
            return False
        
        return True
    
    def group_notifications(self, pending_notifications):
        """Group multiple notifications into a single summary"""
        
        if len(pending_notifications) <= 1:
            return pending_notifications
        
        # Group by type
        task_reminders = [n for n in pending_notifications if n['type'] == 'task_reminder']
        overdue_tasks = [n for n in pending_notifications if n['type'] == 'overdue']
        
        grouped = []
        
        if len(task_reminders) > 1:
            # Create summary notification for multiple reminders
            task_count = len(task_reminders)
            grouped.append({
                'title': f"📋 {task_count} Task Reminders",
                'message': f"You have {task_count} tasks coming up soon",
                'type': 'summary'
            })
        else:
            grouped.extend(task_reminders)
        
        if len(overdue_tasks) > 1:
            # Create summary for overdue tasks
            overdue_count = len(overdue_tasks)
            grouped.append({
                'title': f"⚠️ {overdue_count} Overdue Tasks",
                'message': f"You have {overdue_count} tasks past their deadline",
                'type': 'overdue_summary'
            })
        else:
            grouped.extend(overdue_tasks)
        
        return grouped
```

## Notification Persistence

### Database Storage

```python
class NotificationPersistence:
    """Manage notification state in database"""
    
    def __init__(self, db_connection):
        self.db = db_connection
    
    def save_notification(self, notification_data):
        """Save notification to database"""
        self.db.execute("""
            INSERT INTO notifications 
            (notification_id, task_id, scheduled_time, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            notification_data['id'],
            notification_data['task_id'],
            notification_data['scheduled_time'],
            'SCHEDULED',
            datetime.now()
        ))
        self.db.commit()
    
    def mark_notification_fired(self, notification_id):
        """Mark notification as sent"""
        self.db.execute("""
            UPDATE notifications 
            SET status = 'FIRED', fired_at = ?
            WHERE notification_id = ?
        """, (datetime.now(), notification_id))
        self.db.commit()
    
    def cancel_notification(self, notification_id):
        """Cancel a scheduled notification"""
        self.db.execute("""
            UPDATE notifications 
            SET status = 'CANCELLED'
            WHERE notification_id = ?
        """, (notification_id,))
        self.db.commit()
    
    def get_pending_notifications(self):
        """Get all pending notifications"""
        cursor = self.db.execute("""
            SELECT notification_id, task_id, scheduled_time
            FROM notifications
            WHERE status = 'SCHEDULED'
              AND scheduled_time <= datetime('now', '+5 minutes')
            ORDER BY scheduled_time ASC
        """)
        return cursor.fetchall()
```

## Error Handling & Recovery

### Notification Failure Handling

```python
class NotificationErrorHandler:
    """Handle notification failures and recovery"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.failed_notifications = []
    
    def handle_notification_failure(self, notification_id, error):
        """Handle failed notification delivery"""
        
        # Log the failure
        self._log_notification_failure(notification_id, str(error))
        
        # Add to retry queue
        self.failed_notifications.append({
            'id': notification_id,
            'error': str(error),
            'retry_count': 0,
            'next_retry': datetime.now() + timedelta(minutes=5)
        })
    
    def retry_failed_notifications(self):
        """Retry failed notifications with exponential backoff"""
        
        current_time = datetime.now()
        notifications_to_retry = [
            n for n in self.failed_notifications 
            if n['next_retry'] <= current_time and n['retry_count'] < 3
        ]
        
        for notification in notifications_to_retry:
            try:
                # Attempt to resend
                self._resend_notification(notification['id'])
                
                # Remove from failed list on success
                self.failed_notifications.remove(notification)
                
            except Exception as e:
                # Update retry info with exponential backoff
                notification['retry_count'] += 1
                notification['next_retry'] = current_time + timedelta(
                    minutes=5 * (2 ** notification['retry_count'])
                )
    
    def _log_notification_failure(self, notification_id, error):
        """Log notification failure to database"""
        self.db.execute("""
            INSERT INTO notification_errors 
            (notification_id, error_message, timestamp)
            VALUES (?, ?, ?)
        """, (notification_id, error, datetime.now()))
        self.db.commit()
```

## Performance Optimization

### Efficient Scheduling

1. **Batch Processing**: Group notification operations to reduce database calls
2. **Lazy Loading**: Only load notification details when needed
3. **Cache Management**: Cache frequently accessed notification data
4. **Background Processing**: Handle notification scheduling in background threads

### Memory Management

```python
class NotificationMemoryManager:
    """Optimize memory usage for notification system"""
    
    def __init__(self, max_cached_notifications=100):
        self.max_cached = max_cached_notifications
        self.notification_cache = {}
        self.cache_access_times = {}
    
    def cache_notification(self, notification_id, notification_data):
        """Cache notification data with LRU eviction"""
        
        # Remove oldest if cache is full
        if len(self.notification_cache) >= self.max_cached:
            oldest_id = min(self.cache_access_times, 
                          key=self.cache_access_times.get)
            del self.notification_cache[oldest_id]
            del self.cache_access_times[oldest_id]
        
        # Add to cache
        self.notification_cache[notification_id] = notification_data
        self.cache_access_times[notification_id] = datetime.now()
    
    def get_cached_notification(self, notification_id):
        """Retrieve notification from cache"""
        if notification_id in self.notification_cache:
            self.cache_access_times[notification_id] = datetime.now()
            return self.notification_cache[notification_id]
        return None
```

## Testing & Validation

### Notification Testing Framework

```python
class NotificationTester:
    """Test notification functionality"""
    
    def test_reminder_scheduling(self):
        """Test that reminders are scheduled correctly"""
        # Create test task
        # Schedule reminder
        # Verify notification is in database
        # Verify timing is correct
        pass
    
    def test_overdue_detection(self):
        """Test overdue task detection"""
        # Create overdue task
        # Run overdue check
        # Verify notification is scheduled
        pass
    
    def test_notification_cancellation(self):
        """Test canceling notifications when task is completed"""
        # Schedule notification
        # Complete task
        # Verify notification is cancelled
        pass
```

This comprehensive notification system ensures users stay informed about their tasks while avoiding notification fatigue through intelligent timing and batching strategies.