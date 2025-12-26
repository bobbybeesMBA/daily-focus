# Task Dawn

**Ignite your day with prioritized tasks in your inbox.**

Task Dawn aggregates tasks from Google Tasks and iCloud Reminders, ranks them by urgency, age, and your settings, then emails a top 3 summary every weekday morning - no new apps, just enhanced routine.

## Features

- **Multi-Source Aggregation**: Pulls from all Google Task lists, including iCloud Reminders synced via IFTTT
- **Smart Ranking**: Prioritizes tasks by:
  1. `URGENT` keyword in title (case-insensitive)
  2. Overdue due dates
  3. FIFO (oldest created first)
- **Daily Digest**: Top 3 tasks delivered to your inbox every weekday
- **Zero App Switching**: Works entirely through email and existing task apps

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Setup Wizard

```bash
npm run setup
```

The wizard will guide you through:
- Setting up the iCloud-to-Google bridge (IFTTT)
- Creating Google Cloud credentials
- Authenticating to get your Refresh Token
- Generating GitHub Secrets for automation

### 3. Test Locally

```bash
npm start
```

### 4. Deploy to GitHub Actions

Push to GitHub and add the secrets from the setup wizard:

```
Settings > Secrets and variables > Actions > New repository secret
```

Required secrets:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `EMAIL_USER`
- `EMAIL_PASS`

The workflow runs automatically at 12:00 UTC on weekdays.

## iCloud Integration

Task Dawn reads from Google Tasks. To include iCloud Reminders:

1. Create a free [IFTTT](https://ifttt.com) account
2. Create an Applet:
   - **If This**: iOS Reminders > New reminder added to list
   - **Then That**: Google Tasks > Create task in task list
3. Repeat for each iCloud list you want to sync

## Ranking Algorithm

Tasks are sorted in this priority order:

| Priority | Criteria | Example |
|----------|----------|---------|
| 1 | Title contains "URGENT" | "URGENT: Call client" |
| 2 | Due date is in the past | Due: Dec 20 (today is Dec 25) |
| 3 | Oldest created first | Created 5 days ago beats yesterday |

## Email Format

```
Task Dawn
=======================================

TOP PRIORITY
>>> URGENT: Submit proposal <<<

---------------------------------------
STRETCH GOALS
  2. Review PR from Alex (Due: Dec 26)
  3. Update documentation

---------------------------------------
12 tasks in queue

Ignite your day with prioritized tasks in your inbox.
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Run the interactive setup wizard |
| `npm start` | Run Task Dawn (send daily email) |
| `npm run dev` | Development mode (uses tsx) |
| `npm run build` | Rebuild from source |
| `npm run release` | Clean build for distribution |

## Project Structure

```
task-dawn/
├── dist/                 # Pre-built, ready to run
│   ├── main/             # Main application
│   │   └── index.js
│   └── setup/            # Setup wizard
│       └── index.js
├── src/                  # Source code (TypeScript)
│   ├── index.ts          # Main entry point
│   ├── setup.ts          # Setup wizard
│   ├── tasks.ts          # Google Tasks API + ranking
│   ├── email.ts          # Email formatting + sending
│   └── config.ts         # Environment validation
├── .github/
│   └── workflows/
│       └── daily_focus.yml
├── .env.example          # Template for credentials
└── .env                  # Your credentials (not committed)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token |
| `EMAIL_USER` | Gmail address for sending |
| `EMAIL_PASS` | Gmail App Password |

## Alpha Notes

This is an alpha release. Please report issues and feedback.

---

**Task Dawn** - Ignite your day with prioritized tasks in your inbox.
