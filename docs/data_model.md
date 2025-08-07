# Data Model - OrganizeMe App

## Entity Relationship Diagram

```
┌─────────────────────────────────┐
│              TASKS              │
├─────────────────────────────────┤
│ PK │ task_id (INTEGER)          │
│    │ title (TEXT, NOT NULL)     │
│    │ description (TEXT)         │
│    │ due_date (DATE, NOT NULL)  │
│    │ due_time (TIME)            │
│    │ priority (INTEGER)         │
│    │ status (INTEGER)           │
│    │ created_at (DATETIME)      │
│    │ updated_at (DATETIME)      │
│    │ completed_at (DATETIME)    │
│    │ has_reminder (BOOLEAN)     │
│    │ reminder_time (DATETIME)   │
│    │ notification_id (TEXT)     │
└─────────────────────────────────┘
            │
            │ 1:N
            ▼
┌─────────────────────────────────┐
│           TASK_HISTORY          │
├─────────────────────────────────┤
│ PK │ history_id (INTEGER)       │
│ FK │ task_id (INTEGER)          │
│    │ action_type (TEXT)         │
│    │ old_value (TEXT)           │
│    │ new_value (TEXT)           │
│    │ timestamp (DATETIME)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│             SETTINGS            │
├─────────────────────────────────┤
│ PK │ setting_key (TEXT)         │
│    │ setting_value (TEXT)       │
│    │ updated_at (DATETIME)      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│          NOTIFICATIONS          │
├─────────────────────────────────┤
│ PK │ notification_id (TEXT)     │
│ FK │ task_id (INTEGER)          │
│    │ scheduled_time (DATETIME)  │
│    │ status (TEXT)              │
│    │ created_at (DATETIME)      │
│    │ fired_at (DATETIME)        │
└─────────────────────────────────┘
```

## Table Definitions

### 1. TASKS Table

The primary table storing all task information.

```sql
CREATE TABLE tasks (
    task_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(length(title) > 0),
    description TEXT DEFAULT '',
    due_date DATE NOT NULL,
    due_time TIME DEFAULT '23:59:00',
    priority INTEGER NOT NULL DEFAULT 2 CHECK(priority IN (1, 2, 3)),
    status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (1, 2, 3)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    has_reminder BOOLEAN NOT NULL DEFAULT 0,
    reminder_time DATETIME NULL,
    notification_id TEXT NULL
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_reminder_time ON tasks(reminder_time) WHERE has_reminder = 1;
```

#### Field Descriptions:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `task_id` | INTEGER | Primary key, auto-increment | PK, NOT NULL |
| `title` | TEXT | Task name/title | NOT NULL, length > 0 |
| `description` | TEXT | Optional task description | Default: '' |
| `due_date` | DATE | Task due date | NOT NULL |
| `due_time` | TIME | Task due time | Default: 23:59:00 |
| `priority` | INTEGER | Priority level (1=High, 2=Medium, 3=Low) | 1-3, Default: 2 |
| `status` | INTEGER | Task status (1=Pending, 2=Completed, 3=Deleted) | 1-3, Default: 1 |
| `created_at` | DATETIME | Task creation timestamp | NOT NULL, Auto |
| `updated_at` | DATETIME | Last modification timestamp | NOT NULL, Auto |
| `completed_at` | DATETIME | Task completion timestamp | NULL until completed |
| `has_reminder` | BOOLEAN | Whether task has reminder set | Default: 0 |
| `reminder_time` | DATETIME | When to send reminder | NULL if no reminder |
| `notification_id` | TEXT | System notification ID | For canceling notifications |

#### Priority Enumeration:
- `1` = High Priority (Red)
- `2` = Medium Priority (Orange) 
- `3` = Low Priority (Green)

#### Status Enumeration:
- `1` = Pending (Active task)
- `2` = Completed (Done)
- `3` = Deleted (Soft delete)

### 2. TASK_HISTORY Table

Tracks changes to tasks for audit and undo functionality.

```sql
CREATE TABLE task_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('CREATE', 'UPDATE', 'COMPLETE', 'DELETE', 'RESTORE')),
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

-- Index for efficient queries
CREATE INDEX idx_history_task_id ON task_history(task_id);
CREATE INDEX idx_history_timestamp ON task_history(timestamp);
```

#### Field Descriptions:

