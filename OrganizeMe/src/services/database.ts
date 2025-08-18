import SQLite from 'react-native-sqlite-storage';
import { User, Task, Reminder } from '../types';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DATABASE_NAME = 'OrganizeMe.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAYNAME = 'OrganizeMe SQLite Database';
const DATABASE_SIZE = 200000;

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        version: DATABASE_VERSION,
        displayName: DATABASE_DISPLAYNAME,
        size: DATABASE_SIZE,
      });

      await this.createTables();
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS Users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        birthday TEXT NOT NULL,
        phone_number TEXT NOT NULL
      );
    `;

    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS Tasks (
        task_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT NOT NULL,
        importance TEXT CHECK(importance IN ('High', 'Medium', 'Low')) NOT NULL,
        reminder_enabled INTEGER DEFAULT 0,
        reminder_time TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (user_id)
      );
    `;

    const createRemindersTable = `
      CREATE TABLE IF NOT EXISTS Reminders (
        reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        remind_at TEXT NOT NULL,
        sent INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES Tasks (task_id) ON DELETE CASCADE
      );
    `;

    await this.db.executeSql(createUsersTable);
    await this.db.executeSql(createTasksTable);
    await this.db.executeSql(createRemindersTable);
  }

  // User operations
  async createUser(userData: Omit<User, 'user_id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT INTO Users (name, email, password, birthday, phone_number)
      VALUES (?, ?, ?, ?, ?);
    `;

    const result = await this.db.executeSql(query, [
      userData.name,
      userData.email,
      userData.password,
      userData.birthday,
      userData.phone_number,
    ]);

    return result[0].insertId;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM Users WHERE email = ?';
    const result = await this.db.executeSql(query, [email]);

    if (result[0].rows.length > 0) {
      return result[0].rows.item(0) as User;
    }
    return null;
  }

  async getUserById(userId: number): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM Users WHERE user_id = ?';
    const result = await this.db.executeSql(query, [userId]);

    if (result[0].rows.length > 0) {
      return result[0].rows.item(0) as User;
    }
    return null;
  }

  // Task operations
  async createTask(taskData: Omit<Task, 'task_id' | 'created_at' | 'updated_at'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const query = `
      INSERT INTO Tasks (user_id, title, description, due_date, importance, reminder_enabled, reminder_time, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const result = await this.db.executeSql(query, [
      taskData.user_id,
      taskData.title,
      taskData.description,
      taskData.due_date,
      taskData.importance,
      taskData.reminder_enabled ? 1 : 0,
      taskData.reminder_time || null,
      taskData.completed ? 1 : 0,
      now,
      now,
    ]);

    const taskId = result[0].insertId;

    // Create reminder if enabled
    if (taskData.reminder_enabled && taskData.reminder_time) {
      await this.createReminder(taskId, taskData.reminder_time);
    }

    return taskId;
  }

  async updateTask(taskId: number, taskData: Partial<Task>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    Object.entries(taskData).forEach(([key, value]) => {
      if (key !== 'task_id' && key !== 'created_at' && value !== undefined) {
        if (key === 'reminder_enabled' || key === 'completed') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    fields.push('updated_at = ?');
    values.push(now, taskId);

    const query = `UPDATE Tasks SET ${fields.join(', ')} WHERE task_id = ?`;
    await this.db.executeSql(query, values);

    // Update reminders if reminder settings changed
    if (taskData.reminder_enabled !== undefined || taskData.reminder_time !== undefined) {
      await this.deleteRemindersByTaskId(taskId);
      if (taskData.reminder_enabled && taskData.reminder_time) {
        await this.createReminder(taskId, taskData.reminder_time);
      }
    }
  }

  async deleteTask(taskId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM Tasks WHERE task_id = ?', [taskId]);
  }

  async getTasksByUserId(userId: number): Promise<Task[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM Tasks WHERE user_id = ? ORDER BY updated_at DESC';
    const result = await this.db.executeSql(query, [userId]);

    const tasks: Task[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      tasks.push({
        ...row,
        reminder_enabled: row.reminder_enabled === 1,
        completed: row.completed === 1,
      });
    }

    return tasks;
  }

  async getTaskById(taskId: number): Promise<Task | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM Tasks WHERE task_id = ?';
    const result = await this.db.executeSql(query, [taskId]);

    if (result[0].rows.length > 0) {
      const row = result[0].rows.item(0);
      return {
        ...row,
        reminder_enabled: row.reminder_enabled === 1,
        completed: row.completed === 1,
      };
    }
    return null;
  }

  // Reminder operations
  async createReminder(taskId: number, remindAt: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'INSERT INTO Reminders (task_id, remind_at, sent) VALUES (?, ?, 0)';
    const result = await this.db.executeSql(query, [taskId, remindAt]);

    return result[0].insertId;
  }

  async deleteRemindersByTaskId(taskId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM Reminders WHERE task_id = ?', [taskId]);
  }

  async getPendingReminders(): Promise<Reminder[]> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const query = 'SELECT * FROM Reminders WHERE sent = 0 AND remind_at <= ?';
    const result = await this.db.executeSql(query, [now]);

    const reminders: Reminder[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      reminders.push({
        ...row,
        sent: row.sent === 1,
      });
    }

    return reminders;
  }

  async markReminderSent(reminderId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('UPDATE Reminders SET sent = 1 WHERE reminder_id = ?', [reminderId]);
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export default new DatabaseService();