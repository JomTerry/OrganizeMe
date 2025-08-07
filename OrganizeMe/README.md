# OrganizeMe - Task Management App

A comprehensive React Native task management application that helps users stay organized and productive.

## Features

### 🔐 Authentication
- User registration with full profile information
- Secure login/logout functionality
- Form validation and error handling
- Persistent user sessions

### 📋 Task Management
- Create, edit, and delete tasks
- Set task priorities (High, Medium, Low)
- Due date and time selection
- Optional task descriptions
- Mark tasks as complete/incomplete

### 🔔 Reminders
- Customizable reminder notifications
- Set reminder time (minutes before due date)
- In-app notification alerts
- Automatic reminder management

### 📊 Organization
- **Priority View**: Tasks grouped by importance level
- **Due Date View**: Tasks sorted by due date
- Visual priority indicators
- Overdue task highlighting
- Completed tasks section

### ⚙️ Settings
- User profile information display
- App version and build information
- Support and help options
- Secure logout functionality

## Technical Stack

- **Framework**: React Native with TypeScript
- **Navigation**: React Navigation 6
- **Database**: SQLite with react-native-sqlite-storage
- **Storage**: AsyncStorage for session management
- **Date/Time**: React Native Community DateTimePicker
- **Icons**: React Native Vector Icons

## Database Schema

### Users Table
- `user_id`: Primary key (auto-increment)
- `name`: User's full name
- `email`: Email address (unique)
- `password`: User password
- `birthday`: Date of birth
- `phone_number`: Contact number

### Tasks Table
- `task_id`: Primary key (auto-increment)
- `user_id`: Foreign key to Users table
- `title`: Task title (required)
- `description`: Task description (optional)
- `due_date`: Due date and time
- `importance`: Priority level (High/Medium/Low)
- `reminder_enabled`: Boolean for reminder status
- `reminder_time`: Calculated reminder time
- `completed`: Task completion status
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Reminders Table
- `reminder_id`: Primary key (auto-increment)
- `task_id`: Foreign key to Tasks table
- `remind_at`: Reminder trigger time
- `sent`: Boolean for reminder sent status

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd OrganizeMe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **iOS Setup** (iOS only)
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Run the application**
   
   For Android:
   ```bash
   npm run android
   ```
   
   For iOS:
   ```bash
   npm run ios
   ```

## User Flows

### 1. Sign Up / Log In
- Launch app → Welcome screen
- Choose "Sign Up" or "Log In"
- Fill required information
- Automatic login after successful registration

### 2. Task Management
- View tasks organized by priority or due date
- Tap "+" to add new tasks
- Long press tasks for edit/delete options
- Tap checkbox to mark complete

### 3. Task Creation/Editing
- Fill title (required) and description (optional)
- Select due date and time
- Choose importance level
- Enable/configure reminders
- Save or cancel changes

### 4. Reminders
- Automatic in-app notifications
- Option to mark complete from notification
- Configurable reminder timing

### 5. Settings & Profile
- View user profile information
- Access app information
- Support options
- Secure logout

## Error Handling

The app includes comprehensive error handling for:

- **Form Validation**: Required fields, email format, password strength
- **Date Validation**: Future date requirements, invalid date handling
- **Database Errors**: Connection issues, constraint violations
- **Network Issues**: Offline functionality maintained
- **User Feedback**: Clear error messages and loading states

## Testing Scenarios

### Core Functionality Tests
- ✅ User registration with valid data
- ✅ User login with correct credentials
- ✅ Task creation with all fields
- ✅ Task editing and updates
- ✅ Task deletion with confirmation
- ✅ Task completion toggle
- ✅ Priority and due date views
- ✅ Reminder notifications
- ✅ Settings and logout

### Edge Cases & Validation
- ✅ Invalid email format handling
- ✅ Password requirements validation
- ✅ Past date selection prevention
- ✅ Empty required field validation
- ✅ Database storage limits
- ✅ App restart data persistence

## Project Structure

```
OrganizeMe/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── TaskCard.tsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── screens/            # Application screens
│   │   ├── WelcomeScreen.tsx
│   │   ├── SignUpScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── AddTaskScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/           # Business logic services
│   │   ├── database.ts
│   │   ├── auth.ts
│   │   └── notifications.ts
│   ├── types/              # TypeScript definitions
│   │   └── index.ts
│   └── App.tsx             # Main application component
├── package.json
├── tsconfig.json
└── README.md
```

## Future Enhancements

- [ ] Push notifications with native APIs
- [ ] Task categories and tags
- [ ] Data export/import functionality
- [ ] Cloud synchronization
- [ ] Task sharing and collaboration
- [ ] Advanced reminder options
- [ ] Dark mode theme
- [ ] Accessibility improvements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the in-app help section

---

**OrganizeMe** - Stay organized, stay productive! 📋✨