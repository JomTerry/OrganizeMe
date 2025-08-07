Criterion A: Planning
Statement of the Problem
My client, Mr. Mivan, is an IBDP student. Like many students in the IB program, he often has a
lot of work to do at the same time. He needs to finish school assignments, study for tests, and
also manage other activities like sports or volunteering. He told me that he sometimes forgets
about tasks or doesn’t know which one to do first.
Mr. Mivan has tried using to-do list apps, but they are too simple. They let him write down tasks,
but they don’t tell him which ones are more important or more urgent. He also tried apps like
Trello and Notion, but he said they are too complicated and hard to use.
I suggested making a simple mobile app just for students like him. The app will help him
organize his tasks in order of importance. He can add a task, set the deadline, and choose how
important it is. The app will then arrange the tasks from most important to least important, and
remind him when a task is coming up. Mivan liked this idea and said it would help him stay more
organized and less stressed.
Because Mr. Mivan uses an Android phone, I will build the app for Android only.
Rationale
The goal of this project is to make a lightweight and simple mobile app for Android that helps
students stay organized and reduce stress. The app will allow users to input their tasks, choose
a due date, and mark how important the task is. After that, the app will automatically sort the
tasks by importance and urgency. This helps the user see which task they should do first.
The app will use a basic idea based on the Eisenhower Matrix, which helps people decide what
to do based on two things:
●
How urgent the task is (based on the deadline)
●
How important the task is (the user chooses this)
Using this, the app will automatically sort tasks into High, Medium, or Low priority.
To build the app, I will use:
●
Python – the main programming language
●
Kivy – to build the app for Android
●
●
●
Kivymd – to add buttons and layouts that look clean and modern
SQLite – to store the tasks on the phone
Datetime – to help with sorting tasks by deadline and sending reminders
The user can input:
●
Task name
●
●
Description (optional)
Due date
●
●
Importance (High, Medium, Low)
Reminder on/off (optional)
The app will also let users mark tasks as done, and see their progress. Since the data is saved
on the device, the app can be used even without the internet.
Success Criteria
The app will be successful if it meets these points:
1. 2. 3. 4. 5. 6. 7. 8. The user can add a task with a name, deadline, and importance level
The app automatically sorts tasks by urgency and importance
Tasks are shown under High, Medium, or Low priority sections
The user gets reminders (optional feature)
The user can mark a task as complete
The app has a simple and easy-to-use interface
All data is saved on the phone and works without internet
The user can choose to view tasks by priority or due date
Criterion B: Design Overview
This part of the project shows how I planned the structure and design of the task management
app based on my client Mr. M’s needs. I used his suggestions and feedback to decide how the
app should work, look, and store data.
Database Dictionary
Users Details
This table stores basic account details for each user of the app. It includes their name, email,
password, birthday, phone number, and optional profile picture. Each user is given a unique
user
_
id so the app can keep their tasks separate.
Field Name Data type Validation Description
user
_
id Integer Must be unique;
auto-increment
A unique ID number
for each user
name String Cannot be empty Full name of the user
email String Must include ‘@’;
must be unique
Used for login and
communication
password String Must be at least 8
characters
Password chosen by
the user
birthday String Must be a valid date
(YYYY-MM-DD)
User’s date of birth
phone
_
number String Cannot be empty Contact number of
the user
profile
_picture Binary Must be .jpg or .png
format
Optional picture
shown in the profile
Task
This table keeps track of all the tasks that users create. Each task is linked to a user and
includes important details like the title, deadline, priority level, estimated duration, and
completion status. The app uses this information to sort tasks and show reminders.
Field Name Data Type Validation Description
task
_
id Integer Primary key,
auto-increment
Unique ID for each
task
user
_
id Integer Must match an
existing user
_
id
Connects task to the
correct user
title String Cannot be empty Short name or label
for the task
description String Optional More detailed info
about the task
due
_
date String Must follow
"YYYY-MM-DD
HH:MM" format
The deadline for the
task
important
_
level String Must be "High"
,
"Medium"
, or
"Low"
Priority selected by
the user
estimated
_
duration String Must be 0 or more Time (in hours) user
thinks task will take
(optional)
reminder
_
enable Integer 0 (off) or 1 (on) Whether a reminder
should be sent
completed Integer 0 (not done) or 1
(done)
Marks if the task has
been finished
created
_
at String Auto-set to current
date and time
When the task was
added
updated
_
at String Auto-set when task is
edited
Last time any part of
the task was changed
Reminders
This table handles all the scheduled reminders for tasks. Each reminder is linked to a task and
includes the time it should be sent and whether it has already been delivered. This helps the
app know when to notify users so they don’t miss deadlines.
Field Name Data Type Validation Description
reminder
_
id Integer Primary key,
auto-increment
Unique ID for each
reminder
task
_
id Integer Must match an Links this reminder to
remind
_
time sent created
_
at String Integer String existing task
_
id Must follow
"YYYY-MM-DD
HH:MM" format
0 (not sent) or 1
(sent)
Auto-set to current
date and time
a specific task
The exact time when
the reminder should
be sent
Tracks if the reminder
has already been
delivered
When the reminder
was created
Flowchart
Flowchart for how to add a new task
Flowchart on how to sign up and log in the app
General Interface Design
Log in and Sign in page
Home page
Add new task page
Test Plan
Success
Criteria
Actions 1 Open app → Tap "Add Task"
Enter name, deadline, and
priority → Tap "Save"
.
→
2 Add 3 tasks with different
deadlines/priorities → Check the
main screen.
3 Add tasks with "High,
"
"Medium,
" and "Low" priority.
4 Add a task with a reminder for 2
minutes later → Wait.
5 Tap the checkbox next to a task. 6 Ask the client (Mr. M) to navigate
the app without instructions.
7 Turn off Wi-Fi/data → Add/edit
tasks → Reopen app.
8 Tap "Sort by Due Date"
"Sort by Priority.
"
→ Tap
Expected Results
Task appears in the correct priority
list (High/Medium/Low).
Tasks are sorted: High (top) →
Medium → Low (bottom).
Tasks are grouped under labeled
sections
Notification pops up at the set time
Task gets a strikethrough or moves to
a "Completed" section.
Client can add/sort tasks within 1
minute.
All changes are saved and visible.
Tasks reorder correctly (by date first,
then by priority).
Record of Tasks
Task
Numb
er
Planned action 1 Client meeting
(Mr. M)
2 Supervisor
consultation
3 Detailed client
discussion
4 Research tools/
libraries
5 Document
success criteria
6 Design overview
of the whole
program/app
7 Design the
interface of the
app
8 Create and
design
flowcharts to
understand how
the function run
9 Create a test
plan based on
the success
criteria
Planned
outcome
Meet with my
client and plan
general outline
and idea
Approve app
idea
Finalize 8
success criteria
(e.g., sorting,
reminders,
offline use).
Select Python,
Kivy, KivyMD,
SQLite, and
datetime for
development.
List all 8 criteria
with measurable
outcomes
Complete the
design for the
program/app,to
identify how the
system works
Complete the
interface design
for the app
Complete at
least 2 flowchart
diagram
Complete their
test plan, base
on the success
criteria
Time
estimated
Target
completion
date
Criterion
50 min April
14,2025
A
15 min April
16,2025
A
3 days April
17,2025
A
4 days April
21,2025
A
1 day April
25,2025
A
2 days April
26,2025
B
1 day April
28,2025
B
1 day April
29,2025
B
3 hours April
30,2025
B
10 11 12 13 14 15 16 17 18 19 20 Finalized and
compile Criteria
B
Set up the
database
Code the task
input screen
Add sorting
logic
Make the task
list screen
Add reminders Connect buttons
(Mark as Done,
Delete)
Check and fix
bugs in the
program
Finalizing and
complete the
program
Record screen
demo
Film client (Mr.
M) testing the
Recheck and
finalized the
Criterion B
Create tables to
store user tasks
and reminders.
Users can type
task names,
deadlines, and
pick priority
(High/Medium/
Low).
Tasks
automatically
sort by deadline
and importance
Show tasks in 3
sections: High,
Medium, Low
priority.
Users get
notifications
when tasks are
almost due.
Users can
check off tasks
or remove them.
For example: If
reminders don’t
work, find and
fix the code
Complete and
revise the
Criterion C
Show: adding
tasks, sorting,
reminders, and
marking tasks
as done.
Client explains
how it helps him
2 hours April
30,2025
B
5 days July 10,2025 C
5 days July 16,2025 C
2 days July 22,2025 C
2 days July 24,2025 C
3 days July 26,2025 C
2 days July 30,2025 C
2 days August
3,2025
C
5 days August
6,2025
C
1 day August
8,2025
D
1 hour August
9,2025
D
21 22 23 24 25 26 app Edit video (MP4) Submit the
video and wait
for supervisor
approval
Client feedback
survey
Compare app to
success criteria
Plan
improvements
Gather all
informations
prioritize
homework.
Combine clips +
add captions
Revise the
video
Ask Mr. M:
"Does the app
reduce stress?
“Does it help?
Check if it meet
the successful
criteria from
Criterion A
List the things
which my app
can be
improved
Complete the
Criterion E
evaluation
1 day 3 days 1 day 2 days 3 days 10 days August
11,2025
August
20,2025
August
22,2025
September
1,2025
September
4,2025
September
10,2025
D
D
E
E
E
E
