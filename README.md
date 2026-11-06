# StudyFlow — Smart Student Productivity PWA

> **StudyFlow** is a modern, privacy-focused Progressive Web Application (PWA) designed for students to effortlessly manage their class schedules, track course attendance and absence allowances, organize study tasks, and stay productive — entirely client-side with zero mandatory logins or database setups.

---

## 📑 Table of Contents

- [Overview & Philosophy](#-overview--philosophy)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Core Features & How They Work](#-core-features--how-they-work)
  - [1. Dynamic Schedule & Timetable](#1-dynamic-schedule--timetable)
  - [2. AI Schedule Image Import (Groq Vision)](#2-ai-schedule-image-import-groq-vision)
  - [3. Attendance & Absence Allowance Tracker](#3-attendance--absence-allowance-tracker)
  - [4. Task Manager & Study Flow Timer](#4-task-manager--study-flow-timer)
  - [5. Class Reminders & Notifications](#5-class-reminders--notifications)
  - [6. Multi-Theme Engine](#6-multi-theme-engine)
- [Storage & Privacy Model](#-storage--privacy-model)
- [Google Analytics 4 Setup](#-google-analytics-4-setup)
- [Getting Started & Development](#-getting-started--development)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Deployment (Vercel)](#-deployment-vercel)
- [Guidelines for AI Agents & Developers](#-guidelines-for-ai-agents--developers)

---

## 🌟 Overview & Philosophy

StudyFlow is built with three main tenets:
1. **Privacy-First (Local-First)**: Student data (classes, study tasks, attendance history) is stored directly on the user's device via `localStorage`. No mandatory accounts, passwords, or cloud database sync requirements.
2. **Offline-Capable PWA**: Ships with service worker precaching and install prompts for Android, iOS (Safari), and desktop Chrome. Works fully offline without an internet connection.
3. **Frictionless Experience**: From schedule entry (manual or AI photo upload) to recording a missed class with a single tap directly on the schedule card.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Framework & Language** | React 18, TypeScript, Vite 5 |
| **Styling & Design System** | Tailwind CSS, Radix UI Primitives, Lucide React Icons |
| **State Management** | React Context (`ScheduleContext`, `AttendanceContext`, `ThemeContext`) |
| **Routing** | React Router DOM v6 |
| **Data Fetching & Cache** | TanStack React Query v5 |
| **PWA & Offline** | `vite-plugin-pwa`, Workbox, Custom Service Worker (`src/sw.ts`) |
| **Serverless Functions** | Vercel Serverless Functions (`api/*.ts`) with `@vercel/node` |
| **AI Integration** | Groq API (`qwen/qwen3.8-27b`) for timetable image OCR/parsing |
| **Testing** | Vitest, JSDOM, React Testing Library |

---

## 📂 Project Directory Structure

```text
flow-diary-sync/
├── api/                               # Vercel Serverless Functions
│   ├── chat.ts                        # Legacy chat endpoint (archived)
│   ├── groq-schedule.ts               # Vision AI timetable parser
│   ├── insight.ts                     # Legacy insight endpoint (archived)
│   ├── push-subscribe.ts              # Web Push subscription registration
│   ├── send-class-reminders.ts        # Background notification handler
│   └── vapid-public-key.ts            # Public VAPID key server endpoint
├── public/                            # Static assets (favicons, icons, manifest)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.webmanifest
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx          # Top-level React error recovery screen
│   │   ├── NavLink.tsx                # Navigation helper component
│   │   ├── PWAInstallPrompt.tsx       # Smart Android/iOS PWA download prompt
│   │   ├── ThemePicker.tsx            # Multi-theme selector modal
│   │   ├── StudyFlow/                 # Main StudyFlow feature views & modals
│   │   │   ├── AddClassChoiceModal.tsx       # "Manual Entry" vs "Upload Photo" modal
│   │   │   ├── AttendancePrompt.tsx          # "Did you attend?" auto-dialog after class
│   │   │   ├── AttendanceView.tsx            # Redesigned Attendance Hub (4th tab)
│   │   │   ├── ClassFormModal.tsx            # Manual class session editor & creator
│   │   │   ├── DashboardView.tsx             # Daily summary, countdown & quotes
│   │   │   ├── ScheduleImagePreviewModal.tsx # Editable review table for parsed classes
│   │   │   ├── ScheduleView.tsx              # Weekly timetable + "Missed Class" button
│   │   │   ├── SubjectDetailModal.tsx        # In-depth course attendance & limit editor
│   │   │   ├── TaskDetailView.tsx            # Task inspector with study timer
│   │   │   └── TasksView.tsx                 # Task organizer & filter list
│   │   └── ui/                        # Reusable Radix UI component library
│   ├── context/
│   │   ├── AttendanceContext.tsx      # Attendance records, stats, limits & auto-polling
│   │   ├── ScheduleContext.tsx        # Timetable state, CRUD & overlap validation
│   │   └── ThemeContext.tsx           # Multi-theme state provider
│   ├── hooks/
│   │   ├── use-mobile.tsx             # Mobile screen breakpoint detector
│   │   ├── use-toast.ts               # Toast helper hook
│   │   ├── useClassReminders.ts       # 15-minute upcoming class reminder listener
│   │   ├── usePageViewTracking.ts     # SPA route & tab-switch analytics hook
│   │   └── usePWAInstall.ts           # BeforeInstallPrompt PWA installer hook
│   ├── lib/
│   │   ├── analytics.ts               # Typed Google Analytics 4 wrapper (G-4DS4SCWLF7)
│   │   ├── attendance.ts              # Attendance types, limits calculation & storage
│   │   ├── data.ts                    # Schedule types, tasks, period presets & time utils
│   │   ├── groqSchedule.ts            # Client-side image upload & Groq parser caller
│   │   ├── notifications.ts           # Browser notification permission & Web Push helpers
│   │   ├── theme.ts                   # Theme definitions & color palettes
│   │   ├── useTaskTimer.ts            # Pomodoro study timer hook
│   │   └── utils.ts                   # Tailwind cn() class utility
│   ├── pages/
│   │   ├── Index.tsx                  # Main single-page application shell
│   │   └── NotFound.tsx               # 404 fallback page
│   ├── test/                          # Unit and integration test suite (66 tests)
│   │   ├── analytics.test.tsx
│   │   ├── attendance.test.ts
│   │   ├── classFormAutofill.test.tsx
│   │   ├── classReminders.test.ts
│   │   ├── example.test.ts
│   │   ├── groqSchedule.test.ts
│   │   ├── groqScheduleApi.test.ts
│   │   ├── pwa.test.ts
│   │   ├── schedule.test.ts
│   │   ├── setup.ts
│   │   └── theme.test.tsx
│   ├── App.tsx                        # Context providers, routers, and root mounting
│   ├── main.tsx                       # Entry point, service worker registration & GA4 init
│   └── sw.ts                          # Custom Workbox service worker
├── index.html                         # App root HTML with meta tags
├── package.json                       # Project dependencies and npm scripts
├── tsconfig.json                      # TypeScript root configuration
├── vite.config.ts                     # Vite config: code splitting, PWA injectManifest
└── vitest.config.ts                   # Vitest testing configuration
```

---

## 🚀 Core Features & How They Work

### 1. Dynamic Schedule & Timetable
- **Location**: `src/components/StudyFlow/ScheduleView.tsx` & `src/context/ScheduleContext.tsx`.
- **Functionality**:
  - Weekly view organized by day (Sunday through Saturday).
  - Add, edit, or delete classes with period presets (`Period 1: 08:00 - 09:30`, etc.) or custom times.
  - Automatic time overlap validation (`checkScheduleOverlap`) prevents booking conflicting classes on the same day.
  - Displays room numbers, lecture vs. lab status, and lab groups.
  - **"Missed Class" quick button**: Directly on each scheduled card, allowing students to tap and instantly record a missed class for that subject without leaving the schedule view. Includes a 1-tap **Undo** toast.

### 2. AI Schedule Image Import (Groq Vision)
- **Location**: `src/lib/groqSchedule.ts` & `api/groq-schedule.ts`.
- **Functionality**:
  - Allows students to snap or upload a photo of their physical or PDF class timetable.
  - Proxied securely through `api/groq-schedule.ts` using the Groq API (`qwen/qwen3.8-27b`).
  - Resolves course codes to full course names using timetable legends/keys (e.g., `SE2223 -> SE2223 - Web Design & Development II`).
  - Converts all period slots into exact 24-hour time ranges (`HH:mm`).
  - Opens `ScheduleImagePreviewModal.tsx` so students can review, edit, or remove classes before saving them in bulk to their schedule.

### 3. Attendance & Absence Allowance Tracker
- **Location**: `src/lib/attendance.ts`, `src/context/AttendanceContext.tsx`, `src/components/StudyFlow/AttendanceView.tsx`, and `SubjectDetailModal.tsx`.
- **Functionality**:
  - **Schedule Integration**: Clicking "Missed Class" on the schedule immediately updates the subject's absence tally and status.
  - **Configurable Absence Limits**: Defaults to **5 allowed absences** per course, customizable globally or overridden on a per-course basis.
  - **Attendance Hub (4th Tab)**:
    - **4 Key Metric Cards**: Overall attendance rate, total missed, total remaining absences across courses, and count of subjects at risk.
    - **Horizontal Allowance Progress Bars**: Color-coded progress (Green: `<50%`, Yellow: `≥50%`, Amber: `1 absence left`, Red: `Limit reached`).
    - **Streak Tracker & Motivational Messages**: Tracks consecutive attended sessions and shows dynamic feedback.
    - **Subject Detail Modal**: In-depth course view showing attendance history, date logs, limit adjustment, and quick logging.
    - **Recent Activity Log**: Expandable history log with date, subject, and delete confirmation controls.
  - **Auto-Prompt Dialog (`AttendancePrompt.tsx`)**: Polling checks every 60s for classes that ended in the last 30 minutes and prompts: *"Did you attend?"* with Yes/No/Later options (fires at most once per class per day).

### 4. Task Manager & Study Flow Timer
- **Location**: `src/components/StudyFlow/TasksView.tsx`, `TaskDetailView.tsx`, and `src/lib/useTaskTimer.ts`.
- **Functionality**:
  - Organize assignments by subject, priority (`low`, `medium`, `high`), and due date.
  - Filter tasks by `all`, `active`, `overdue`, or `completed`.
  - Built-in study timer tracks focused study sessions per task and records cumulative study duration.

### 5. Class Reminders & Notifications
- **Location**: `src/hooks/useClassReminders.ts` and `src/lib/notifications.ts`.
- **Functionality**:
  - Checks every minute for upcoming classes starting within 15 minutes.
  - Triggers local browser notifications with class subject, room location, and time.
  - Gracefully handles permission states and browser limitations.

### 6. Multi-Theme Engine
- **Location**: `src/lib/theme.ts`, `src/context/ThemeContext.tsx`, and `src/components/ThemePicker.tsx`.
- **Functionality**:
  - Supports multiple custom themes including Light, Dark, Cyberpunk, and high-contrast student palettes.
  - Applies theme variables to the document root and persists choice in `localStorage`.

---

## 🔒 Storage & Privacy Model

All user data is saved exclusively in the client's `window.localStorage` under dedicated keys:

| LocalStorage Key | Type | Description |
|---|---|---|
| `studyflow_schedule` | `ClassSession[]` | User's configured class timetable sessions |
| `studyflow_tasks` | `Task[]` | To-do items, assignments, and study session logs |
| `studyflow_attendance_records` | `AttendanceRecord[]` | History of all attended and missed class logs |
| `studyflow_attendance_settings` | `AttendanceSettings` | Global default and per-subject absence limits |
| `studyflow_attendance_prompted` | `string[]` | Set of unique class keys prompted today to avoid duplicate popups |
| `studyflow_theme` | `string` | Selected theme ID |

> **Resetting data**: Clearing browser site data or localStorage starts the user with a completely clean, fresh canvas.

---

## 📈 Google Analytics 4 Setup

- **Measurement ID**: `G-4DS4SCWLF7`
- **Script Location**: Initialized from `src/lib/analytics.ts` (no gtag script in `index.html`).
- **Module Implementation**: `src/lib/analytics.ts`
- **Behavior**:
  - Initializes **only** in production (`import.meta.env.PROD === true`).
  - In development and test environments, all calls are safe, zero-cost no-ops.
  - Initial configuration sets `send_page_view: false` to eliminate duplicate page views.
  - `src/hooks/usePageViewTracking.ts` handles virtual SPA page views on tab switches (`/`, `/schedule`, `/tasks`, `/attendance`).

---

## 💻 Getting Started & Development

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x or higher)

### Installation
```bash
# Clone the repository
git clone git@github.com:ENGDAWORKCHERNET/flow-diary-sync.git
cd flow-diary-sync

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Starts the local development server at `http://localhost:8080/`.

---

## 🧪 Testing & Quality Assurance

The project includes an automated test suite using **Vitest** and **React Testing Library**:

```bash
# Run tests once
npm test -- --run

# Run tests in watch mode
npm run test:watch

# Check TypeScript types
npx tsc --noEmit
```

### Test Coverage Highlights:
- **`attendance.test.ts`**: Tests absence increments (0 to 1, 3/5 with 2 left), warning levels, independent subject limits, streak calculation, and persistence.
- **`schedule.test.ts`**: Tests timetable loading, empty defaults, period presets, and overlap conflict validation.
- **`analytics.test.tsx`**: Tests GA4 initialization guards, SPA page-view tracking, and duplicate prevention.
- **`classReminders.test.ts`**: Tests 15-minute advance reminder math and notification payloads.
- **`groqSchedule.test.ts` & `groqScheduleApi.test.ts`**: Tests AI timetable parser validation and serverless proxy error handling.
- **`theme.test.tsx`**: Tests theme selection, CSS variables, and persistence.
- **`pwa.test.ts`**: Tests install prompt triggers and standalone mode detection.

---

## 🚢 Deployment (Vercel)

The repository is connected directly to **Vercel** with automatic continuous deployment on every push to the `main` branch.

### Build Configuration:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Production Site:
- **Live URL**: [https://azimuthal-kilonova.vercel.app/](https://azimuthal-kilonova.vercel.app/)

---

## 🤖 Guidelines for AI Agents & Developers

When making modifications or adding new features to StudyFlow:

1. **Maintain Local-First Privacy**: Never introduce mandatory remote database dependencies or authentication walls that lock students out of using the app locally.
2. **Preserve UI Aesthetics**: Respect the glassmorphism design language (`glass-card`, `glass-card-solid`, rounded-2xl / rounded-3xl corners, and typography).
3. **Respect Schedule & Attendance Coupling**: If modifying class sessions or subjects in `ScheduleContext`, ensure that `AttendanceContext` continues to resolve the subject's statistics cleanly.
4. **Guard API & Platform APIs**: Mobile WebViews or Safari private browsing can throw exceptions on bare API access (`Notification`, `sessionStorage`, etc.). Always use safe guards like `isNotificationSupported()` and `try/catch`.
5. **Keep All Tests Passing**: Always run `npx tsc --noEmit` and `npm test -- --run` before committing changes to maintain zero regression.
