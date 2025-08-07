# Error Handling & Edge Cases - OrganizeMe App

## Overview

This document outlines comprehensive error handling strategies, edge case scenarios, and recovery mechanisms for the OrganizeMe app. Proper error handling ensures a smooth user experience even when things go wrong.

## Error Categories

### 1. Database Errors
- Connection failures
- Corruption issues
- Storage limit exceeded
- Transaction conflicts

### 2. Input Validation Errors
- Invalid task data
- Date/time validation
- Character limits exceeded
- Required field missing

### 3. System Integration Errors
- Notification permission denied
- Storage access denied
- Network connectivity issues (future features)
- OS compatibility problems

### 4. Application Logic Errors
- Task state conflicts
- Scheduling conflicts
- Priority calculation errors
- Sorting algorithm failures

## Database Error Handling

### Connection Management

```python
import sqlite3
import logging
from contextlib import contextmanager
import time
import os

class DatabaseErrorHandler:
    """Handle database connection and operation errors"""
    
    def __init__(self, db_path, max_retries=3):
        self.db_path = db_path
        self.max_retries = max_retries
        self.connection = None
        
    @contextmanager
    def get_connection(self):
        """Get database connection with error handling and retry logic"""
        connection = None
        retry_count = 0
        
        while retry_count < self.max_retries:
            try:
                connection = sqlite3.connect(
                    self.db_path,
                    timeout=30.0,
                    check_same_thread=False
                )
                connection.row_factory = sqlite3.Row
                yield connection
                break
                
            except sqlite3.OperationalError as e:
                retry_count += 1
                logging.error(f"Database connection failed (attempt {retry_count}): {e}")
                
                if "database is locked" in str(e).lower():
                    # Wait and retry for locked database
                    time.sleep(0.5 * retry_count)
                    continue
                elif "disk I/O error" in str(e).lower():
                    # Check disk space and permissions
                    self._handle_disk_error()
                    break
                else:
                    # Other operational errors
                    if retry_count >= self.max_retries:
                        self._handle_connection_failure(e)
                        break
                        
            except sqlite3.DatabaseError as e:
                logging.error(f"Database corruption detected: {e}")
                self._handle_database_corruption()
                break
                
            except Exception as e:
                logging.error(f"Unexpected database error: {e}")
                self._handle_unexpected_error(e)
                break
                
        finally:
            if connection:
                try:
                    connection.close()
                except:
                    pass
    
    def _handle_disk_error(self):
        """Handle disk I/O errors"""
        # Check available disk space
        if self._get_free_space() < 10 * 1024 * 1024:  # 10MB
            raise DatabaseError("Insufficient disk space")
        
        # Check file permissions
        if not os.access(os.path.dirname(self.db_path), os.W_OK):
            raise DatabaseError("No write permission to database directory")
    
    def _handle_database_corruption(self):
        """Handle database corruption"""
        backup_path = f"{self.db_path}.backup"
        
        # Try to backup existing data
        try:
            self._backup_database(backup_path)
        except:
            logging.error("Failed to backup corrupted database")
        
        # Recreate database
        self._recreate_database()
        
        # Attempt to restore from backup
        try:
            self._restore_from_backup(backup_path)
        except:
            logging.error("Failed to restore from backup")
    
    def _handle_connection_failure(self, error):
        """Handle persistent connection failures"""
        error_msg = f"Database connection failed after {self.max_retries} attempts: {error}"
        logging.critical(error_msg)
        raise DatabaseError(error_msg)

class DatabaseError(Exception):
    """Custom exception for database-related errors"""
    pass
```

### Transaction Safety

