import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import DatabaseService from './database';
import { Task } from '../types';

class SyncService {
  async pushLocalTasksToCloud(localUserId: number, cloudUserId: string): Promise<void> {
    const tasks = await DatabaseService.getTasksByUserId(localUserId);
    const ref = doc(collection(db, 'users'), cloudUserId);
    await setDoc(ref, { tasks }, { merge: true });
  }

  async pullCloudTasksToLocal(localUserId: number, cloudUserId: string): Promise<void> {
    const ref = doc(collection(db, 'users'), cloudUserId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { tasks?: Task[] };
    if (!data.tasks || !Array.isArray(data.tasks)) return;

    // Replace local tasks for this user with cloud tasks
    // Simple approach: delete and re-insert. For brevity; could implement proper merge later.
    const local = await DatabaseService.getTasksByUserId(localUserId);
    for (const t of local) {
      await DatabaseService.deleteTask(t.task_id);
    }
    for (const t of data.tasks) {
      await DatabaseService.createTask({
        user_id: localUserId,
        title: t.title,
        description: t.description,
        due_date: t.due_date,
        importance: t.importance,
        reminder_enabled: t.reminder_enabled,
        reminder_time: t.reminder_time,
        completed: t.completed,
      });
    }
  }
}

export default new SyncService();

