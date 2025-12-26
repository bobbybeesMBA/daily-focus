import { fetchTasks, rankTasks } from './tasks.js';
import { sendDailyFocusEmail } from './email.js';

const BRAND = {
  name: 'Task Dawn',
  tagline: 'Ignite your day with prioritized tasks in your inbox.',
};

async function main() {
  console.log(`\n  ${BRAND.name}`);
  console.log(`  ${BRAND.tagline}\n`);
  console.log('─'.repeat(50));

  // Check if today is Saturday (skip weekends)
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  if (today.getDay() === 0 || today.getDay() === 6) {
    console.log(`${dayName} - skipping (weekdays only).`);
    return;
  }

  try {
    // Fetch and rank tasks from ALL lists (including iCloud-synced)
    console.log('Fetching tasks from Google Tasks...');
    const tasks = await fetchTasks();
    console.log(`Found ${tasks.length} uncompleted task(s) across all lists.`);

    const rankedTasks = rankTasks(tasks);
    const top3 = rankedTasks.slice(0, 3);

    if (top3.length > 0) {
      console.log('\nTop 3 ranked tasks:');
      top3.forEach((t, i) => console.log(`  ${i + 1}. ${t.title}`));
    }

    // Send email
    console.log('\nSending daily digest...');
    await sendDailyFocusEmail(top3, tasks.length);

    console.log('─'.repeat(50));
    console.log(`${BRAND.name} complete!\n`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
