import nodemailer from 'nodemailer';
import { config } from './config.js';
import type { Task } from './tasks.js';
import { formatDueDate } from './tasks.js';

const BRAND = {
  name: 'Task Dawn',
  tagline: 'Ignite your day with prioritized tasks in your inbox.',
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
});

function formatTaskLine(task: Task, index?: number): string {
  const due = formatDueDate(task.due);
  const prefix = index !== undefined ? `${index + 1}. ` : '';
  return due ? `${prefix}${task.title} (${due})` : `${prefix}${task.title}`;
}

function getSubjectWithDate(): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  return `${BRAND.name} - ${dateStr}`;
}

export async function sendDailyFocusEmail(
  topTasks: Task[],
  totalRemaining: number
): Promise<void> {
  let body: string;

  if (topTasks.length === 0) {
    const lines: string[] = [
      `${BRAND.name}`,
      '═══════════════════════════════════════',
      '',
      'No tasks today! Enjoy your morning.',
      '',
      '───────────────────────────────────────',
      BRAND.tagline,
    ];
    body = lines.join('\n');
  } else {
    const [mainTask, ...stretchTasks] = topTasks;

    const lines: string[] = [
      `${BRAND.name}`,
      '═══════════════════════════════════════',
      '',
      'TOP PRIORITY',
      `>>> ${formatTaskLine(mainTask!)} <<<`,
      '',
    ];

    if (stretchTasks.length > 0) {
      lines.push('───────────────────────────────────────');
      lines.push('STRETCH GOALS');
      stretchTasks.forEach((task, idx) => {
        lines.push(`  ${formatTaskLine(task, idx + 1)}`);
      });
      lines.push('');
    }

    lines.push('───────────────────────────────────────');
    lines.push(`${totalRemaining} task${totalRemaining === 1 ? '' : 's'} in queue`);
    lines.push('');
    lines.push(BRAND.tagline);

    body = lines.join('\n');
  }

  await transporter.sendMail({
    from: `"${BRAND.name}" <${config.EMAIL_USER}>`,
    to: config.EMAIL_USER,
    subject: getSubjectWithDate(),
    text: body,
  });

  console.log('Email sent successfully!');
}