```python
class SafeTransaction:
    """Ensure database transactions are atomic and handle rollbacks"""
    
    def __init__(self, connection):
        self.connection = connection
        self.in_transaction = False
    
    def __enter__(self):
        try:
            self.connection.execute("BEGIN IMMEDIATE")
            self.in_transaction = True
            return self
        except sqlite3.Error as e:
            logging.error(f"Failed to start transaction: {e}")
            raise DatabaseError(f"Transaction start failed: {e}")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is None:
                # No exception, commit transaction
                self.connection.execute("COMMIT")
                logging.debug("Transaction committed successfully")
            else:
                # Exception occurred, rollback
                if self.in_transaction:
                    self.connection.execute("ROLLBACK")
                    logging.warning(f"Transaction rolled back due to: {exc_val}")
        except sqlite3.Error as e:
            logging.error(f"Error during transaction cleanup: {e}")
        finally:
            self.in_transaction = False

# Usage example
def update_task_safely(task_id, task_data):
    """Update task with transaction safety"""
    try:
        with DatabaseErrorHandler().get_connection() as conn:
            with SafeTransaction(conn):
                # Update task
                conn.execute("""
                    UPDATE tasks SET title = ?, priority = ?, updated_at = ?
                    WHERE task_id = ?
                """, (task_data['title'], task_data['priority'], datetime.now(), task_id))
                
                # Log change
                conn.execute("""
                    INSERT INTO task_history (task_id, action_type, new_value)
                    VALUES (?, 'UPDATE', ?)
                """, (task_id, str(task_data)))
                
    except DatabaseError as e:
        logging.error(f"Failed to update task {task_id}: {e}")
        raise TaskUpdateError(f"Could not update task: {e}")
```

## Input Validation & Sanitization

### Task Data Validation

