# Wireframes & UI Mockups - OrganizeMe App

## Screen Dimensions & Design System

### Design Specifications
- **Target Device:** Android phones (360dp x 640dp base)
- **Material Design 3** principles
- **Color Palette:**
  - Primary: #6200EE (Purple)
  - Secondary: #03DAC6 (Teal)
  - Error: #B00020 (Red)
  - High Priority: #FF5722 (Deep Orange)
  - Medium Priority: #FF9800 (Orange)
  - Low Priority: #4CAF50 (Green)
  - Background: #FFFFFF (Light) / #121212 (Dark)
  - Surface: #F5F5F5 (Light) / #1E1E1E (Dark)

### Typography
- **Headlines:** Roboto Medium, 20sp
- **Body:** Roboto Regular, 16sp
- **Captions:** Roboto Regular, 12sp
- **Buttons:** Roboto Medium, 14sp

## 1. Main Task List Screen (Priority View)

```
┌─────────────────────────────────────┐
│ ≡  OrganizeMe           🔄  ⚙️      │ ← Top App Bar
├─────────────────────────────────────┤
│                                     │
│ 🔴 HIGH PRIORITY                    │ ← Section Header
├─────────────────────────────────────┤
│ ☐ Complete IB Math IA              │
│   📅 Due: Tomorrow                  │ ← Task Item
│   ⏰ Reminder: Today 6PM           │
├─────────────────────────────────────┤
│ ☐ Submit Physics Lab Report        │
│   📅 Due: Dec 15                   │
│   🔔 No reminder                   │
├─────────────────────────────────────┤
│                                     │
│ 🟠 MEDIUM PRIORITY                  │
├─────────────────────────────────────┤
│ ☐ Read Chapter 5 - Economics       │
│   📅 Due: Dec 20                   │
│   ⏰ Reminder: Dec 19 9AM          │
├─────────────────────────────────────┤
│                                     │
│ 🟢 LOW PRIORITY                     │
├─────────────────────────────────────┤
│ ☐ Review French vocabulary         │
│   📅 Due: Next week                │
│   🔔 No reminder                   │
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│                              ⊕     │ ← FAB (Add Task)
└─────────────────────────────────────┘
```

### Main Screen Components:
- **Top App Bar:** Title, refresh button, settings menu
- **Priority Sections:** Collapsible sections with color-coded headers
- **Task Items:** Checkbox, title, due date, reminder status
- **Floating Action Button:** Primary action to add new task
- **Empty State:** Motivational message when no tasks exist

### Task Item Interactions:
- **Tap:** Open task details modal
- **Swipe Right:** Mark as complete with animation
- **Long Press:** Show context menu (Edit, Delete, Duplicate)
- **Checkbox Tap:** Toggle completion status

## 2. Main Task List Screen (Date View)

```
┌─────────────────────────────────────┐
│ ≡  OrganizeMe           📅  ⚙️      │ ← Calendar icon active
├─────────────────────────────────────┤
│                                     │
│ 🔴 OVERDUE                          │ ← Date Section
├─────────────────────────────────────┤
│ ☐ Submit English Essay (HIGH)       │
│   📅 Was due: Dec 10               │
│   ⚠️ 3 days overdue                │
├─────────────────────────────────────┤
│                                     │
│ 🔵 TODAY                            │
├─────────────────────────────────────┤
│ ☐ Complete IB Math IA (HIGH)        │
│   📅 Due: Today                     │
│   ⏰ Reminder: 6PM                  │
├─────────────────────────────────────┤
│                                     │
│ 💙 TOMORROW                         │
├─────────────────────────────────────┤
│ ☐ Physics Lab Report (HIGH)         │
│   📅 Due: Tomorrow                  │
├─────────────────────────────────────┤
│                                     │
│ 🟢 THIS WEEK                        │
├─────────────────────────────────────┤
│ ☐ Economics Reading (MEDIUM)        │
│   📅 Due: Dec 20                    │
├─────────────────────────────────────┤
│                              ⊕     │
└─────────────────────────────────────┘
```

## 3. Add Task Screen

