# Task Dawn - Python Multi-User Implementation

Python version of Task Dawn that processes multiple users from a `users.json` file.

## Features

- **Multi-User Support**: Process multiple users in a single run
- **Fault Tolerance**: One user's failure doesn't crash other users
- **Google Tasks API**: Fetch and rank tasks using the Ignite algorithm
- **Auto-Create Sync List**: Creates "Task Dawn Sync" list automatically
- **Gmail SMTP**: Send emails via Gmail App Passwords

## Setup

### 1. Install Dependencies

```bash
cd python
pip install -r requirements.txt
```

### 2. Create User Configuration

Copy the example file and add your users:

```bash
cp users.json.example users.json
```

Edit `users.json` with real credentials:

```json
[
  {
    "name": "John Doe",
    "email": "john@gmail.com",
    "google_client_id": "123456789.apps.googleusercontent.com",
    "google_client_secret": "GOCSPX-your-secret-here",
    "google_refresh_token": "1//your-refresh-token-here",
    "email_app_password": "xxxx xxxx xxxx xxxx"
  }
]
```

### 3. Run the Script

```bash
python task_dawn.py
```

## Credentials Guide

### Google OAuth Credentials

Each user needs:
- **Client ID** - From Google Cloud Console
- **Client Secret** - From Google Cloud Console
- **Refresh Token** - From OAuth flow (run TypeScript setup wizard)

You can either:
- **Option A**: Each user has their own Google Cloud project (separate Client ID/Secret)
- **Option B**: Share one Google Cloud project (same Client ID/Secret, different Refresh Tokens)

### Gmail App Password

Each user needs a Gmail App Password:
1. Go to https://myaccount.google.com/apppasswords
2. Enable 2-Step Verification (if not already)
3. Generate app password for "Mail"
4. Copy the 16-character password

## How It Works

For each user in `users.json`:

1. **Authenticate** with Google using their refresh token
2. **Ensure Sync List** exists (auto-create if missing)
3. **Fetch Tasks** from all task lists
4. **Rank Tasks** using Ignite algorithm:
   - Priority 1: "URGENT" in title
   - Priority 2: Overdue tasks
   - Priority 3: Oldest first (FIFO)
5. **Send Email** with top 3 tasks

## Error Handling

- Each user is processed independently
- Errors are logged but don't stop other users
- Final summary shows success/error counts

## Schedule with Cron

Run weekdays at 12:00 UTC:

```cron
0 12 * * 1-5 cd /path/to/daily-focus/python && python task_dawn.py
```

## Security

- `users.json` is gitignored (contains secrets)
- Never commit credentials to git
- Use Gmail App Passwords (not your main password)

## Ignite Ranking Algorithm

Tasks are sorted by:

| Priority | Criteria | Example |
|----------|----------|---------|
| 1 | "URGENT" in title | "URGENT: Call client" |
| 2 | Overdue (due < today) | Due Dec 20 (today is Dec 25) |
| 3 | Oldest created first | Created 5 days ago > yesterday |

## Email Format

```
Task Dawn
═══════════════════════════════════════

TOP PRIORITY
>>> URGENT: Submit proposal <<<

───────────────────────────────────────
STRETCH GOALS
  2. Review PR (Due: Dec 26)
  3. Update documentation

───────────────────────────────────────
12 tasks in queue

Ignite your day with prioritized tasks in your inbox.
```