| Field | Type | Description |
|-------|------|-------------|
| `history_id` | INTEGER | Primary key |
| `task_id` | INTEGER | Reference to task |
| `action_type` | TEXT | Type of change made |
| `field_name` | TEXT | Which field changed (for UPDATE) |
| `old_value` | TEXT | Previous value |
| `new_value` | TEXT | New value |
| `timestamp` | DATETIME | When change occurred |

#### Action Types:
- `CREATE` = Task created
- `UPDATE` = Task field modified
- `COMPLETE` = Task marked complete
- `DELETE` = Task deleted
- `RESTORE` = Task restored from deletion

### 3. SETTINGS Table

Stores user preferences and app configuration.

```sql
CREATE TABLE settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO settings (setting_key, setting_value) VALUES
('default_priority', '2'),
('default_reminder_offset', '1440'), -- minutes (1 day)
('theme', 'auto'),
('notifications_enabled', '1'),
('overdue_reminders', '1'),
('daily_summary', '0'),
('first_launch', '1');
```

#### Default Settings:

| Key | Default Value | Description |
|-----|---------------|-------------|
| `default_priority` | `2` | Medium priority |
| `default_reminder_offset` | `1440` | 1 day before (in minutes) |
| `theme` | `auto` | Follow system theme |
| `notifications_enabled` | `1` | Enable notifications |
| `overdue_reminders` | `1` | Remind about overdue tasks |
| `daily_summary` | `0` | Daily summary disabled |
| `first_launch` | `1` | Show welcome tutorial |

### 4. NOTIFICATIONS Table

Tracks scheduled notifications for tasks.

```sql
CREATE TABLE notifications (
    notification_id TEXT PRIMARY KEY,
    task_id INTEGER NOT NULL,
    scheduled_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'FIRED', 'CANCELLED')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fired_at DATETIME NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

-- Indexes for notification management
CREATE INDEX idx_notifications_scheduled_time ON notifications(scheduled_time);
CREATE INDEX idx_notifications_status ON notifications(status);
```

#### Field Descriptions:

| Field | Type | Description |
|-------|------|-------------|
| `notification_id` | TEXT | System notification UUID |
| `task_id` | INTEGER | Associated task |
| `scheduled_time` | DATETIME | When to fire notification |
| `status` | TEXT | Notification state |
| `created_at` | DATETIME | When notification was scheduled |
| `fired_at` | DATETIME | When notification was sent |

## Database Triggers

### Auto-update Timestamps

```sql
-- Update updated_at timestamp when task is modified
CREATE TRIGGER update_task_timestamp 
    AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP 
    WHERE task_id = NEW.task_id;
END;

-- Log task changes to history
CREATE TRIGGER log_task_changes 
    AFTER UPDATE ON tasks
BEGIN
    INSERT INTO task_history (task_id, action_type, old_value, new_value)
    VALUES (NEW.task_id, 'UPDATE', 
            OLD.title || '|' || OLD.priority || '|' || OLD.due_date,
            NEW.title || '|' || NEW.priority || '|' || NEW.due_date);
END;

-- Set completed_at when task is marked complete
CREATE TRIGGER set_completion_time
    AFTER UPDATE OF status ON tasks
    WHEN NEW.status = 2 AND OLD.status != 2
BEGIN
    UPDATE tasks SET completed_at = CURRENT_TIMESTAMP 
    WHERE task_id = NEW.task_id;
END;
```

## Data Access Patterns

### Common Queries

#### 1. Get Active Tasks by Priority View
```sql
SELECT task_id, title, description, due_date, due_time, priority, 
       has_reminder, reminder_time,
       CASE 
           WHEN due_date < date('now') THEN 'overdue'
           WHEN due_date = date('now') THEN 'today'
           ELSE 'upcoming'
       END as urgency
FROM tasks 
WHERE status = 1 
ORDER BY priority ASC, due_date ASC, due_time ASC;
```

#### 2. Get Active Tasks by Date View
```sql
SELECT task_id, title, description, due_date, due_time, priority,
       CASE 
           WHEN due_date < date('now') THEN 1  -- Overdue
           WHEN due_date = date('now') THEN 2  -- Today  
           WHEN due_date = date('now', '+1 day') THEN 3  -- Tomorrow
           WHEN due_date <= date('now', '+7 days') THEN 4  -- This week
           ELSE 5  -- Later
       END as date_group
FROM tasks 
WHERE status = 1 
ORDER BY date_group ASC, priority ASC, due_time ASC;
```