```python
from datetime import datetime, timedelta
import re

class TaskValidator:
    """Comprehensive task data validation"""
    
    MAX_TITLE_LENGTH = 200
    MAX_DESCRIPTION_LENGTH = 1000
    MAX_FUTURE_DAYS = 5 * 365  # 5 years
    
    def __init__(self):
        self.errors = []
    
    def validate_task(self, task_data):
        """Validate all task fields"""
        self.errors = []
        
        self._validate_title(task_data.get('title'))
        self._validate_description(task_data.get('description'))
        self._validate_dates(task_data.get('due_date'), task_data.get('due_time'))
        self._validate_priority(task_data.get('priority'))
        self._validate_reminder(task_data)
        
        return len(self.errors) == 0, self.errors
    
    def _validate_title(self, title):
        """Validate task title"""
        if not title or not title.strip():
            self.errors.append({
                'field': 'title',
                'code': 'REQUIRED',
                'message': 'Task title is required'
            })
            return
        
        title = title.strip()
        
        if len(title) > self.MAX_TITLE_LENGTH:
            self.errors.append({
                'field': 'title',
                'code': 'TOO_LONG',
                'message': f'Title too long (max {self.MAX_TITLE_LENGTH} characters)'
            })
        
        # Check for potentially harmful content
        if self._contains_suspicious_content(title):
            self.errors.append({
                'field': 'title',
                'code': 'INVALID_CONTENT',
                'message': 'Title contains invalid characters'
            })
    
    def _validate_description(self, description):
        """Validate task description"""
        if description and len(description) > self.MAX_DESCRIPTION_LENGTH:
            self.errors.append({
                'field': 'description',
                'code': 'TOO_LONG',
                'message': f'Description too long (max {self.MAX_DESCRIPTION_LENGTH} characters)'
            })
    
    def _validate_dates(self, due_date, due_time):
        """Validate due date and time"""
        if not due_date:
            self.errors.append({
                'field': 'due_date',
                'code': 'REQUIRED',
                'message': 'Due date is required'
            })
            return
        
        try:
            # Parse and validate date
            if isinstance(due_date, str):
                due_date = datetime.strptime(due_date, '%Y-%m-%d').date()
            
            # Check if date is too far in the future
            max_date = datetime.now().date() + timedelta(days=self.MAX_FUTURE_DAYS)
            if due_date > max_date:
                self.errors.append({
                    'field': 'due_date',
                    'code': 'TOO_FAR_FUTURE',
                    'message': 'Due date too far in the future'
                })
            
            # Validate time if provided
            if due_time:
                try:
                    if isinstance(due_time, str):
                        datetime.strptime(due_time, '%H:%M:%S')
                except ValueError:
                    self.errors.append({
                        'field': 'due_time',
                        'code': 'INVALID_FORMAT',
                        'message': 'Invalid time format'
                    })
                    
        except ValueError:
            self.errors.append({
                'field': 'due_date',
                'code': 'INVALID_FORMAT',
                'message': 'Invalid date format'
            })
    
    def _validate_priority(self, priority):
        """Validate task priority"""
        if priority is None:
            return  # Optional field
        
        try:
            priority = int(priority)
            if priority not in [1, 2, 3]:
                self.errors.append({
                    'field': 'priority',
                    'code': 'INVALID_VALUE',
                    'message': 'Priority must be 1 (High), 2 (Medium), or 3 (Low)'
                })
        except (ValueError, TypeError):
            self.errors.append({
                'field': 'priority',
                'code': 'INVALID_TYPE',
                'message': 'Priority must be a number'
            })
    
    def _validate_reminder(self, task_data):
        """Validate reminder settings"""
        has_reminder = task_data.get('has_reminder', False)
        reminder_time = task_data.get('reminder_time')
        
        if has_reminder and not reminder_time:
            self.errors.append({
                'field': 'reminder_time',
                'code': 'REQUIRED_WHEN_ENABLED',
                'message': 'Reminder time required when reminder is enabled'
            })
        
        if reminder_time:
            try:
                if isinstance(reminder_time, str):
                    reminder_time = datetime.fromisoformat(reminder_time)
                
                # Check if reminder is in the past
                if reminder_time <= datetime.now():
                    self.errors.append({
                        'field': 'reminder_time',
                        'code': 'IN_PAST',
                        'message': 'Reminder time cannot be in the past'
                    })
                
                # Check if reminder is after due date
                due_date = task_data.get('due_date')
                due_time = task_data.get('due_time', '23:59:59')
                
                if due_date:
                    due_datetime = datetime.combine(due_date, datetime.strptime(due_time, '%H:%M:%S').time())
                    if reminder_time >= due_datetime:
                        self.errors.append({
                            'field': 'reminder_time',
                            'code': 'AFTER_DUE_DATE',
                            'message': 'Reminder must be before due date'
                        })
                        
            except (ValueError, TypeError):
                self.errors.append({
                    'field': 'reminder_time',
                    'code': 'INVALID_FORMAT',
                    'message': 'Invalid reminder time format'
                })
    
    def _contains_suspicious_content(self, text):
        """Check for potentially harmful content"""
        suspicious_patterns = [
            r'<script.*?>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'on\w+\s*=',   # Event handlers
            r'\\x[0-9a-f]{2}',  # Hex encoded characters
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        
        return False

class TaskUpdateError(Exception):
    """Exception for task update failures"""
    pass
```

## System Integration Error Handling

### Permission Management

```python
from plyer import notification
import os

class PermissionManager:
    """Handle system permissions and graceful degradation"""
    
    def __init__(self):
        self.permissions_status = {}
    
    def check_all_permissions(self):
        """Check all required permissions"""
        self.permissions_status = {
            'notifications': self._check_notification_permission(),
            'storage': self._check_storage_permission(),
            'vibration': self._check_vibration_permission()
        }
        return self.permissions_status
    
    def _check_notification_permission(self):
        """Check if notifications are allowed"""
        try:
            # Test notification
            notification.notify(
                title="Permission Test",
                message="Testing notification permission",
                timeout=1
            )
            return True
        except Exception as e:
            logging.warning(f"Notification permission denied: {e}")
            return False
    
    def _check_storage_permission(self):
        """Check storage access"""
        try:
            test_file = "test_permission.tmp"
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
            return True
        except Exception as e:
            logging.warning(f"Storage permission denied: {e}")
            return False
    
    def handle_permission_denied(self, permission_type):
        """Handle denied permissions gracefully"""
        handlers = {
            'notifications': self._handle_notification_denied,
            'storage': self._handle_storage_denied,
            'vibration': self._handle_vibration_denied
        }
        
        handler = handlers.get(permission_type)
        if handler:
            return handler()
        else:
            return self._handle_unknown_permission(permission_type)
    
    def _handle_notification_denied(self):
        """Handle notification permission denial"""
        return {
            'can_continue': True,
            'fallback_method': 'in_app_alerts',
            'user_message': 'Notifications disabled. You\'ll see reminders when you open the app.',
            'settings_action': 'Enable notifications in your device settings for better reminders.'
        }
    
    def _handle_storage_denied(self):
        """Handle storage permission denial"""
        return {
            'can_continue': False,
            'fallback_method': None,
            'user_message': 'Storage access required to save your tasks.',
            'settings_action': 'Please enable storage permission in your device settings.'
        }
```

