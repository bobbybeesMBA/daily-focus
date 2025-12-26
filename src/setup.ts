import { google } from 'googleapis';
import * as readline from 'readline';
import 'dotenv/config';

// ════════════════════════════════════════════════════════════════════════════
// Task Dawn - Setup Wizard
// ════════════════════════════════════════════════════════════════════════════

const BRAND = {
  name: 'Task Dawn',
  tagline: 'Ignite your day with prioritized tasks in your inbox.',
  version: '1.0.0-alpha',
};

const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

const c = colors;

function print(text: string = '') {
  console.log(text);
}

function printHeader() {
  print();
  print(`${c.cyan}${c.bright}  ╔════════════════════════════════════════════════════════╗${c.reset}`);
  print(`${c.cyan}${c.bright}  ║                                                        ║${c.reset}`);
  print(`${c.cyan}${c.bright}  ║              ${c.yellow}TASK DAWN${c.cyan} - Setup Wizard               ║${c.reset}`);
  print(`${c.cyan}${c.bright}  ║                                                        ║${c.reset}`);
  print(`${c.cyan}${c.bright}  ║   ${c.reset}${c.dim}Ignite your day with prioritized tasks in your inbox${c.cyan}${c.bright}  ║${c.reset}`);
  print(`${c.cyan}${c.bright}  ║                                                        ║${c.reset}`);
  print(`${c.cyan}${c.bright}  ╚════════════════════════════════════════════════════════╝${c.reset}`);
  print();
}

function printStep(step: number, total: number, title: string) {
  print();
  print(`${c.cyan}${c.bright}  ┌─────────────────────────────────────────────────────────┐${c.reset}`);
  print(`${c.cyan}${c.bright}  │  ${c.yellow}STEP ${step}/${total}${c.cyan}: ${c.reset}${c.bright}${title.padEnd(42)}${c.cyan}${c.bright}│${c.reset}`);
  print(`${c.cyan}${c.bright}  └─────────────────────────────────────────────────────────┘${c.reset}`);
  print();
}

function printInfo(text: string) {
  print(`  ${c.dim}${text}${c.reset}`);
}

function printSuccess(text: string) {
  print(`  ${c.green}✓${c.reset} ${text}`);
}

function printWarning(text: string) {
  print(`  ${c.yellow}!${c.reset} ${text}`);
}

function printBullet(text: string) {
  print(`    ${c.dim}•${c.reset} ${text}`);
}

function printCode(text: string) {
  print(`    ${c.magenta}${text}${c.reset}`);
}

