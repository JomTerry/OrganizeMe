# User Flows - OrganizeMe App

## 1. First-Time App Launch Flow

### 1.1 Initial Setup
**Trigger:** User opens app for the first time
**Steps:**
1. App displays splash screen with OrganizeMe logo
2. Database initialization runs in background
3. App checks for necessary permissions (notifications, storage)
4. Main screen loads with empty task list
5. Welcome overlay appears with quick tutorial highlights:
   - "Tap + to add your first task"
   - "Tasks auto-sort by priority and deadline"
   - "Swipe to mark tasks complete"

**Success:** User sees main screen ready for first task
**Error Paths:** 
- Database creation fails → Show error dialog, retry option
- Permissions denied → Show explanation dialog, redirect to settings

## 2. Add New Task Flow

### 2.1 Basic Task Creation
**Trigger:** User taps the floating action button (+) on main screen
**Steps:**
1. Add Task screen slides up from bottom
2. User enters task name (required field)
3. User optionally adds description
4. User selects due date using date picker (defaults to today)
5. User selects importance level (High/Medium/Low - defaults to Medium)
6. User optionally sets reminder time
7. User taps "Add Task" button
8. App validates input and saves to database
9. Screen slides down, returns to main screen
10. New task appears in appropriate priority section

**Success:** Task created and visible in main list
**Error Paths:**
- Empty task name → Show validation message, highlight field
- Past due date selected → Show warning, allow user to confirm
- Database save fails → Show error message, keep form data

### 2.2 Quick Add Flow (Future Enhancement)
**Trigger:** User long-presses the + button
**Steps:**
1. Quick add dialog appears
2. User types task name only
3. App auto-assigns Medium priority, due date = today
4. Task immediately appears in list

## 3. View Tasks Flow

### 3.1 Priority View (Default)
**Trigger:** App opens or user selects priority view
**Display Logic:**
1. Tasks grouped into three sections:
   - **High Priority** (red header)
   - **Medium Priority** (orange header)  
   - **Low Priority** (green header)
2. Within each priority, tasks sorted by due date (earliest first)
3. Overdue tasks highlighted with red accent
4. Today's tasks highlighted with yellow accent
5. Empty sections show motivational messages

### 3.2 Date View
**Trigger:** User taps view toggle button (calendar icon)
**Display Logic:**
1. Tasks grouped by date:
   - **Overdue** (red header)
   - **Today** (blue header)
   - **Tomorrow** (light blue header)
   - **This Week** (green header)
   - **Later** (gray header)
2. Within each date group, tasks sorted by priority (High → Low)
3. Color coding maintained for priority levels

### 3.3 Task Details View
**Trigger:** User taps on any task in the list
**Steps:**
1. Task details modal slides up
2. Shows full task information:
   - Task name and description
   - Due date and time
   - Priority level
   - Reminder settings
   - Creation date
   - Status (pending/completed)
3. Action buttons: Edit, Mark Complete, Delete
4. User can swipe down or tap outside to close

## 4. Mark Task Complete Flow

### 4.1 Swipe to Complete
**Trigger:** User swipes task item to the right
**Steps:**
1. Task item slides right with green background
2. Checkmark icon appears
3. Task marked as completed in database
4. Task fades out from main list
5. Brief "Task completed!" snackbar appears
6. Undo option available for 5 seconds

### 4.2 Tap to Complete
**Trigger:** User taps checkbox icon on task item
**Steps:**
1. Checkbox animates to checked state
2. Task text gets strikethrough effect
3. Task grays out and moves to bottom of section
4. After 2 seconds, task fades out completely
5. Undo option in snackbar

### 4.3 Undo Complete
**Trigger:** User taps "Undo" in snackbar
**Steps:**
1. Task reappears in original position
2. Status reverted to pending
3. Database updated
4. Confirmation message briefly shown

## 5. Edit Task Flow

### 5.1 Edit Existing Task
**Trigger:** User taps "Edit" in task details modal OR long-presses task item
**Steps:**
1. Edit Task screen opens with pre-filled form
2. All current task data displayed in editable fields
3. User modifies desired fields
4. User taps "Save Changes"
5. App validates changes
6. Database updated with new information
7. User returns to main screen
8. Task appears in new position if priority/date changed

**Success:** Task updated and repositioned correctly
**Error Paths:**
- Validation fails → Show error messages, keep form open
- No changes made → Return to main screen without database call

## 6. Reminder Notification Flow

### 6.1 Setting Reminders
**Trigger:** User enables reminder toggle in add/edit task screen
**Steps:**
1. Time picker appears for reminder time
2. User selects specific time or chooses from presets:
   - 15 minutes before due time
   - 1 hour before due time
   - 1 day before due date
   - Custom time
3. App calculates notification time
4. Notification scheduled with system

### 6.2 Receiving Notifications
**Trigger:** Scheduled notification time reached
**Steps:**
1. System notification appears with:
   - App icon
   - Task name as title
   - Due date/time as subtitle
   - "Mark Complete" action button
2. User taps notification → App opens to task details
3. User taps "Mark Complete" → Task marked done without opening app

### 6.3 Managing Overdue Tasks
**Trigger:** Task becomes overdue (past due date)
**Steps:**
1. Task automatically highlighted in red
2. If user opens app, overdue section appears at top
3. Optional: Daily reminder for overdue tasks (user setting)

## 7. Settings and Preferences Flow

### 7.1 Accessing Settings
**Trigger:** User taps menu icon → Settings
**Options Available:**
- Default task priority
- Default reminder time
- Notification preferences
- Theme selection (light/dark/auto)
- Data management (export/import)
- About app information

### 7.2 Data Management
**Trigger:** User taps "Manage Data" in settings
**Options:**
- View storage usage
- Export tasks to file
- Import tasks from file
- Clear completed tasks
- Reset all data (with confirmation)

## 8. Search and Filter Flow (Future Enhancement)

### 8.1 Search Tasks
**Trigger:** User taps search icon
**Steps:**
1. Search bar appears at top of screen
2. User types search query
3. Task list filters in real-time
4. Matching text highlighted in results
5. Clear search to return to full list

### 8.2 Filter Options
**Trigger:** User taps filter icon
**Available Filters:**
- By priority (High/Medium/Low)
- By date range
- By completion status
- By reminder status

## Error Recovery Flows

### Database Connection Issues
1. App detects database unavailable
2. Show "Sync in progress" message
3. Retry connection every 2 seconds
4. If persistent, offer "Reset Database" option

### Network-Related Features (Future)
1. If implementing cloud sync, handle offline gracefully
2. Queue changes locally
3. Sync when connection restored
4. Show sync status indicator

## Accessibility Considerations

### Screen Reader Support
- All buttons have descriptive labels
- Task priority announced with task name
- Due dates read in natural language
- Status changes announced

### Motor Accessibility
- Large touch targets (minimum 44px)
- Swipe gestures have tap alternatives
- Voice input for task creation
- High contrast mode support

## Performance Considerations

### Large Task Lists
- Implement virtual scrolling for 100+ tasks
- Lazy load task details
- Efficient database queries with indexing
- Smooth animations even with many items

### Memory Management
- Release resources when screens not visible
- Optimize image loading
- Clean up notification handlers
- Periodic garbage collection