### Network Error Handling (Future Features)

```python
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

class NetworkErrorHandler:
    """Handle network-related errors for future cloud features"""
    
    def __init__(self):
        self.session = self._create_session()
        self.offline_mode = False
    
    def _create_session(self):
        """Create HTTP session with retry strategy"""
        session = requests.Session()
        
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS", "POST", "PUT"],
            backoff_factor=1
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def handle_network_error(self, error):
        """Handle various network errors"""
        if isinstance(error, requests.exceptions.ConnectionError):
            return self._handle_connection_error()
        elif isinstance(error, requests.exceptions.Timeout):
            return self._handle_timeout_error()
        elif isinstance(error, requests.exceptions.HTTPError):
            return self._handle_http_error(error)
        else:
            return self._handle_unknown_network_error(error)
    
    def _handle_connection_error(self):
        """Handle connection failures"""
        self.offline_mode = True
        return {
            'success': False,
            'offline_mode': True,
            'message': 'No internet connection. Working offline.',
            'retry_after': 60  # seconds
        }
    
    def enable_offline_mode(self):
        """Enable offline functionality"""
        self.offline_mode = True
        # Queue operations for when connection is restored
        # Show offline indicator in UI
        # Disable cloud-dependent features
```

## Application Logic Error Handling

### Task State Management

```python
class TaskStateManager:
    """Manage task state transitions and conflicts"""
    
    VALID_TRANSITIONS = {
        1: [2, 3],  # Pending -> Completed, Deleted
        2: [1],     # Completed -> Pending (restore)
        3: [1]      # Deleted -> Pending (restore)
    }
    
    def __init__(self, db_connection):
        self.db = db_connection
    
    def change_task_status(self, task_id, new_status, user_id=None):
        """Safely change task status with validation"""
        try:
            # Get current task state
            current_task = self._get_task_state(task_id)
            if not current_task:
                raise TaskStateError(f"Task {task_id} not found")
            
            current_status = current_task['status']
            
            # Validate transition
            if not self._is_valid_transition(current_status, new_status):
                raise TaskStateError(
                    f"Invalid status transition from {current_status} to {new_status}"
                )
            
            # Check for conflicts
            if self._has_conflicts(task_id, new_status):
                raise TaskStateError("Task has unresolved conflicts")
            
            # Perform state change
            with SafeTransaction(self.db) as transaction:
                self._update_task_status(task_id, new_status)
                self._log_state_change(task_id, current_status, new_status, user_id)
                self._handle_side_effects(task_id, new_status)
            
            return True
            
        except Exception as e:
            logging.error(f"Failed to change task status: {e}")
            raise
    
    def _is_valid_transition(self, current_status, new_status):
        """Check if status transition is valid"""
        valid_next_states = self.VALID_TRANSITIONS.get(current_status, [])
        return new_status in valid_next_states
    
    def _has_conflicts(self, task_id, new_status):
        """Check for state conflicts"""
        # Check if task is being modified by another process
        # Check if dependencies are satisfied
        # Check if user has permission to make this change
        return False
    
    def _handle_side_effects(self, task_id, new_status):
        """Handle side effects of status changes"""
        if new_status == 2:  # Completed
            self._cancel_reminders(task_id)
            self._update_completion_stats()
        elif new_status == 3:  # Deleted
            self._cancel_reminders(task_id)
            self._cleanup_related_data(task_id)

class TaskStateError(Exception):
    """Exception for task state management errors"""
    pass
```

