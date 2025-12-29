import { google } from 'googleapis';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import 'dotenv/config';

// ════════════════════════════════════════════════════════════════════════════
// Task Dawn - Browser-Based Setup Wizard
// ════════════════════════════════════════════════════════════════════════════

const BRAND = {
  name: 'Task Dawn',
  tagline: 'Ignite your day with prioritized tasks in your inbox.',
  version: '1.0.0-alpha',
};

const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];
const PORT = 3847;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

// Store collected data during setup
let setupData: {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  emailUser?: string;
  emailPass?: string;
} = {};

// ════════════════════════════════════════════════════════════════════════════
// HTML Template for Setup Wizard
// ════════════════════════════════════════════════════════════════════════════

function getWizardHtml(step: number = 1, error?: string, authUrl?: string): string {
  const navItems = [
    { num: 1, label: 'Welcome', href: '/step/1' },
    { num: 2, label: 'Credentials', href: '/step/2' },
    { num: 3, label: 'Authorization', href: '/step/3' },
    { num: 4, label: 'Email Setup', href: '/step/4' },
    { num: 5, label: 'Finish', href: '/step/5' },
  ];

  const sidebar = navItems.map(item => {
    const isCurrent = item.num === step;
    const isAccessible = item.num <= step;
    const marker = item.num < step ? '<font color="#009900">&#10004;</font>' : '&raquo;';
    if (isAccessible) {
      return `<div class="nav-item${isCurrent ? ' current' : ''}">
        ${marker} <a href="${item.href}">[${item.label}]</a>
      </div>`;
    }
    return `<div class="nav-item disabled">${marker} [${item.label}]</div>`;
  }).join('\n');

  let content = '';

  switch (step) {
    case 1:
      content = `
        <fieldset>
          <legend><b>Welcome</b></legend>
          <font size="2">
            This wizard will configure Task Dawn on your machine.
          </font>
        </fieldset>
        <br>
        <div align="center">
          <form action="/step/2" method="GET" style="display: inline;">
            <button type="submit" class="btn btn-primary">[ CONTINUE &gt;&gt; ]</button>
          </form>
        </div>`;
      break;

    case 2:
      content = `
        ${error ? `
        <table border="0" cellpadding="6" cellspacing="0" bgcolor="#FFCCCC" style="border: 2px solid #CC0000;" width="100%">
          <tr><td><font size="2" color="#CC0000"><b>Error:</b> ${error}</font></td></tr>
        </table>
        <br>` : ''}
        <fieldset>
          <legend><b>Instructions</b></legend>
          <font size="2">
            <ol>
              <li>Go to <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></li>
              <li>Create a new project (e.g., "Task Dawn")</li>
              <li>Enable the <b>Google Tasks API</b>:<br>
                <code style="background:#E0E0E0; padding:2px 4px;">APIs &amp; Services &rarr; Library &rarr; Search "Tasks API" &rarr; Enable</code>
              </li>
              <li>Create OAuth credentials:<br>
                <code style="background:#E0E0E0; padding:2px 4px;">APIs &amp; Services &rarr; Credentials &rarr; Create Credentials &rarr; OAuth client ID</code>
              </li>
              <li>Application type: <b>Web application</b></li>
              <li>Add authorized redirect URI:<br>
                <table border="0" cellpadding="4" bgcolor="#F0F0F0" style="border: 1px inset #333333;">
                  <tr><td><code>http://localhost:${PORT}/oauth/callback</code></td></tr>
                </table>
              </li>
            </ol>
          </font>
        </fieldset>
        <br>
        <fieldset>
          <legend><b>Enter Your Credentials</b></legend>
          <form action="/api/credentials" method="POST">
            <table border="0" cellpadding="6" cellspacing="0" width="100%">
              <tr>
                <td width="120"><font size="2"><b>Client ID:</b></font></td>
                <td><input type="text" name="clientId" required value="${setupData.clientId || ''}" class="input-field" style="width: 100%;"></td>
              </tr>
              <tr><td colspan="2" height="4"></td></tr>
              <tr>
                <td><font size="2"><b>Client Secret:</b></font></td>
                <td><input type="password" name="clientSecret" required value="${setupData.clientSecret || ''}" class="input-field" style="width: 100%;"></td>
              </tr>
            </table>
            <br>
            <div align="center">
              <a href="/step/1" class="btn btn-secondary">[ &lt;&lt; BACK ]</a>
              &nbsp;
              <button type="submit" class="btn btn-primary">[ CONTINUE &gt;&gt; ]</button>
            </div>
          </form>
        </fieldset>`;
      break;

    case 3:
      content = `
        ${error ? `
        <table border="0" cellpadding="6" cellspacing="0" bgcolor="#FFCCCC" style="border: 2px solid #CC0000;" width="100%">
          <tr><td><font size="2" color="#CC0000"><b>Error:</b> ${error}</font></td></tr>
        </table>
        <br>` : ''}
        <fieldset>
          <legend><b>Google Authorization</b></legend>
          <font size="2">
            <p>Click the button below to sign in with Google and authorize access to your tasks.</p>
            <p>A new window will open. After you approve, this page will automatically continue.</p>
          </font>
          <br>
          <div align="center">
            <a href="${authUrl}" target="_blank" class="btn btn-primary" style="padding: 10px 20px;">[ SIGN IN WITH GOOGLE ]</a>
            <br><br>
            <table border="0" cellpadding="8" cellspacing="0" bgcolor="#FFFFCC" style="border: 3px double #CC9900;">
              <tr>
                <td align="center">
                  <font size="2"><b>Waiting for authorization...</b></font>
                </td>
              </tr>
            </table>
          </div>
        </fieldset>
        <br>
        <div align="center">
          <a href="/step/2" class="btn btn-secondary">[ &lt;&lt; BACK ]</a>
        </div>
        <script>
          setInterval(async () => {
            try {
              const res = await fetch('/api/check-auth');
              const data = await res.json();
              if (data.authenticated) window.location.href = '/step/4';
            } catch (e) {}
          }, 2000);
        </script>`;
      break;

    case 4:
      content = `
        <table border="0" cellpadding="4" cellspacing="0" bgcolor="#CCFFCC" style="border: 2px solid #009900;" width="100%">
          <tr><td><font size="2" color="#006600"><b>&#10004;</b> Google authorization successful!</font></td></tr>
        </table>
        <br>
        ${error ? `
        <table border="0" cellpadding="6" cellspacing="0" bgcolor="#FFCCCC" style="border: 2px solid #CC0000;" width="100%">
          <tr><td><font size="2" color="#CC0000"><b>Error:</b> ${error}</font></td></tr>
        </table>
        <br>` : ''}
        <fieldset>
          <legend><b>Gmail App Password Setup</b></legend>
          <font size="2">
            <ol>
              <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank">Google App Passwords</a></li>
              <li>You must have 2-Step Verification enabled</li>
              <li>Generate a new app password for "Mail"</li>
              <li>Copy the 16-character password below</li>
            </ol>
          </font>
        </fieldset>
        <br>
        <fieldset>
          <legend><b>Enter Email Settings</b></legend>
          <form action="/api/email" method="POST">
            <table border="0" cellpadding="6" cellspacing="0" width="100%">
              <tr>
                <td width="120"><font size="2"><b>Gmail Address:</b></font></td>
                <td><input type="email" name="emailUser" value="${setupData.emailUser || ''}" class="input-field" style="width: 100%;"></td>
              </tr>
              <tr><td colspan="2" height="4"></td></tr>
              <tr>
                <td><font size="2"><b>App Password:</b></font></td>
                <td><input type="password" name="emailPass" value="${setupData.emailPass || ''}" class="input-field" style="width: 100%;"></td>
              </tr>
            </table>
            <br>
            <font size="1" color="#666666"><i>* These fields are optional. You can configure them later in the .env file.</i></font>
            <br><br>
            <div align="center">
              <a href="/step/3" class="btn btn-secondary">[ &lt;&lt; BACK ]</a>
              &nbsp;
              <button type="submit" class="btn btn-primary">[ CONTINUE &gt;&gt; ]</button>
            </div>
          </form>
        </fieldset>`;
      break;

    case 5:
      const envPath = path.join(process.cwd(), '.env');
      content = `
        <fieldset>
          <legend><b>Setup Complete</b></legend>
          <table border="0" cellpadding="8" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <font size="5" color="#009900"><b>&#10004;</b></font>
                &nbsp;
                <font size="2"><b>Task Dawn has been configured successfully.</b></font>
              </td>
            </tr>
          </table>
        </fieldset>
        <br>
        <table border="0" cellpadding="6" cellspacing="0" bgcolor="#CCFFCC" style="border: 2px solid #009900;" width="100%">
          <tr><td><font size="2" color="#006600"><b>&#10004;</b> Configuration saved to: <code>${envPath}</code></font></td></tr>
        </table>
        <br>
        <fieldset>
          <legend><b>GitHub Secrets</b></legend>
          <font size="2">
            <p>Add these secrets to your GitHub repository for automated runs:<br>
            <i>Settings &rarr; Secrets and variables &rarr; Actions &rarr; New repository secret</i></p>
          </font>
          <br>
          <table border="1" bordercolor="#999999" cellpadding="5" cellspacing="0" width="100%">
            <tr bgcolor="#E0E0E0">
              <th align="left"><font size="2">Secret Name</font></th>
              <th align="left"><font size="2">Value</font></th>
            </tr>
            <tr bgcolor="#FFFFFF">
              <td><code>GOOGLE_CLIENT_ID</code></td>
              <td><font size="1">${setupData.clientId?.substring(0, 35)}...</font></td>
            </tr>
            <tr bgcolor="#F5F5F5">
              <td><code>GOOGLE_CLIENT_SECRET</code></td>
              <td><font size="1">${setupData.clientSecret?.substring(0, 20)}...</font></td>
            </tr>
            <tr bgcolor="#FFFFFF">
              <td><code>GOOGLE_REFRESH_TOKEN</code></td>
              <td><font size="1">${setupData.refreshToken?.substring(0, 20)}...</font></td>
            </tr>
            ${setupData.emailUser ? `<tr bgcolor="#F5F5F5"><td><code>EMAIL_USER</code></td><td><font size="1">${setupData.emailUser}</font></td></tr>` : ''}
            ${setupData.emailPass ? `<tr bgcolor="#FFFFFF"><td><code>EMAIL_PASS</code></td><td><font size="1">****************</font></td></tr>` : ''}
          </table>
        </fieldset>
        <br>
        <fieldset>
          <legend><b>Next Steps</b></legend>
          <font size="2">
            <ol>
              <li>Test locally: <code style="background:#E0E0E0; padding:2px 4px;">npm start</code></li>
              <li>Add the secrets above to your GitHub repository</li>
              <li>Set up GitHub Actions for automated daily emails</li>
            </ol>
          </font>
        </fieldset>
        <br>
        <div align="center">
          <form action="/api/finish" method="POST" style="display: inline;">
            <button type="submit" class="btn btn-primary" style="background: #669966;">[ FINISH ]</button>
          </form>
        </div>`;
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name} Setup Wizard</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #CCCCCC;
      font-family: Tahoma, Arial, "MS Sans Serif", sans-serif;
      font-size: 12px;
      color: #000000;
    }

    a:link { color: #0000FF; }
    a:visited { color: #800080; }
    a:hover { color: #FF0000; }

    .page-container {
      width: 800px;
      margin: 0 auto;
      background: #F0F0F0;
      border: 2px groove #CCCCCC;
    }

    .header {
      background: linear-gradient(to bottom, #003399 0%, #000066 100%);
      color: white;
      padding: 12px 16px;
      border-bottom: 2px groove #CCCCCC;
    }

    .header-title {
      font-family: "Times New Roman", Times, serif;
      font-size: 24px;
      font-weight: bold;
      color: #FFCC00;
      text-shadow: 2px 2px 0 #000033;
    }

    .header-subtitle {
      font-size: 11px;
      color: #CCCCFF;
      margin-top: 4px;
    }

    .main-layout {
      display: flex;
    }

    .sidebar {
      width: 150px;
      background: #E8E8E8;
      border-right: 2px groove #CCCCCC;
      padding: 0;
    }

    .sidebar fieldset {
      margin: 8px;
      padding: 8px;
      border: 2px groove #CCCCCC;
    }

    .sidebar legend {
      color: #003399;
      font-weight: bold;
      font-size: 11px;
    }

    .nav-item {
      padding: 4px 0;
      font-size: 11px;
    }

    .nav-item.current {
      font-weight: bold;
    }

    .nav-item.current a {
      color: #003399;
    }

    .nav-item.disabled {
      color: #999999;
    }

    .nav-item a {
      text-decoration: none;
    }

    .nav-item a:hover {
      text-decoration: underline;
    }

    .content {
      flex: 1;
      padding: 16px;
      min-height: 500px;
    }

    fieldset {
      border: 2px groove #CCCCCC;
      margin-bottom: 0;
      padding: 12px;
      background: #FFFFFF;
    }

    legend {
      color: #003399;
      padding: 0 8px;
    }

    .btn {
      font-family: Tahoma, Arial, sans-serif;
      font-size: 12px;
      font-weight: bold;
      padding: 6px 16px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: #003399;
      color: white;
      border: 2px outset #6699CC;
    }

    .btn-primary:hover {
      background: #002266;
      border-style: inset;
    }

    .btn-primary:active {
      border-style: inset;
    }

    .btn-secondary {
      background: #E0E0E0;
      color: #333333;
      border: 2px outset #FFFFFF;
    }

    .btn-secondary:hover {
      background: #D0D0D0;
      border-style: inset;
    }

    .input-field {
      font-family: Tahoma, Arial, sans-serif;
      font-size: 12px;
      padding: 4px;
      border: 1px inset #333333;
      background: #FFFFFF;
    }

    .input-field:focus {
      background: #FFFFEE;
    }

    code {
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
    }

    .footer {
      background: #E0E0E0;
      border-top: 2px groove #CCCCCC;
      padding: 8px 16px;
      text-align: center;
    }

    .footer a {
      font-size: 10px;
    }

      </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div class="header-title">&#9728; ${BRAND.name}</div>
      <div class="header-subtitle">Setup Wizard</div>
    </div>
    <div class="main-layout">
      <div class="sidebar">
        <fieldset>
          <legend>Steps</legend>
          ${sidebar}
        </fieldset>
      </div>
      <div class="content">
        ${content}
      </div>
    </div>
    <div class="footer">
      <font size="1">Task Dawn v${BRAND.version}</font>
    </div>
  </div>
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════════
// HTTP Server
// ════════════════════════════════════════════════════════════════════════════

function parseFormData(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

function saveEnvFile(): void {
  const envContent = [
    '# ═══════════════════════════════════════════════════════════',
    '# Task Dawn - Configuration',
    '# Generated by setup wizard',
    '# ═══════════════════════════════════════════════════════════',
    '',
    '# Google OAuth2 Credentials',
    `GOOGLE_CLIENT_ID=${setupData.clientId || ''}`,
    `GOOGLE_CLIENT_SECRET=${setupData.clientSecret || ''}`,
    `GOOGLE_REFRESH_TOKEN=${setupData.refreshToken || ''}`,
    '',
    '# Email Configuration (Gmail)',
    `EMAIL_USER=${setupData.emailUser || ''}`,
    `EMAIL_PASS=${setupData.emailPass || ''}`,
    '',
  ].join('\n');

  const envPath = path.join(process.cwd(), '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
}

async function startServer(): Promise<void> {
  let oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const method = req.method || 'GET';

    // Collect body for POST requests
    let body = '';
    if (method === 'POST') {
      for await (const chunk of req) {
        body += chunk;
      }
    }

    // Route handling
    try {
      // Home / Welcome
      if (url.pathname === '/' || url.pathname === '/step/1') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getWizardHtml(1));
        return;
      }

      // Step 2: Google Credentials Form
      if (url.pathname === '/step/2') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getWizardHtml(2));
        return;
      }

      // Step 3: OAuth Authorization
      if (url.pathname === '/step/3') {
        if (!setupData.clientId || !setupData.clientSecret) {
          res.writeHead(302, { Location: '/step/2' });
          res.end();
          return;
        }

        oauth2Client = new google.auth.OAuth2(
          setupData.clientId,
          setupData.clientSecret,
          REDIRECT_URI
        );

        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          prompt: 'consent',
          scope: SCOPES,
        });

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getWizardHtml(3, undefined, authUrl));
        return;
      }

      // Step 4: Email Configuration
      if (url.pathname === '/step/4') {
        if (!setupData.refreshToken) {
          res.writeHead(302, { Location: '/step/3' });
          res.end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getWizardHtml(4));
        return;
      }

      // Step 5: Complete
      if (url.pathname === '/step/5') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getWizardHtml(5));
        return;
      }

      // API: Save credentials
      if (url.pathname === '/api/credentials' && method === 'POST') {
        const data = parseFormData(body);
        if (!data.clientId || !data.clientSecret) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getWizardHtml(2, 'Please provide both Client ID and Client Secret.'));
          return;
        }
        setupData.clientId = data.clientId;
        setupData.clientSecret = data.clientSecret;
        res.writeHead(302, { Location: '/step/3' });
        res.end();
        return;
      }

      // OAuth Callback
      if (url.pathname === '/oauth/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getWizardHtml(3, `Authorization failed: ${error}`));
          return;
        }

        if (!code || !oauth2Client) {
          res.writeHead(302, { Location: '/step/3' });
          res.end();
          return;
        }

        try {
          const { tokens } = await oauth2Client.getToken(code);
          if (!tokens.refresh_token) {
            throw new Error('No refresh token received. Please try again.');
          }
          setupData.refreshToken = tokens.refresh_token;

          // Show success page that redirects
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authorization Successful</title>
              <style>
                body {
                  font-family: -apple-system, sans-serif;
                  background: #0f172a;
                  color: #f8fafc;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                }
                .card {
                  background: #1e293b;
                  padding: 48px;
                  border-radius: 16px;
                  text-align: center;
                }
                .success { color: #10b981; font-size: 48px; margin-bottom: 16px; }
                p { color: #94a3b8; margin-top: 8px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="success">✓</div>
                <h2>Authorization Successful!</h2>
                <p>You can close this tab and return to the setup wizard.</p>
              </div>
            </body>
            </html>
          `);
          return;
        } catch (err: any) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getWizardHtml(3, err.message || 'Failed to exchange authorization code.'));
          return;
        }
      }

      // API: Check auth status (for polling)
      if (url.pathname === '/api/check-auth') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: !!setupData.refreshToken }));
        return;
      }

      // API: Save email config
      if (url.pathname === '/api/email' && method === 'POST') {
        const data = parseFormData(body);
        setupData.emailUser = data.emailUser || '';
        setupData.emailPass = data.emailPass || '';
        saveEnvFile();
        res.writeHead(302, { Location: '/step/5' });
        res.end();
        return;
      }

      // API: Finish and close server
      if (url.pathname === '/api/finish' && method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Setup Complete</title>
            <style>
              body {
                font-family: -apple-system, sans-serif;
                background: #0f172a;
                color: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
              }
              .card {
                background: #1e293b;
                padding: 48px;
                border-radius: 16px;
                text-align: center;
              }
              .success { color: #10b981; font-size: 48px; margin-bottom: 16px; }
              p { color: #94a3b8; margin-top: 8px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="success">✓</div>
              <h2>Setup Complete!</h2>
              <p>You can close this browser tab.</p>
              <p>Return to your terminal to continue.</p>
            </div>
          </body>
          </html>
        `);

        // Close server after response
        setTimeout(() => {
          server.close();
          console.log('\n✓ Setup complete! Your .env file has been created.');
          console.log('  Run "npm start" to test your configuration.\n');
          process.exit(0);
        }, 500);
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (err: any) {
      console.error('Server error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              TASK DAWN - Setup Wizard                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

  Opening setup wizard in your browser...

  If it doesn't open automatically, visit:
  ${url}

  Press Ctrl+C to cancel setup.
`);

    // Open browser based on platform
    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
      command = `start "" "${url}"`;
    } else if (platform === 'darwin') {
      command = `open "${url}"`;
    } else {
      command = `xdg-open "${url}"`;
    }

    exec(command, (err) => {
      if (err) {
        console.log(`  Could not open browser automatically.`);
        console.log(`  Please open ${url} manually.\n`);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ════════════════════════════════════════════════════════════════════════════

startServer().catch((err) => {
  console.error('Failed to start setup wizard:', err);
  process.exit(1);
});