```
┌─────────────────────────────────────┐
│ ✕  Add New Task            ✓ SAVE   │ ← Modal Header
├─────────────────────────────────────┤
│                                     │
│ Task Name *                         │
│ ┌─────────────────────────────────┐ │
│ │ Complete Math IA               │ │ ← Text Input
│ └─────────────────────────────────┘ │
│                                     │
│ Description (Optional)              │
│ ┌─────────────────────────────────┐ │
│ │ Finish statistical analysis    │ │ ← Multi-line Input
│ │ and write conclusion           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Due Date                            │
│ ┌─────────────────────────────────┐ │
│ │ 📅 December 15, 2024    ▼     │ │ ← Date Picker
│ └─────────────────────────────────┘ │
│                                     │
│ Due Time (Optional)                 │
│ ┌─────────────────────────────────┐ │
│ │ ⏰ 11:59 PM             ▼     │ │ ← Time Picker
│ └─────────────────────────────────┘ │
│                                     │
│ Importance Level                    │
│ ┌───────┬───────┬───────────────┐   │
│ │  🔴   │  🟠   │      🟢       │   │ ← Priority Buttons
│ │ HIGH  │ MED   │     LOW       │   │
│ └───────┴───────┴───────────────┘   │
│                                     │
│ ☐ Set Reminder                      │ ← Toggle Switch
│                                     │
└─────────────────────────────────────┘
```

### Add Task Form Components:
- **Task Name:** Required text field with validation
- **Description:** Optional multi-line text area
- **Due Date:** Date picker with calendar widget
- **Due Time:** Time picker (optional, defaults to end of day)
- **Priority Buttons:** Visual selection with color coding
- **Reminder Toggle:** Expands to show reminder options when enabled

### Reminder Options (when enabled):
```
│ Reminder Time                       │
│ ┌─────────────────────────────────┐ │
│ │ ○ 15 minutes before             │ │
│ │ ○ 1 hour before                 │ │
│ │ ● 1 day before                  │ │ ← Selected
│ │ ○ Custom time...                │ │
│ └─────────────────────────────────┘ │
```

## 4. Task Details Modal