### Sorting Algorithm Error Handling

```python
class SafeSorter:
    """Robust sorting with error handling"""
    
    def __init__(self):
        self.fallback_sort = lambda tasks: sorted(tasks, key=lambda t: t.get('created_at', ''))
    
    def sort_tasks(self, tasks, sort_type='priority'):
        """Sort tasks with error handling and fallback"""
        try:
            if sort_type == 'priority':
                return self._sort_by_priority(tasks)
            elif sort_type == 'date':
                return self._sort_by_date(tasks)
            else:
                logging.warning(f"Unknown sort type: {sort_type}")
                return self.fallback_sort(tasks)
                
        except Exception as e:
            logging.error(f"Sorting failed: {e}")
            return self.fallback_sort(tasks)
    
    def _sort_by_priority(self, tasks):
        """Sort by priority with error handling"""
        def priority_key(task):
            try:
                # Primary: Priority (1=High, 2=Medium, 3=Low)
                priority = int(task.get('priority', 2))
                
                # Secondary: Due date
                due_date = task.get('due_date', '9999-12-31')
                
                # Tertiary: Due time
                due_time = task.get('due_time', '23:59:59')
                
                return (priority, due_date, due_time)
                
            except (ValueError, TypeError) as e:
                logging.warning(f"Invalid task data for sorting: {e}")
                return (2, '9999-12-31', '23:59:59')  # Default values
        
        return sorted(tasks, key=priority_key)
    
    def _sort_by_date(self, tasks):
        """Sort by date with error handling"""
        def date_key(task):
            try:
                due_date = task.get('due_date', '9999-12-31')
                due_time = task.get('due_time', '23:59:59')
                priority = int(task.get('priority', 2))
                
                return (due_date, due_time, priority)
                
            except (ValueError, TypeError):
                return ('9999-12-31', '23:59:59', 2)
        
        return sorted(tasks, key=date_key)
```

## Edge Case Scenarios

### Date/Time Edge Cases

```python
class DateTimeHandler:
    """Handle various date/time edge cases"""
    
    def __init__(self):
        self.timezone_aware = True
    
    def handle_edge_cases(self):
        """Handle common date/time edge cases"""
        
        # Leap year handling
        self._test_leap_year_dates()
        
        # Daylight saving time transitions
        self._handle_dst_transitions()
        
        # Year boundary crossings
        self._handle_year_boundaries()
        
        # Invalid dates (Feb 30, etc.)
        self._handle_invalid_dates()
    
    def _handle_dst_transitions(self):
        """Handle daylight saving time changes"""
        # When clocks "spring forward" (skip an hour)
        # When clocks "fall back" (repeat an hour)
        # Adjust reminder times accordingly
        pass
    
    def _handle_invalid_dates(self):
        """Handle invalid date inputs gracefully"""
        invalid_dates = [
            "2024-02-30",  # Invalid February date
            "2024-13-01",  # Invalid month
            "2024-04-31",  # April doesn't have 31 days
        ]
        
        for date_str in invalid_dates:
            try:
                datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                # Handle invalid date gracefully
                logging.warning(f"Invalid date detected: {date_str}")
```

### Concurrent Access Handling

```python
import threading
import time

class ConcurrencyManager:
    """Handle concurrent access to shared resources"""
    
    def __init__(self):
        self.locks = {}
        self.lock_timeout = 30  # seconds
    
    def with_lock(self, resource_id):
        """Decorator for thread-safe operations"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                lock = self._get_lock(resource_id)
                
                if lock.acquire(timeout=self.lock_timeout):
                    try:
                        return func(*args, **kwargs)
                    finally:
                        lock.release()
                else:
                    raise ConcurrencyError(f"Could not acquire lock for {resource_id}")
            return wrapper
        return decorator
    
    def _get_lock(self, resource_id):
        """Get or create lock for resource"""
        if resource_id not in self.locks:
            self.locks[resource_id] = threading.Lock()
        return self.locks[resource_id]

class ConcurrencyError(Exception):
    """Exception for concurrency-related errors"""
    pass
```

