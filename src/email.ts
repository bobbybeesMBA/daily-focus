import nodemailer from 'nodemailer';
import { config } from './config.js';
import type { Task } from './tasks.js';
import { formatDueDate } from './tasks.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

function formatTaskLine(task: Task): string {
  const due = formatDueDate(task.due);
  return due ? `${task.title} (${due})` : task.title;
}

function getSubjectWithDate(): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `DAILY FOCUS - ${dateStr}`;
}

export async function sendDailyFocusEmail(
  topTasks: Task[],
  totalRemaining: number
): Promise<void> {
  let body: string;

  if (topTasks.length === 0) {
    body = '☕ No tasks today! Enjoy your morning.';
  } else {
    const [mainTask, ...stretchTasks] = topTasks;

    const lines: string[] = [
      '🎯 TODAY\'S FOCUS',
      '═══════════════════════════════',
      '',
      formatTaskLine(mainTask!),
      '',
    ];

    if (stretchTasks.length > 0) {
      lines.push('───────────────────────────────');
      lines.push('Stretch Goals:');
      stretchTasks.forEach((task) => {
        lines.push(`  • ${formatTaskLine(task)}`);
      });
      lines.push('');
    }

    lines.push('───────────────────────────────');
    lines.push(`📋 ${totalRemaining} task${totalRemaining === 1 ? '' : 's'} remaining`);

    body = lines.join('\n');
  }

  await transporter.sendMail({
    from: config.EMAIL_USER,
    to: config.EMAIL_USER,
    subject: getSubjectWithDate(),
    text: body,
  });

  console.log('Email sent successfully!');
}
