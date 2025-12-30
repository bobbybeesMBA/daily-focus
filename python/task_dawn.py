#!/usr/bin/env python3
"""
Task Dawn - Multi-User Python Implementation
Ignite your day with prioritized tasks in your inbox.
"""

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import smtplib
from email.mime.text import MIMEText
import json
import os
from datetime import datetime, date
import time
from typing import List, Dict, Optional, Any

# ════════════════════════════════════════════════════════════════════════════
# Constants
# ════════════════════════════════════════════════════════════════════════════

SYNC_LIST_NAME = "Task Dawn Sync"
BRAND_NAME = "Task Dawn"
BRAND_TAGLINE = "Ignite your day with prioritized tasks in your inbox."

# ════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ════════════════════════════════════════════════════════════════════════════

def with_retry(fn, max_retries=3, base_delay=1):
    """Retry a function with exponential backoff."""
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except HttpError as e:
            status = e.resp.status
            is_retryable = status == 429 or (500 <= status < 600)

            if not is_retryable or attempt == max_retries:
                raise

            delay = base_delay * (2 ** attempt)
            print(f"  Retrying in {delay}s (attempt {attempt + 1}/{max_retries})...")
            time.sleep(delay)
        except Exception as e:
            if attempt == max_retries:
                raise
            delay = base_delay * (2 ** attempt)
            time.sleep(delay)

    raise Exception("Max retries exceeded")

# ════════════════════════════════════════════════════════════════════════════
# User Management
# ════════════════════════════════════════════════════════════════════════════

