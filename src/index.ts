import { fetchTasks, rankTasks } from './tasks.js';
import { sendDailyFocusEmail } from './email.js';

async function main() {
  console.log('Daily Focus - Starting...\n');

  // Check if today is Saturday (skip)
  const today = new Date();
  if (today.getDay() === 6) {
    console.log('Saturday - skipping daily focus email.');
    return;
  }

  try {
    // Fetch and rank tasks
    console.log('Fetching tasks from Google Tasks...');
    const tasks = await fetchTasks();
    console.log(`Found ${tasks.length} uncompleted task(s).`);

    const rankedTasks = rankTasks(tasks);
    const top3 = rankedTasks.slice(0, 3);

    // Send email
    console.log('Sending daily focus email...');
    await sendDailyFocusEmail(top3, tasks.length);

    console.log('\nDaily Focus complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