function printDivider() {
  print(`  ${c.dim}${'─'.repeat(55)}${c.reset}`);
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`  ${c.yellow}?${c.reset} ${question}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function pressEnterToContinue(rl: readline.Interface): Promise<void> {
  await prompt(rl, `Press ${c.bright}Enter${c.reset} to continue...`);
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    printHeader();

    print(`  Welcome to the ${c.bright}${BRAND.name}${c.reset} Alpha Kit setup wizard!`);
    print();
    print(`  ${c.bright}What is ${BRAND.name}?${c.reset}`);
    printInfo('Inbox Ignite aggregates tasks from Google and iCloud, ranks');
    printInfo('by urgency, age, and your settings, then emails a top 3');
    printInfo('summary every weekday morning - no new apps, just enhanced routine.');
    print();
    printDivider();
    print();
    print(`  This wizard will guide you through:`);
    printBullet('Setting up the iCloud-to-Google bridge (via IFTTT)');
    printBullet('Creating your Google Cloud credentials');
    printBullet('Authenticating to get your Refresh Token');
    printBullet('Generating your GitHub Secrets');
    print();

    await pressEnterToContinue(rl);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 1: iCloud-to-Google Bridge
    // ══════════════════════════════════════════════════════════════════════
    printStep(1, 4, 'iCloud-to-Google Bridge (IFTTT)');

    print(`  ${c.bright}Why do we need this?${c.reset}`);
    printInfo('Task Dawn reads from Google Tasks. To include your iCloud');
    printInfo('Reminders, we use IFTTT to sync them automatically.');
    print();

    print(`  ${c.bright}Setup Instructions:${c.reset}`);
    print();
    printBullet(`Go to ${c.cyan}https://ifttt.com${c.reset} and create a free account`);
    printBullet('Click "Create" to make a new Applet');
    printBullet(`For "If This": Choose ${c.bright}iOS Reminders${c.reset}`);
    printBullet(`   Select "New reminder added to list"${c.reset}`);
    printBullet(`   Choose the list you want to sync (e.g., "Reminders")`);
    printBullet(`For "Then That": Choose ${c.bright}Google Tasks${c.reset}`);
    printBullet(`   Select "Create task in task list"${c.reset}`);
    printBullet(`   Choose or create a list (e.g., "iCloud Sync")`);
    printBullet('Save and enable the Applet');
    print();

    printWarning('Repeat for each iCloud Reminders list you want to sync.');
    print();
    printDivider();
    print();

    const hasIfttt = await prompt(rl, `Have you set up IFTTT? (${c.bright}y${c.reset}/n/skip): `);

    if (hasIfttt.toLowerCase() === 'n') {
      printInfo('No problem! You can set this up later.');
      printInfo('Task Dawn will work with just Google Tasks for now.');
    } else if (hasIfttt.toLowerCase() === 'skip') {
      printInfo('Skipping iCloud integration - using Google Tasks only.');
    } else {
      printSuccess('iCloud-to-Google bridge configured!');
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 2: Google Cloud Credentials
    // ══════════════════════════════════════════════════════════════════════
    printStep(2, 4, 'Google Cloud Credentials');

    print(`  ${c.bright}Create a Google Cloud Project:${c.reset}`);
    print();
    printBullet(`Go to ${c.cyan}https://console.cloud.google.com${c.reset}`);
    printBullet('Create a new project (e.g., "Task Dawn")');
    printBullet(`Enable the ${c.bright}Google Tasks API${c.reset}:`);
    printCode('APIs & Services > Library > Search "Tasks API" > Enable');
    print();

    print(`  ${c.bright}Create OAuth 2.0 Credentials:${c.reset}`);
    print();
    printBullet('Go to APIs & Services > Credentials');
    printBullet('Click "Create Credentials" > "OAuth client ID"');
    printBullet('If prompted, configure the OAuth consent screen:');
    printCode('User Type: External > App Name: "Task Dawn"');
    printCode('Add your email as a test user');
    printBullet('For Application type, choose "Desktop app"');
    printBullet('Name it "Task Dawn CLI"');
    printBullet('Download the JSON or copy the Client ID and Secret');
    print();
    printDivider();
    print();

    const clientId = await prompt(rl, `Enter your ${c.bright}Google Client ID${c.reset}: `);
    if (!clientId) {
      print();
      printWarning('No Client ID provided. Please re-run setup when ready.');
      rl.close();
      return;
    }

    const clientSecret = await prompt(rl, `Enter your ${c.bright}Google Client Secret${c.reset}: `);
    if (!clientSecret) {
      print();
      printWarning('No Client Secret provided. Please re-run setup when ready.');
      rl.close();
      return;
    }

    printSuccess('Google credentials captured!');

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3: OAuth Authentication
    // ══════════════════════════════════════════════════════════════════════
    printStep(3, 4, 'OAuth Authentication');

    print(`  ${c.bright}Getting your Refresh Token:${c.reset}`);
    printInfo('We need to authenticate with Google to get a long-lived');
    printInfo('refresh token that Task Dawn will use to access your tasks.');
    print();

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });

    print(`  ${c.bright}Open this URL in your browser:${c.reset}`);
    print();
    print(`  ${c.cyan}${authUrl}${c.reset}`);
    print();
    printInfo('Sign in with your Google account and authorize the app.');
    printInfo('You will receive an authorization code.');
    print();
    printDivider();
    print();

    const authCode = await prompt(rl, `Paste the ${c.bright}authorization code${c.reset} here: `);
    if (!authCode) {
      print();
      printWarning('No authorization code provided. Please re-run setup.');
      rl.close();
      return;
    }

    print();
    printInfo('Exchanging code for tokens...');

    let refreshToken: string;
    try {
      const { tokens } = await oauth2Client.getToken(authCode);
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received');
      }
      refreshToken = tokens.refresh_token;
      printSuccess('Authentication successful!');
    } catch (error: any) {
      print();
      print(`  ${c.red}Error:${c.reset} ${error.message || 'Failed to exchange code'}`);
      printInfo('Please ensure the code is correct and try again.');
      rl.close();
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 4: Email Configuration & Output
    // ══════════════════════════════════════════════════════════════════════
    printStep(4, 4, 'Email Configuration');

    print(`  ${c.bright}Gmail App Password Setup:${c.reset}`);
    print();
    printBullet(`Go to ${c.cyan}https://myaccount.google.com/apppasswords${c.reset}`);
    printBullet('Generate a new app password for "Mail"');
    printBullet('Copy the 16-character password (no spaces needed)');
    print();
    printWarning('You must have 2-Step Verification enabled for App Passwords.');
    print();
    printDivider();
    print();

    const emailUser = await prompt(rl, `Enter your ${c.bright}Gmail address${c.reset}: `);
    if (!emailUser) {
      printWarning('No email provided. You can add it manually later.');
    }

    const emailPass = await prompt(rl, `Enter your ${c.bright}Gmail App Password${c.reset}: `);
    if (!emailPass) {
      printWarning('No app password provided. You can add it manually later.');
    }

    // ══════════════════════════════════════════════════════════════════════
    // FINAL OUTPUT
    // ══════════════════════════════════════════════════════════════════════
    print();
    print(`${c.green}${c.bright}  ╔════════════════════════════════════════════════════════╗${c.reset}`);
    print(`${c.green}${c.bright}  ║                                                        ║${c.reset}`);
    print(`${c.green}${c.bright}  ║                    SETUP COMPLETE!                     ║${c.reset}`);
    print(`${c.green}${c.bright}  ║                                                        ║${c.reset}`);
    print(`${c.green}${c.bright}  ╚════════════════════════════════════════════════════════╝${c.reset}`);
    print();

    // .env file content
    print(`  ${c.bright}${c.yellow}LOCAL DEVELOPMENT (.env file):${c.reset}`);
    print(`  ${c.dim}Copy this to your .env file:${c.reset}`);
    print();
    print(`${c.cyan}  ┌──────────────────────────────────────────────────────────┐${c.reset}`);
    print(`${c.cyan}  │${c.reset} GOOGLE_CLIENT_ID=${clientId}`);
    print(`${c.cyan}  │${c.reset} GOOGLE_CLIENT_SECRET=${clientSecret}`);
    print(`${c.cyan}  │${c.reset} GOOGLE_REFRESH_TOKEN=${refreshToken}`);
    if (emailUser) print(`${c.cyan}  │${c.reset} EMAIL_USER=${emailUser}`);
    if (emailPass) print(`${c.cyan}  │${c.reset} EMAIL_PASS=${emailPass}`);
    print(`${c.cyan}  └──────────────────────────────────────────────────────────┘${c.reset}`);
    print();

    // GitHub Secrets
    print(`  ${c.bright}${c.yellow}GITHUB SECRETS (for automated runs):${c.reset}`);
    print(`  ${c.dim}Add these secrets to your GitHub repository:${c.reset}`);
    print(`  ${c.dim}Settings > Secrets and variables > Actions > New repository secret${c.reset}`);
    print();
    print(`${c.magenta}  ┌──────────────────────────────────────────────────────────┐${c.reset}`);
    print(`${c.magenta}  │${c.reset} ${c.bright}Secret Name${c.reset}              ${c.bright}Value${c.reset}`);
    print(`${c.magenta}  │${c.reset} ─────────────────────────────────────────────────────────`);
    print(`${c.magenta}  │${c.reset} GOOGLE_CLIENT_ID         ${c.dim}${clientId.substring(0, 30)}...${c.reset}`);
    print(`${c.magenta}  │${c.reset} GOOGLE_CLIENT_SECRET     ${c.dim}${clientSecret.substring(0, 20)}...${c.reset}`);
    print(`${c.magenta}  │${c.reset} GOOGLE_REFRESH_TOKEN     ${c.dim}${refreshToken.substring(0, 20)}...${c.reset}`);
    if (emailUser) print(`${c.magenta}  │${c.reset} EMAIL_USER               ${c.dim}${emailUser}${c.reset}`);
    if (emailPass) print(`${c.magenta}  │${c.reset} EMAIL_PASS               ${c.dim}${'*'.repeat(16)}${c.reset}`);
    print(`${c.magenta}  └──────────────────────────────────────────────────────────┘${c.reset}`);
    print();

    // Copy-paste block
    print(`  ${c.bright}${c.yellow}COPY-PASTE BLOCK FOR GITHUB SECRETS:${c.reset}`);
    print();
    console.log('  ════════════════ START COPYING BELOW ════════════════');
    print();
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
    if (emailUser) console.log(`EMAIL_USER=${emailUser}`);
    if (emailPass) console.log(`EMAIL_PASS=${emailPass}`);
    print();
    console.log('  ════════════════ STOP COPYING ABOVE ════════════════');
    print();

    printDivider();
    print();
    print(`  ${c.bright}Next Steps:${c.reset}`);
    printBullet('Add the secrets to your GitHub repository');
    printBullet(`Test locally: ${c.cyan}npm run dev${c.reset}`);
    printBullet(`Push to GitHub to enable scheduled runs${c.reset}`);
    print();
    print(`  ${c.dim}Thank you for trying ${BRAND.name} Alpha!${c.reset}`);
    print(`  ${c.dim}${BRAND.tagline}${c.reset}`);
    print();

    rl.close();
  } catch (error) {
    console.error('Setup error:', error);
    rl.close();
    process.exit(1);
  }
}

main();
