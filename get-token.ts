import { google } from 'googleapis';
import * as readline from 'readline';
import 'dotenv/config';

const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n========================================');
console.log('Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n========================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the authorization code here: ', async (code) => {
  rl.close();

  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    console.log('\n========================================');
    console.log('SUCCESS! Here is your refresh token:\n');
    console.log(tokens.refresh_token);
    console.log('\n========================================');
    console.log('\nAdd this to your .env file as GOOGLE_REFRESH_TOKEN');
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
  }
});