def load_users() -> List[Dict[str, str]]:
    """Load users from users.json file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    users_file = os.path.join(script_dir, 'users.json')

    if not os.path.exists(users_file):
        raise FileNotFoundError(
            f"users.json not found at {users_file}\n"
            f"Copy users.json.example to users.json and add your credentials."
        )

    with open(users_file, 'r') as f:
        users = json.load(f)

    if not isinstance(users, list) or len(users) == 0:
        raise ValueError("users.json must contain a non-empty array of user objects")

    return users

# ════════════════════════════════════════════════════════════════════════════
# Google Tasks API
# ════════════════════════════════════════════════════════════════════════════

def get_tasks_service(user: Dict[str, str]):
    """Create authenticated Google Tasks API service for a user."""
    creds = Credentials(
        token=None,
        refresh_token=user['google_refresh_token'],
        client_id=user['google_client_id'],
        client_secret=user['google_client_secret'],
        token_uri='https://oauth2.googleapis.com/token',
        scopes=['https://www.googleapis.com/auth/tasks.readonly']
    )

    return build('tasks', 'v1', credentials=creds)

def get_all_task_lists(service) -> List[Dict[str, str]]:
    """Get all task lists for a user."""
    def fetch():
        result = service.tasklists().list().execute()
        return result.get('items', [])

    items = with_retry(fetch)

    task_lists = []
    for item in items:
        if 'id' in item and 'title' in item:
            task_lists.append({'id': item['id'], 'title': item['title']})

    return task_lists

def ensure_sync_list_exists(service) -> Dict[str, str]:
    """
    Ensure the 'Task Dawn Sync' list exists.
    Creates it automatically on first run if it doesn't exist.
    """
    task_lists = get_all_task_lists(service)

    # Check if sync list already exists
    for task_list in task_lists:
        if task_list['title'] == SYNC_LIST_NAME:
            print(f"  Sync list \"{SYNC_LIST_NAME}\" found.")
            return task_list

    # Create sync list
    print(f"  Creating sync list \"{SYNC_LIST_NAME}\"...")

    def create():
        return service.tasklists().insert(
            body={'title': SYNC_LIST_NAME}
        ).execute()

    new_list = with_retry(create)

    if 'id' not in new_list or 'title' not in new_list:
        raise Exception("Failed to create sync list")

    print(f"  Sync list \"{SYNC_LIST_NAME}\" created successfully.")
    return {'id': new_list['id'], 'title': new_list['title']}

def fetch_tasks(service) -> List[Dict[str, Any]]:
    """Fetch all uncompleted tasks from all task lists."""
    task_lists = get_all_task_lists(service)

    if len(task_lists) == 0:
        print("  No task lists found, using @default")
        task_lists = [{'id': '@default', 'title': 'Default'}]

    print(f"  Found {len(task_lists)} task list(s): {', '.join(t['title'] for t in task_lists)}")

    all_tasks = []

    for task_list in task_lists:
        try:
            def fetch_list():
                return service.tasks().list(
                    tasklist=task_list['id'],
                    showCompleted=False,
                    showHidden=False,
                    maxResults=100
                ).execute()

            result = with_retry(fetch_list)
            items = result.get('items', [])

            for item in items:
                if (item.get('status') == 'needsAction' and
                    'id' in item and
                    'title' in item):
                    all_tasks.append({
                        'id': item['id'],
                        'title': item['title'],
                        'status': item['status'],
                        'due': item.get('due'),
                        'created': item.get('updated')  # Use 'updated' as creation proxy
                    })

        except Exception as e:
            print(f"  Warning: Could not fetch tasks from list \"{task_list['title']}\": {e}")

    return all_tasks

# ════════════════════════════════════════════════════════════════════════════
# Task Ranking (Ignite Algorithm)
# ════════════════════════════════════════════════════════════════════════════

def rank_tasks(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank tasks using the Ignite algorithm:
    1. URGENT in title (case-insensitive)
    2. Overdue (due date < today)
    3. FIFO (oldest created first)
    """
    today = date.today()

    def sort_key(task):
        # Priority 1: URGENT in title
        has_urgent = 'urgent' in task['title'].lower()

        # Priority 2: Overdue
        is_overdue = False
        if task.get('due'):
            try:
                due_date = datetime.fromisoformat(task['due'].replace('Z', '+00:00')).date()
                is_overdue = due_date < today
            except:
                pass

        # Priority 3: FIFO (oldest first) - lower timestamp = higher priority
        created_timestamp = float('inf')
        if task.get('created'):
            try:
                created_timestamp = datetime.fromisoformat(
                    task['created'].replace('Z', '+00:00')
                ).timestamp()
            except:
                pass

        # Return tuple for sorting (False < True, so negate booleans for descending priority)
        return (
            not has_urgent,      # URGENT tasks first
            not is_overdue,      # Overdue tasks second
            created_timestamp    # Oldest tasks third
        )

    return sorted(tasks, key=sort_key)

# ════════════════════════════════════════════════════════════════════════════
# Email Formatting
# ════════════════════════════════════════════════════════════════════════════

def format_due_date(due: Optional[str]) -> str:
    """Format due date for display."""
    if not due:
        return ''

    try:
        due_date = datetime.fromisoformat(due.replace('Z', '+00:00'))
        return f"Due: {due_date.strftime('%b %d')}"
    except:
        return ''

def format_task_line(task: Dict[str, Any], index: Optional[int] = None) -> str:
    """Format a single task line."""
    due = format_due_date(task.get('due'))
    prefix = f"{index}. " if index is not None else ""

    if due:
        return f"{prefix}{task['title']} ({due})"
    else:
        return f"{prefix}{task['title']}"

def get_subject_with_date() -> str:
    """Get email subject with current date."""
    today = datetime.now()
    date_str = today.strftime('%a, %b %d')
    return f"{BRAND_NAME} - {date_str}"

