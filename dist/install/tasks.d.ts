import { z } from 'zod';
declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    status: z.ZodString;
    due: z.ZodOptional<z.ZodString>;
    updated: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Task = z.infer<typeof TaskSchema> & {
    created?: string;
};
/**
 * Ensures the 'Task Dawn Sync' list exists in the user's Google Tasks.
 * Creates it automatically on first run if it doesn't exist.
 * This list is used for iCloud Reminders sync via IFTTT.
 */
export declare function ensureSyncListExists(): Promise<{
    id: string;
    title: string;
}>;
export declare function fetchTasks(): Promise<Task[]>;
export declare function rankTasks(tasks: Task[]): Task[];
export declare function formatDueDate(due?: string): string;
export {};