#### 3. Get Overdue Tasks
```sql
SELECT task_id, title, due_date, 
       julianday('now') - julianday(due_date) as days_overdue
FROM tasks 
WHERE status = 1 AND due_date < date('now')
ORDER BY due_date ASC;
```

#### 4. Get Tasks Due Soon (Next 24 hours)
```sql
SELECT task_id, title, due_date, due_time
FROM tasks 
WHERE status = 1 
  AND datetime(due_date || ' ' || due_time) 
      BETWEEN datetime('now') AND datetime('now', '+1 day')
ORDER BY due_date ASC, due_time ASC;
```

#### 5. Get Pending Notifications
```sql
SELECT n.notification_id, n.scheduled_time, t.title, t.task_id
FROM notifications n
JOIN tasks t ON n.task_id = t.task_id
WHERE n.status = 'SCHEDULED' 
  AND n.scheduled_time <= datetime('now', '+5 minutes')
  AND t.status = 1
ORDER BY n.scheduled_time ASC;
```

## Data Validation Rules

### Business Logic Constraints

1. **Task Title**: Must be non-empty, max 200 characters
2. **Due Date**: Cannot be more than 5 years in the future
3. **Priority**: Must be 1 (High), 2 (Medium), or 3 (Low)
4. **Reminder Time**: Must be before due date/time
5. **Status Transitions**: Only allow valid state changes

### Validation Functions

```python
def validate_task_data(task_data):
    """Validate task data before database insertion"""
    errors = []
    
    # Title validation
    if not task_data.get('title', '').strip():
        errors.append("Task title is required")
    elif len(task_data['title']) > 200:
        errors.append("Task title too long (max 200 characters)")
    
    # Due date validation
    due_date = task_data.get('due_date')
    if due_date:
        from datetime import datetime, timedelta
        max_date = datetime.now() + timedelta(days=5*365)  # 5 years
        if due_date > max_date:
            errors.append("Due date too far in future")
    
    # Priority validation
    priority = task_data.get('priority')
    if priority not in [1, 2, 3]:
        errors.append("Invalid priority level")
    
    # Reminder validation
    if task_data.get('has_reminder') and task_data.get('reminder_time'):
        reminder_time = task_data['reminder_time']
        due_datetime = datetime.combine(due_date, task_data.get('due_time'))
        if reminder_time >= due_datetime:
            errors.append("Reminder must be before due date/time")
    
    return errors
```

## Data Migration Strategy

### Version 1.0 → 1.1 Migration
```sql
-- Add new columns for enhanced features
ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN estimated_duration INTEGER DEFAULT 0; -- minutes
ALTER TABLE tasks ADD COLUMN actual_duration INTEGER DEFAULT 0;

-- Create new table for task attachments
CREATE TABLE task_attachments (
    attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);
```

## Performance Optimizations

### Database Optimization Strategies

1. **Indexing Strategy**:
   - Primary indexes on frequently queried columns
   - Composite indexes for complex queries
   - Partial indexes for conditional queries

2. **Query Optimization**:
   - Use prepared statements for repeated queries
   - Limit result sets with pagination
   - Use EXISTS instead of IN for subqueries

3. **Connection Management**:
   - Connection pooling for concurrent access
   - WAL mode for better concurrency
   - Regular VACUUM operations

### Storage Considerations

- **Database Size**: Estimated 1KB per task
- **Growth Rate**: ~100 tasks per student per semester
- **Cleanup Strategy**: Archive completed tasks older than 1 year
- **Backup Strategy**: Export to JSON for portability

## Data Privacy & Security

### Local Storage Benefits
- All data remains on device
- No cloud synchronization required
- Complete user control over data
- GDPR compliant by design

### Data Export Format
```json
{
  "version": "1.0",
  "exported_at": "2024-12-13T10:30:00Z",
  "tasks": [
    {
      "id": 1,
      "title": "Complete Math IA",
      "description": "Statistical analysis project",
      "due_date": "2024-12-15",
      "due_time": "23:59:00",
      "priority": 1,
      "status": 1,
      "created_at": "2024-12-10T08:00:00Z",
      "has_reminder": true,
      "reminder_time": "2024-12-14T18:00:00Z"
    }
  ],
  "settings": {
    "default_priority": 2,
    "theme": "auto"
  }
}
```

This comprehensive data model provides a robust foundation for the OrganizeMe app, ensuring data integrity, performance, and scalability while maintaining simplicity for the MVP.