def format_email_body(top_tasks: List[Dict[str, Any]], total_count: int) -> str:
    """Format the email body content."""
    if len(top_tasks) == 0:
        lines = [
            BRAND_NAME,
            '═══════════════════════════════════════',
            '',
            'No tasks today! Enjoy your morning.',
            '',
            '───────────────────────────────────────',
            BRAND_TAGLINE
        ]
        return '\n'.join(lines)

    main_task = top_tasks[0]
    stretch_tasks = top_tasks[1:]

    lines = [
        BRAND_NAME,
        '═══════════════════════════════════════',
        '',
        'TOP PRIORITY',
        f">>> {format_task_line(main_task)} <<<",
        ''
    ]

    if len(stretch_tasks) > 0:
        lines.append('───────────────────────────────────────')
        lines.append('STRETCH GOALS')
        for idx, task in enumerate(stretch_tasks, start=2):
            lines.append(f"  {format_task_line(task, idx)}")
        lines.append('')

    lines.append('───────────────────────────────────────')
    lines.append(f"{total_count} task{'s' if total_count != 1 else ''} in queue")
    lines.append('')
    lines.append(BRAND_TAGLINE)

    return '\n'.join(lines)

# ════════════════════════════════════════════════════════════════════════════
# Email Sending
# ════════════════════════════════════════════════════════════════════════════

def send_email(user: Dict[str, str], subject: str, body: str):
    """Send email via Gmail SMTP."""
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = f"{BRAND_NAME} <{user['email']}>"
    msg['To'] = user['email']

    # Remove spaces from app password if present
    app_password = user['email_app_password'].replace(' ', '')

    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login(user['email'], app_password)
        server.send_message(msg)

    print("  Email sent successfully!")

# ════════════════════════════════════════════════════════════════════════════
# User Processing
# ════════════════════════════════════════════════════════════════════════════

def process_user(user: Dict[str, str]):
    """Process a single user: fetch tasks, rank them, send email."""
    print(f"\n{'─' * 50}")
    print(f"Processing: {user.get('name', user['email'])}")
    print(f"{'─' * 50}")

    # Authenticate and get Tasks service
    service = get_tasks_service(user)

    # Ensure sync list exists
    ensure_sync_list_exists(service)

    # Fetch all tasks
    print("  Fetching tasks from Google Tasks...")
    tasks = fetch_tasks(service)
    print(f"  Found {len(tasks)} uncompleted task(s) across all lists.")

    # Rank tasks
    ranked_tasks = rank_tasks(tasks)
    top3 = ranked_tasks[:3]

    if len(top3) > 0:
        print("\n  Top 3 ranked tasks:")
        for i, task in enumerate(top3, start=1):
            print(f"    {i}. {task['title']}")

    # Format and send email
    print("\n  Sending daily digest...")
    subject = get_subject_with_date()
    body = format_email_body(top3, len(tasks))
    send_email(user, subject, body)

    print(f"{'─' * 50}")
    print(f"✓ {user['email']} - Complete!")

# ════════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ════════════════════════════════════════════════════════════════════════════

def main():
    """Main entry point - process all users."""
    print(f"\n  {BRAND_NAME}")
    print(f"  {BRAND_TAGLINE}\n")
    print('═' * 50)

    # Check if today is weekend
    today = datetime.now()
    day_name = today.strftime('%A')

    if today.weekday() >= 5:  # Saturday (5) or Sunday (6)
        print(f"{day_name} - skipping (weekdays only).")
        return

    # Load users
    try:
        users = load_users()
        print(f"Loaded {len(users)} user(s) from users.json")
    except Exception as e:
        print(f"Error loading users: {e}")
        return

    # Process each user
    success_count = 0
    error_count = 0

    for user in users:
        try:
            process_user(user)
            success_count += 1
        except Exception as e:
            error_count += 1
            print(f"\n{'─' * 50}")
            print(f"✗ {user.get('email', 'Unknown')} - Error:")
            print(f"  {type(e).__name__}: {e}")
            print(f"{'─' * 50}")
            continue  # Don't crash, continue to next user

    # Summary
    print(f"\n{'═' * 50}")
    print(f"{BRAND_NAME} complete!")
    print(f"  ✓ Success: {success_count}")
    print(f"  ✗ Errors:  {error_count}")
    print(f"{'═' * 50}\n")

if __name__ == '__main__':
    main()
