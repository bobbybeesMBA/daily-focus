import { google, tasks_v1 } from 'googleapis';
import { z } from 'zod';
import { config } from './config.js';

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  due: z.string().optional(),
  updated: z.string().optional(),
});

const TaskListSchema = z.object({
  id: z.string(),
  title: z.string(),
});

export type Task = z.infer<typeof TaskSchema> & { created?: string };

const oauth2Client = new google.auth.OAuth2(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: config.GOOGLE_REFRESH_TOKEN,
});

const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.response?.status || error?.code;
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

async function getAllTaskLists(): Promise<{ id: string; title: string }[]> {
  const response = await withRetry(() => tasksApi.tasklists.list());
  const lists = response.data.items || [];
  const validLists: { id: string; title: string }[] = [];

  for (const list of lists) {
    const parsed = TaskListSchema.safeParse(list);
    if (parsed.success) {
      validLists.push({ id: parsed.data.id, title: parsed.data.title });
    }
  }

  return validLists;
}

export async function fetchTasks(): Promise<Task[]> {
  // Fetch ALL task lists to capture iCloud-synced tasks via IFTTT
  const taskLists = await getAllTaskLists();

  if (taskLists.length === 0) {
    console.log('No task lists found, using @default');
    taskLists.push({ id: '@default', title: 'Default' });
  }

  console.log(`Found ${taskLists.length} task list(s): ${taskLists.map(l => l.title).join(', ')}`);

  const allTasks: Task[] = [];

  for (const list of taskLists) {
    try {
      const response = await withRetry(() =>
        tasksApi.tasks.list({
          tasklist: list.id,
          showCompleted: false,
          showHidden: false,
          maxResults: 100,
        })
      );

      const items = response.data.items || [];

      for (const item of items) {
        const parsed = TaskSchema.safeParse(item);
        if (parsed.success && parsed.data.status === 'needsAction') {
          allTasks.push({
            ...parsed.data,
            created: (item as any).updated, // Google Tasks uses 'updated' as creation proxy
          });
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not fetch tasks from list "${list.title}"`);
    }
  }

  return allTasks;
}

export function rankTasks(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return tasks.sort((a, b) => {
    // Priority 1: URGENT in title (case-insensitive)
    const aUrgent = a.title.toLowerCase().includes('urgent');
    const bUrgent = b.title.toLowerCase().includes('urgent');
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;

    // Priority 2: Overdue (due date < today)
    const aDue = a.due ? new Date(a.due) : null;
    const bDue = b.due ? new Date(b.due) : null;
    const aOverdue = aDue && aDue < today;
    const bOverdue = bDue && bDue < today;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Priority 3: FIFO (oldest created first)
    const aCreated = a.created ? new Date(a.created).getTime() : Infinity;
    const bCreated = b.created ? new Date(b.created).getTime() : Infinity;
    return aCreated - bCreated;
  });
}

export function formatDueDate(due?: string): string {
  if (!due) return '';
  const date = new Date(due);
  return `Due: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