## User Experience Error Handling

### Graceful Degradation

```python
class GracefulDegradation:
    """Provide fallback functionality when features fail"""
    
    def __init__(self):
        self.failed_features = set()
        self.fallback_handlers = {
            'notifications': self._fallback_notifications,
            'database': self._fallback_database,
            'sorting': self._fallback_sorting
        }
    
    def handle_feature_failure(self, feature_name, error):
        """Handle feature failure with appropriate fallback"""
        logging.error(f"Feature '{feature_name}' failed: {error}")
        
        self.failed_features.add(feature_name)
        
        fallback = self.fallback_handlers.get(feature_name)
        if fallback:
            return fallback(error)
        else:
            return self._generic_fallback(feature_name, error)
    
    def _fallback_notifications(self, error):
        """Fallback for notification failures"""
        return {
            'method': 'in_app_alerts',
            'message': 'Using in-app alerts instead of system notifications',
            'user_action': 'Check the app regularly for reminders'
        }
    
    def _fallback_database(self, error):
        """Fallback for database failures"""
        return {
            'method': 'memory_storage',
            'message': 'Tasks will be stored temporarily in memory',
            'user_action': 'Please restart the app to restore full functionality'
        }
```

### Error Reporting & Analytics

```python
class ErrorReporter:
    """Collect and report errors for analysis"""
    
    def __init__(self):
        self.error_log = []
        self.max_errors = 100
    
    def report_error(self, error_type, error_message, context=None):
        """Report error with context information"""
        error_report = {
            'timestamp': datetime.now().isoformat(),
            'type': error_type,
            'message': str(error_message),
            'context': context or {},
            'app_version': self._get_app_version(),
            'device_info': self._get_device_info()
        }
        
        self.error_log.append(error_report)
        
        # Keep only recent errors
        if len(self.error_log) > self.max_errors:
            self.error_log = self.error_log[-self.max_errors:]
        
        # Log to file for debugging
        self._log_to_file(error_report)
    
    def get_error_summary(self):
        """Get summary of recent errors"""
        error_counts = {}
        for error in self.error_log[-50:]:  # Last 50 errors
            error_type = error['type']
            error_counts[error_type] = error_counts.get(error_type, 0) + 1
        
        return error_counts
```

## Recovery Mechanisms

### Automatic Recovery

```python
class AutoRecovery:
    """Automatic recovery from common failures"""
    
    def __init__(self):
        self.recovery_attempts = {}
        self.max_attempts = 3
    
    def attempt_recovery(self, error_type, recovery_function, *args, **kwargs):
        """Attempt automatic recovery with backoff"""
        attempt_key = f"{error_type}_{id(recovery_function)}"
        attempts = self.recovery_attempts.get(attempt_key, 0)
        
        if attempts >= self.max_attempts:
            logging.error(f"Max recovery attempts reached for {error_type}")
            return False
        
        try:
            # Wait before retry (exponential backoff)
            if attempts > 0:
                wait_time = 2 ** attempts
                time.sleep(wait_time)
            
            # Attempt recovery
            result = recovery_function(*args, **kwargs)
            
            # Reset attempt counter on success
            self.recovery_attempts[attempt_key] = 0
            
            return result
            
        except Exception as e:
            self.recovery_attempts[attempt_key] = attempts + 1
            logging.warning(f"Recovery attempt {attempts + 1} failed: {e}")
            return False

# Usage example
recovery = AutoRecovery()

def recover_database():
    """Attempt to recover database connection"""
    # Implementation for database recovery
    pass

# Automatic retry with backoff
if not recovery.attempt_recovery('database_connection', recover_database):
    # Handle permanent failure
    pass
```

This comprehensive error handling system ensures the OrganizeMe app remains stable and user-friendly even when encountering various failure scenarios.