```
┌─────────────────────────────────────┐
│ ✕  Task Details                     │ ← Modal Header
├─────────────────────────────────────┤
│                                     │
│ Complete IB Math IA                 │ ← Task Title (Large)
│                                     │
│ 📝 Finish statistical analysis and  │
│    write conclusion section         │ ← Description
│                                     │
│ 📅 Due: Tomorrow, Dec 15            │
│ ⏰ Time: 11:59 PM                   │ ← Due Info
│                                     │
│ 🔴 High Priority                    │ ← Priority Badge
│                                     │
│ 🔔 Reminder: Today at 6:00 PM       │ ← Reminder Info
│                                     │
│ ✏️ Created: Dec 10, 2024            │ ← Metadata
│                                     │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────┬─────────┬─────────────┐ │
│ │  EDIT   │ COMPLETE │   DELETE    │ │ ← Action Buttons
│ └─────────┴─────────┴─────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

## 5. Edit Task Screen

```
┌─────────────────────────────────────┐
│ ✕  Edit Task              ✓ SAVE    │
├─────────────────────────────────────┤
│                                     │
│ Task Name *                         │
│ ┌─────────────────────────────────┐ │
│ │ Complete IB Math IA            │ │ ← Pre-filled
│ └─────────────────────────────────┘ │
│                                     │
│ Description (Optional)              │
│ ┌─────────────────────────────────┐ │
│ │ Finish statistical analysis... │ │ ← Pre-filled
│ └─────────────────────────────────┘ │
│                                     │
│ Due Date                            │
│ ┌─────────────────────────────────┐ │
│ │ 📅 December 15, 2024    ▼     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Due Time                            │
│ ┌─────────────────────────────────┐ │
│ │ ⏰ 11:59 PM             ▼     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Importance Level                    │
│ ┌───────┬───────┬───────────────┐   │
│ │  🔴   │  🟠   │      🟢       │   │
│ │ HIGH  │ MED   │     LOW       │   │ ← High selected
│ └───────┴───────┴───────────────┘   │
│                                     │
│ ☑️ Set Reminder                      │ ← Enabled
│                                     │
│ Reminder: 1 day before              │ ← Current setting
│                                     │
└─────────────────────────────────────┘
```

## 6. Settings Screen

```
┌─────────────────────────────────────┐
│ ←  Settings                         │
├─────────────────────────────────────┤
│                                     │
│ PREFERENCES                         │
├─────────────────────────────────────┤
│ Default Priority                    │
│ Medium                          ▶   │
├─────────────────────────────────────┤
│ Default Reminder                    │
│ 1 day before                    ▶   │
├─────────────────────────────────────┤
│ Theme                               │
│ Auto (System)                   ▶   │
├─────────────────────────────────────┤
│                                     │
│ NOTIFICATIONS                       │
├─────────────────────────────────────┤
│ Enable Notifications        ☑️      │
├─────────────────────────────────────┤
│ Overdue Reminders          ☑️      │
├─────────────────────────────────────┤
│ Daily Summary              ☐       │
├─────────────────────────────────────┤
│                                     │
│ DATA                                │
├─────────────────────────────────────┤
│ Export Tasks                    ▶   │
├─────────────────────────────────────┤
│ Import Tasks                    ▶   │
├─────────────────────────────────────┤
│ Clear Completed Tasks           ▶   │
├─────────────────────────────────────┤
│ Reset All Data                  ▶   │
├─────────────────────────────────────┤
│                                     │
│ ABOUT                               │
├─────────────────────────────────────┤
│ Version 1.0.0                       │
│ Made for IBDP Students              │
└─────────────────────────────────────┘
```

## 7. Empty States

### No Tasks Yet
```
┌─────────────────────────────────────┐
│ ≡  OrganizeMe           🔄  ⚙️      │
├─────────────────────────────────────┤
│                                     │
│                                     │
│            📝                       │
│                                     │
│      Welcome to OrganizeMe!        │
│                                     │
│    You have no tasks yet.          │
│    Tap the + button to add         │
│         your first task.           │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                              ⊕     │
└─────────────────────────────────────┘
```

### All Tasks Complete
```
┌─────────────────────────────────────┐
│ ≡  OrganizeMe           🔄  ⚙️      │
├─────────────────────────────────────┤
│                                     │
│                                     │
│            🎉                       │
│                                     │
│      Congratulations!              │
│                                     │
│    All tasks completed!            │
│    You're on top of your           │
│         schedule!                  │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                              ⊕     │
└─────────────────────────────────────┘
```

## 8. Notification Designs

### Standard Notification
```
┌─────────────────────────────────────┐
│ 🔔 OrganizeMe               2:30 PM │
├─────────────────────────────────────┤
│ Complete IB Math IA                 │
│ Due tomorrow at 11:59 PM            │
│                                     │
│ [MARK COMPLETE]        [VIEW TASK]  │
└─────────────────────────────────────┘
```

### Overdue Notification
```
┌─────────────────────────────────────┐
│ ⚠️ OrganizeMe (Overdue)      8:00 AM │
├─────────────────────────────────────┤
│ Physics Lab Report                  │
│ Was due yesterday - 1 day overdue   │
│                                     │
│ [MARK COMPLETE]        [OPEN APP]   │
└─────────────────────────────────────┘
```

## 9. Loading States & Animations

### Task Addition Animation
1. FAB pressed → Ripple effect
2. Add screen slides up from bottom
3. Form fields animate in sequentially
4. Save button press → Loading spinner
5. Success → Screen slides down, new task appears with scale animation

### Task Completion Animation
1. Swipe gesture → Task slides right with green background
2. Checkmark icon appears and scales up
3. Task fades out over 300ms
4. Remaining tasks animate up to fill space
5. Snackbar slides up from bottom with undo option

### Priority View Toggle
1. Tap calendar icon → Icon rotates 180°
2. Current view fades out (200ms)
3. New view fades in (200ms)
4. Section headers animate in from left

## 10. Responsive Design Considerations

### Tablet Layout (768dp+)
- Two-column layout: Task list on left, details on right
- Floating add task panel instead of full-screen modal
- More tasks visible simultaneously
- Larger touch targets for better accessibility

### Landscape Mode
- Horizontal layout for add/edit forms
- Condensed task list items
- Side navigation drawer for settings
- Optimized for one-handed use

## 11. Accessibility Features

### Visual Accessibility
- High contrast mode support
- Large text options (up to 24sp)
- Color blind friendly alternatives
- Focus indicators for keyboard navigation

### Motor Accessibility
- Minimum 48dp touch targets
- Gesture alternatives for all swipe actions
- Voice input support for task creation
- Switch control compatibility

### Cognitive Accessibility
- Simple, consistent navigation
- Clear visual hierarchy
- Confirmation dialogs for destructive actions
- Progress indicators for long operations

## 12. Dark Mode Variations

### Dark Theme Colors
- Primary: #BB86FC (Light Purple)
- Background: #121212
- Surface: #1E1E1E
- On Surface: #E1E1E1
- Priority colors remain the same for consistency

### Dark Mode Adaptations
- Reduced elevation shadows
- Softer accent colors
- Increased contrast for text
- Dimmed notification colors