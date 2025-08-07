# OrganizeMe - Task Management App

A lightweight Android app that helps IBDP students manage tasks with automatic priority sorting and deadline reminders.

## Features
- Quick task addition with name, description, due date, and importance
- Automatic sorting by priority (High/Medium/Low) and deadline
- Mark tasks as complete
- Optional reminder notifications
- Offline-first with local SQLite storage
- Toggle between priority view and date view

## Tech Stack
- **Python** - Core application logic
- **Kivy & KivyMD** - Cross-platform UI framework for Android
- **SQLite** - Local database storage
- **Plyer** - Cross-platform notifications

## Installation
1. Install Python 3.8+
2. Install dependencies: `pip install -r requirements.txt`
3. Run the app: `python main.py`

## Project Structure
```
OrganizeMe/
├── main.py                 # Main application entry point
├── models/
│   ├── __init__.py
│   ├── database.py         # SQLite database operations
│   └── task.py            # Task model and business logic
├── screens/
│   ├── __init__.py
│   ├── main_screen.py     # Main task list screen
│   ├── add_task_screen.py # Add/edit task screen
│   └── settings_screen.py # App settings
├── utils/
│   ├── __init__.py
│   ├── notifications.py   # Notification handling
│   └── sorting.py         # Task sorting algorithms
├── assets/
│   └── icons/            # App icons and images
├── docs/
│   ├── user_flows.md     # Detailed user flows
│   ├── wireframes.md     # UI mockups and layouts
│   ├── data_model.md     # Database schema and ER diagram
│   ├── notifications.md  # Notification logic
│   ├── error_handling.md # Error scenarios and handling
│   └── test_plan.md      # Comprehensive test cases
├── requirements.txt       # Python dependencies
└── buildozer.spec        # Android build configuration
```

## MVP Success Criteria
1. Add tasks with name, date, and importance
2. Auto-sort tasks by priority and deadline
3. Mark tasks as complete
4. Receive reminder notifications
5. Clean, intuitive interface
6. Offline functionality with local storage
7. Toggle between priority and date views
