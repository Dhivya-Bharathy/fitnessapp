# CalFit — Personal Fitness & Nutrition AI Coach

**Tagline:** Your personal AI-powered fitness and nutrition companion  
**Platform:** iOS, Android, Web (responsive, max-width 480px)  
**Tech Stack:** React Native 0.81.5 + Expo SDK 54 + TypeScript 5.9  
**Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)  
**AI:** NVIDIA Llama 3.1 70B (chat/workout/meal gen) + Llama 3.2 90B Vision (food scanner)  
**Voice:** Deepgram STT (speech-to-text) + expo-speech (TTS workout cues)  
**Developer:** AOT Network (aotnetworklabs@gmail.com)

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Navigation Structure](#2-navigation-structure)
3. [Auth Flow](#3-auth-flow)
4. [Dashboard (HomeScreen)](#4-dashboard-homescreen)
5. [Workouts & Activity](#5-workouts--activity)
6. [AI Coach](#6-ai-coach)
7. [Calorie & Nutrition Tracking](#7-calorie--nutrition-tracking)
8. [Meal Plans (AI-Generated)](#8-meal-plans-ai-generated)
9. [Health Tracking](#9-health-tracking)
10. [Intermittent Fasting](#10-intermittent-fasting)
11. [Journal (Notes)](#11-journal-notes)
12. [Accountability Partners](#12-accountability-partners)
13. [Progress & Analytics](#13-progress--analytics)
14. [Streaks & Milestones](#14-streaks--milestones)
15. [Sleep Tracking](#15-sleep-tracking)
16. [Body Measurements](#16-body-measurements)
17. [Food Scanner (AI Vision)](#17-food-scanner-ai-vision)
18. [Notifications](#18-notifications)
19. [Settings & Profile](#19-settings--profile)
20. [Subscription & Monetization](#20-subscription--monetization)
21. [Data Flow & Services](#21-data-flow--services)
22. [Supabase Database Schema](#22-supabase-database-schema)
23. [Theming & Design System](#23-theming--design-system)

---

## 1. Overview & Architecture

CalFit is a full-featured fitness and nutrition app powered by AI. Users can generate personalized workouts and meal plans, track calories and macros, log sleep and body measurements, manage intermittent fasting, chat with an AI coach (with voice input), partner with friends for accountability, scan food with the camera, and monitor progress with detailed analytics and exportable reports.

### State Management (Zustand)

Four Zustand stores manage all app state:

| Store | Purpose |
|---|---|
| `authStore` | User, session, profile, onboarding status, live steps count |
| `themeStore` | Light/dark color scheme |
| `aiCoachStore` | Current AI workout, saved workouts, chat messages, loading state |
| `mealPlanStore` | Current AI meal plan, saved plans, loading state |

### Key Services

| Service | Purpose |
|---|---|
| `supabase.ts` | Supabase client with cross-platform storage (SecureStore native, localStorage web) |
| `nvidia-client.ts` | All NVIDIA AI API calls (workout gen, meal plan, chat, food scan, recipes) |
| `foodSearchService.ts` | Open Food Facts API + Nigerian local food database fallback |
| `profileService.ts` | Profile CRUD, daily calorie/water/step queries |
| `notificationService.tsx` | In-app notification CRUD and trigger functions |
| `reminderService.ts` | Scheduled local notifications (meal, water, workout, sleep, streak reminders) |
| `aiAnalysisService.ts` | Workout trend analysis, predictions, suggestions |
| `imageService.ts` | Camera/gallery image picking, avatar upload to Supabase Storage |
| `VoiceRecorderService.ts` | Audio recording + Deepgram transcription |
| `stepService.ts` | Pedometer subscription, step data persistence |

---

## 2. Navigation Structure

The app uses React Navigation v7 with conditional stacks based on auth state.

### Root Level

```
NavigationContainer
  ├── user && !isOnboarding → AppStack
  └── otherwise → AuthStack
```

### AuthStack (no headers)

| Route | Screen | Purpose |
|---|---|---|
| `Welcome` | WelcomeScreen | Landing page with features, "Get Started" CTA |
| `Onboarding` | OnboardingScreen | 5-step wizard (welcome → goal → stats → account → generating) |
| `Subscription` | SubscriptionScreen | Tier selection (shown during onboarding) |

### AppStack (Stack Navigator)

| Route | Screen | Purpose |
|---|---|---|
| `Main` | TabNavigator | Main tabbed interface |
| `Settings` | SettingsScreen | Full settings page |
| `EditProfile` | EditProfileScreen | Edit profile fields |
| `Subscription` | SubscriptionScreen | Upgrade/manage tier |

### TabNavigator (Custom Bottom Tab Bar)

**4 visible tabs** + floating RadialMenu "+" button at center:

| Tab | Icon | Screen |
|---|---|---|
| Home | home/home-outline | HomeScreen |
| Calorie | nutrition/nutrition-outline | CalorieScreen |
| AI Coach | bulb/bulb-outline | AICoachScreen |
| Notes | book/book-outline | NotesScreen |

**Radial Menu ("+")** opens a circular menu with 5 options:
- Activity → WorkoutScreen
- Health → MealsScreen
- Meal Plans → MealPlanScreen
- Progress → ProgressScreen
- Scan Food → FoodScannerScreen

**Other screens** accessible from within the app (not tab-level): QuickStart, Analysis, Recap, Streaks, Sleep, Notifications, Accountability, PartnerChat, IntermittentFasting, BodyMeasurements, EquipmentPreferences, DownloadData, Privacy, Goals.

The `useSteps` hook is mounted in TabNavigator (not on individual screens) so the pedometer subscription persists across all navigation.

---

## 3. Auth Flow

CalFit uses **anonymous authentication** — no email, no password, no social login required.

1. User taps "Get Started" on WelcomeScreen → navigates to OnboardingScreen
2. Onboarding steps through: (1) Welcome intro, (2) Goal selection, (3) Height/weight entry, (4) Name/username, (5) Generating/setup
3. On final step, calls `supabase.auth.signInAnonymously()` to create an anonymous Supabase session
4. Profile is saved to the `profiles` table
5. After a 1.5s setup delay, `isOnboarding` flag is set to `false`, and the navigator switches from AuthStack to AppStack
6. Session is persisted via SecureStore (native) or localStorage (web) for return visits
7. **Sign out** clears all Zustand stores and calls `supabase.auth.signOut()`, returning to WelcomeScreen
8. **Delete account** performs local sign-out only (the server-side edge function wasn't implemented)

---

## 4. Dashboard (HomeScreen)

Central command center showing the user's fitness status at a glance.

**Components displayed:**

- **Greeting header** with user name, notification bell badge (unread count), avatar → settings
- **ComebackBanner** — detects inactivity (2+ days), encourages user to return (24h cooldown)
- **BurnoutBanner** — shows when sleep < 6h avg AND workout activity is high
- **StreakRow** — weekly calendar with ring-shaped day dots, current streak count
- **HeroCarousel** — 3 auto-scrolling slides: Calories (consumed/goal), Macros (protein/carbs/fat), Today's Stats (steps, water, sleep)
- **StatCards** — mini cards for water intake, steps progress, sleep hours
- **QuickLog buttons** — +Food, +Water, +Sleep, Workout (each opens the relevant screen)
- **Accountability Partners** card — summary of partner connections
- **Streaks card** — current streak summary

Pull-to-refresh reloads all data.

---

## 5. Workouts & Activity

### Exercise Library

48 bodyweight exercises across 8 categories, each with duration, calorie burn rate, difficulty, muscle groups, equipment needs, and step-by-step instructions:

| Category | Color | # Exercises |
|---|---|---|
| Chest | #F0427C | 6 |
| Back | #4A90E2 | 6 |
| Legs | #9B6FE8 | 6 |
| Shoulders | #FFB830 | 6 |
| Arms | #34D98A | 6 |
| Core | #2BBCB0 | 6 |
| Cardio | #FF6B35 | 6 |
| Full Body | #FF6B9D | 6 |

### WorkoutScreen (ActivityScreen)

- Hero card: total calories burned today, active duration, steps count, daily goal progress bar
- Quick actions: "Start Workout" (Full Body default), "AI Coach"
- AI Workout Analysis CTA → AnalysisScreen
- Category grid: 8 cards with SVG illustrations, exercise counts
- My Routines: scrollable saved custom routines
- Recent Workouts: last 3 completed sessions with calories and duration

### QuickStartScreen

Starts a workout session with:

- **Timer** — counts workout duration
- **Voice cues** — TTS announces exercise name, duration, countdown ("10 seconds left!", "5, 4, 3, 2, 1")
- **Auto-advance** — exercises auto-complete after their duration, next exercise starts after 3s
- **Manual advance** — "Skip" or "Done with this exercise" buttons
- **Stats bar** — elapsed time, calories burned, completion count
- **Progress bar** — visual workout completion
- **AnimatedExerciseDemo** — shows exercise illustration with countdown (for library exercises)
- **AI workout support** — custom exercises from AI Coach with sets/reps/rest/form tips
- **Completion overlay** — "Workout Complete!" modal with duration, calories, exercise count
- **Auto-save** — session saved to `workout_sessions` table on completion

### AnalysisScreen

Workout analysis with period selector (7d, 30d, 90d):

- Total sessions, calories, duration
- Streak tracking
- Weekly breakdown chart
- Category distribution (which body parts trained most)
- Trend analysis
- Goal prediction with estimated completion dates
- Milestone progress (every 10 sessions)
- AI-generated suggestions for improvement
- PDF export of full report

---

## 6. AI Coach

Three-tab interface providing AI-powered fitness guidance:

### Tab 1: Generate

- Workout form: fitness level (beginner/intermediate/advanced), goals (weight loss, muscle gain, etc.), duration (15-60 min), equipment (body-weight, dumbbells, bands, etc.)
- "Generate Workout" button → loading skeleton → workout result
- Result shows: title, description, difficulty rating, duration, warmup, exercises with sets/reps/rest/form tips, cooldown
- Actions: Save workout, Regenerate
- AI generation cached for 5 minutes (identical params return cached result)

### Tab 2: Saved

- List of previously saved AI-generated workouts
- Delete option per workout

### Tab 3: Chat

- Full conversational AI coach with message bubbles
- Text input with voice mic button (Deepgram STT)
- Suggested prompt chips
- Chat history persisted to Supabase `chat_messages` table
- AI can detect chat commands and inline-generate workouts (`<action:generate_workout>`)
- System prompt: AI acts as "certified fitness coach with 15 years experience"
- User profile context includes goals, fitness level, equipment preferences
- User input sanitized: control chars stripped, truncated to 500 chars

---

## 7. Calorie & Nutrition Tracking

### CalorieScreen

Daily calorie tracking hub:

- **Hero card** — calories consumed vs goal, remaining calories, percentage
- **Recipe suggestions** — AI-generated based on remaining daily macros
- **Macro tracking** — protein/carbs/fat progress bars with grams
- **Water intake** — current intake, quick-add +250ml button
- **Meal sections** — Breakfast, Lunch, Dinner, Snacks with food entries
- **Add food** — search via Open Food Facts API, fallback to local Nigerian food database (25 entries: Jollof Rice, Egusi Soup, Suya, Moi Moi, etc.), AI lookup via NVIDIA for any typed food
- **Edit/delete** food entries per meal
- **Calorie trend chart** — 7-day history
- Meals organized by period: breakfast (before 11am), lunch (11am-4pm), dinner (4pm-9pm), snacks (anytime)

### FoodScannerScreen

Camera-based food recognition:

- Take photo or pick from gallery
- Sends base64 JPEG to NVIDIA Llama 3.2 90B Vision model via Supabase proxy
- Returns detected food items with estimated calories, protein, carbs, fat, serving size
- Results directly loggable to meals

### Nigerian Local Food Database

25 Nigerian foods with per-serving nutritional data: Jollof Rice, Fried Rice, White Rice and Stew, Egusi Soup, Ogbono Soup, Okro Soup, Ewedu, Amala, Pounded Yam, Fufu, Garri, Beans and Plantain, Moi Moi, Akara, Boiled Yam, Fried Plantain (Dodo), Suya, Pepper Soup, Grilled Fish, Meat Pie, Puff Puff, Chin Chin, Zobo, Kunun Aya (Tiger Nut Milk), Chapman.

---

## 8. Meal Plans (AI-Generated)

### MealPlanScreen

7-step guided questionnaire:

1. **Health Goal** — Lose Weight, Build Muscle, Stay Fit, Heart Health, More Energy
2. **Budget** — Fixed (enter amount) or Auto-calculate (AI suggests affordable options based on local prices)
3. **Cuisine** — Nigerian, Any, Italian, Asian, Indian, Mexican, American, Mediterranean
4. **Dietary Preferences** — balanced, high_protein, low_carb, vegetarian, vegan, mediterranean, keto, gluten_free, dairy_free, halal
5. **Meals per day** — 2-5
6. **Excluded Foods** — comma-separated list
7. **Calorie Target** — auto-suggested based on goal (1800 for weight loss, 2500 for muscle gain, 2000 for general)

Generates via NVIDIA AI with local Nigerian ingredient knowledge. Plan includes: title, description, daily calories, budget level, meals with foods and macros (protein/carbs/fat), AI notes. Saves to `ai_generated_meal_plans` table. Saved plans viewable with delete option.

---

## 9. Health Tracking

### Steps

- Uses expo-sensors Pedometer (Android ACTIVITY_RECOGNITION, iOS NSMotionUsageDescription)
- Subscription mounted in TabNavigator (persists across all screens)
- Live step count available in Zustand `authStore.liveSteps`
- Saved to `step_logs` table every 60 seconds
- Goal notification fires once per day when step goal reached
- Estimated calorie conversion from steps

### Water Intake

- Quick-add +250ml from dashboard or calorie screen
- Daily water goal configurable in profile
- Visual progress bar

---

## 10. Intermittent Fasting

### IntermittentFastingScreen

- Protocol selection: 16:8, 18:6, 20:4, 24hr, 5:2
- Active timer with progress ring
- Logged to `fasting_logs` table
- Accessible from MealsScreen (Health tab) health card

---

## 11. Journal (Notes)

### NotesScreen

Full CRUD journal with:

- **Welcome view** — empty state with "New Journal Entry" button, "Chat with AI Coach" button, recent entries list
- **Editor** — title input, date badge, content textarea, toolbar: "Send to AI Coach" (discuss entry), Save, Share, Delete
- **Sidebar drawer** — slide-out menu with AI Coach chat link, new journal button, scrollable recent entries list
- Notes synced to Supabase `notes` table
- Share via system share sheet

---

## 12. Accountability Partners

### AccountabilityScreen

- Add up to 3 partners by CalFit ID
- Search suggests users by CalFit ID prefix (min 2 chars)
- Bidirectional partner connection (uses RPC function to bypass RLS for reverse row)
- **Shared Dashboard** — side-by-side streak comparison with VS bar
- **Shared Goals** — set goals with partner via modal
- **Partner cards** — avatar, name, streak, remove option, chat button
- **Milestone notifications** — auto-notify when partner hits milestone streaks (7, 14, 21, 30, 60, 90, 100)
- Data shared: only streaks and workout activity

### PartnerChatScreen

Real-time messaging via Supabase Realtime subscriptions:

- Message history loaded from `partner_messages` table
- Real-time updates via Realtime channel subscription
- Text messages with read receipts
- Push notifications on new messages

---

## 13. Progress & Analytics

### ProgressScreen

Comprehensive progress dashboard:

- Period selector: Week, Month, 3 Months, Year
- Calorie consumed vs burned chart
- Workout stats over time
- Water intake average
- Sleep average
- Step counts
- Weight tracking chart
- BMI display
- Body measurements comparison (before/after)
- Recent workouts list
- Streak count
- PDF export

### RecapScreen

Shareable recap cards:

- 5 design templates: Bold, Gradient, Dark, Sunrise, Minimal
- Recap type: Daily, Weekly, Monthly
- Image export via react-native-view-shot (Android) or text fallback (iOS Expo Go)

---

## 14. Streaks & Milestones

### StreaksScreen

- Current streak with day dots
- Milestone badges: 3, 7, 14, 30, 60, 90, 180, 365 days with emoji celebrations
- Partner streak comparison
- Check-in button
- Weekly calendar view
- Push notification: streak reminder once per day if not checked in

### Streak Logic

- Streak count stored in profile
- Daily check-in increments streak
- Missed day = streak reset
- Last active date tracked for inactivity detection (ComebackBanner)

---

## 15. Sleep Tracking

### SleepScreen

- Log sleep hours (1-12, 0.5 increments via +/- buttons and quick pills)
- Quality rating (1-5 with emoji)
- Notes field
- 7-day history chart with bar graph
- Goal progress
- Average hours calculation
- Stored in `sleep_logs` table

---

## 16. Body Measurements

### BodyMeasurementScreen

- Track: chest, waist, hips, arms, thighs, neck, body fat %
- Form fields for each measurement
- Historical measurements list with trend indicators (up/down arrows)
- Stored in `body_measurements` table

---

## 17. Food Scanner (AI Vision)

### FoodScannerScreen

- Camera capture via expo-camera or gallery pick via expo-image-picker
- Sends base64 JPEG to NVIDIA Llama 3.2 90B Vision model via Supabase Edge Function proxy
- Returns detected food items with: calories, protein, carbs, fat, serving size
- Results shown in card UI with "Log Food" button to add to current meal
- Handles camera permissions, loading state, error state

---

## 18. Notifications

### In-App Notification Inbox (NotificationsScreen)

- 9 notification types: achievement, social, streak, upgrade, coach, community, goal, system, welcome
- Filter by type
- Mark as read, mark all read, delete
- Trigger functions scattered throughout the app:
  - `notifyWorkoutComplete()` — after workout session saved
  - `notifyStreakCheckIn()` — daily streak check
  - `notifyFoodLogged()` — after food entry added
  - `notifyWaterGoalReached()` — when water goal hit
  - `notifyCalorieGoalReached()` — when calorie goal hit
  - `notifyCoachResponse()` — when AI coach responds
  - `notifyProfileComplete()` — after onboarding
  - `sendWelcomeNotification()` — first launch
  - `notifyPartnerMessage()` — new partner chat message
  - `notifyPartnerStreak()` — partner milestone
  - `notifyMealPlanGenerated()` — meal plan created

### Scheduled Reminders (reminderService.ts)

- Meal reminders, water reminders, workout reminders, sleep reminders, streak reminders
- Each scheduled as daily local notification via expo-notifications
- Toggleable from Settings

---

## 19. Settings & Profile

### SettingsScreen

- **Profile card** — name, avatar (tap to change), tap to EditProfile
- **Notification preferences** — toggle push notifications, meal/water/workout/sleep/streak reminders (stored in SecureStore)
- **Theme toggle** — light/dark mode
- **Navigation items** — Privacy Policy, Goals, Equipment Preferences, Download My Data, Subscription
- **Account actions** — Sign Out (confirm dialog), Delete Account
- **App info** — version, developer credit, "App for Sale — Email aotnetworklabs@gmail.com with your offer"

### EditProfileScreen

Editable fields: name, username, height, weight, goal, activity level, dietary preferences, daily calorie goal, protein goal, carb goal, fat goal, water goal, sleep goal, step goal

### GoalsScreen

Fitness goal settings

### PrivacyScreen

Privacy policy text

### EquipmentPreferenceScreen

Select available equipment for AI workout generation

### DownloadDataScreen

Export all user data as CSV or text report

---

## 20. Subscription & Monetization

### SubscriptionScreen

Three tiers currently displayed (all at NGN 0 — stubbed/IAP-ready for future store deployment):

| Tier | Badge | Status |
|---|---|---|
| Starter | — | Free, all features |
| Pro | "BEST VALUE" | Free, all features |
| Premium | — | Free, all features |

The subscription infrastructure, tier display, and upgrade prompts are in place but monetization is not yet active. The app currently offers all features free of charge.

---

## 21. Data Flow & Services

### AI API Flow

```
Client → Supabase Edge Function (ai-proxy) → NVIDIA API → Response → Edge Function → Client
```

- All AI calls go through a Supabase Edge Function proxy (NVIDIA API key stored server-side)
- Retry logic: 3 retries with exponential backoff (1s, 2s, 4s)
- AI API usage logged to `ai_api_usage` table (tokens, latency, status, errors)
- Hardcoded fallbacks if NVIDIA API is unavailable

### Voice Transcription Flow

```
Client (audio recording) → Supabase Edge Function (deepgram-proxy) → Deepgram API → Transcription text → Client → AI Coach Chat
```

### Step Tracking Flow

```
Pedometer sensor → expo-sensors → useSteps hook (TabNavigator level) → Zustand authStore.liveSteps → All screens read from store → Saved to step_logs every 60s
```

### Notification Flow

- In-app: functions create rows in `notifications` table → NotificationsScreen reads and displays
- Push: expo-notifications schedules local notifications
- Streak reminder: checks daily if checked in, fires once per day

---

## 22. Supabase Database Schema

| Table | Key Columns | Purpose |
|---|---|---|
| `profiles` | id, calfit_id, full_name, goal, height_cm, weight_kg, daily_calorie_goal, step_goal, water_goal, sleep_goal, streak_count, last_active_date, avatar_url | User profile and settings |
| `food_logs` | id, user_id, food_name, calories, protein, carbs, fat, meal_type, logged_at | Daily meal entries |
| `water_logs` | id, user_id, amount_ml, logged_at | Water intake records |
| `workout_sessions` | id, user_id, name, status, calories_burned, duration_seconds, exercises, completed_at | Completed workout sessions |
| `workout_routines` | id, user_id, name, exercises, created_at | Saved custom routines |
| `step_logs` | id, user_id, steps, date | Daily step counts |
| `sleep_logs` | id, user_id, hours, quality, notes, date | Sleep duration and quality |
| `fasting_logs` | id, user_id, protocol, fast_hours, eating_hours, started_at, ended_at | Fasting sessions |
| `notifications` | id, user_id, type, title, body, read, created_at | In-app notification inbox |
| `ai_generated_workouts` | id, user_id, title, duration, difficulty, exercises, warmup, cooldown | Saved AI workouts |
| `ai_generated_meal_plans` | id, user_id, title, daily_calories, meals, budget_level | Saved AI meal plans |
| `chat_messages` | id, user_id, role, content, created_at | AI Coach chat history |
| `partner_messages` | id, sender_id, receiver_id, content, created_at, read | Accountability chat |
| `partners` | id, user_id, partner_id, status | Partner relationships |
| `notes` | id, user_id, title, content, created_at | Journal entries |
| `body_measurements` | id, user_id, chest, waist, hips, arms, thighs, neck, body_fat, measured_at | Body measurement history |
| `ai_api_usage` | id, user_id, endpoint, model, tokens, latency, status | AI API usage logging |

### Supabase Edge Functions

- `ai-proxy` — Proxies all NVIDIA AI API calls (Llama 3.1 70B for chat/workout/meal gen, Llama 3.2 90B Vision for food scanning)
- `deepgram-proxy` — Proxies audio transcription to Deepgram API

---

## 23. Theming & Design System

### Color Palette

- **Primary:** CalFit Green (#0DAE6C / #34D98A) — CTAs, active nav, coach buttons
- **Backgrounds:** Light lavender (#F4F0FF), Dark indigo (#08061A)
- **Hero cards:** Deep indigo (#1A1445) with decorative circle patterns
- **Gradients:** Pink (#F0427C) → Orange (#FF6B35) → Yellow (#FFB830) — scan food banner, streak badges, primary CTAs
- **Category colors:** 8 distinct colors for workout categories
- **Day ring colors:** 7 colors for weekly calendar (Teal, Blue, Purple, Orange, Coral, Pink, Grey)
- **Stat cards:** Water (blue), Steps (sage), Sleep (lavender)
- **Macro colors:** Protein (orange #FF6B35), Carbs (yellow #FFB830), Fat (blue #4A90E2)

### Typography

- Font: Plus Jakarta Sans (via Google Fonts) — 7 weights available
- Scale: xs (10px) to massive (48px)
- App uses 900 (black), 800 (extrabold), 700 (bold), 600 (semibold) weights

### Spacing & Radius

- Spacing scale: xs (4px) → huge (64px)
- Radius scale: xs (4px) → full (9999px/rounded)
- Shadow presets: card, modal, accent, subtle (Platform.select for iOS shadow / Android elevation)

### Responsive Design

- Web version centered in max-width 480px container (phone-like layout)
- `moderateScale()` for adaptive font sizes based on 390px base width
- `AndroidSafeView` wrapper handles SafeAreaView (iOS), status bar inset (Android), plain View (Web)

### Light/Dark Mode

- Toggle persisted in Zustand (default: light)
- Full separate color definitions for both modes
- Glass effect overlays with different opacities per mode
- StatusBar style adapts to current theme

---

## Key Differentiators

1. **100% Anonymous** — No email/password/social sign-up required. Just open and use.
2. **AI-First** — Not just a tracker. AI generates personalized workouts, meal plans, food recognition, and conversational coaching.
3. **Localized for Nigeria** — AI knows local ingredients, markets, pricing. Built-in Nigerian food database with 25 staples.
4. **Multi-Platform** — One codebase ships to iOS, Android, and Web.
5. **Privacy-Focused** — Minimal data collection, anonymous by default, user data export available.
6. **No Subscription Required** — All features currently free. Full AI, unlimited chat, food scanning, everything.
7. **Accountability** — Partner system with shared streaks and real-time chat sets it apart from solo fitness apps.

---

## Licensing

### Personal & Educational Use
The source code is publicly available on GitHub for **personal, educational, and portfolio purposes only**. You may view, fork, and modify the code for learning or personal projects.

### Commercial Use
**Commercial use requires a paid Commercial License.** This includes:
- Rebranding and publishing the app on any app store
- Selling the app or a derivative to a client
- Using the codebase as the foundation of a revenue-generating product

### Where to Purchase
| Platform | Link |
|---|---|
| Selar | https://selar.com/39m7437811 |
| Custom / Enterprise | aotnetworklabs@gmail.com |

### What You Get with a Commercial License
- Full source code (ZIP of the latest HEAD)
- Unlimited white-label rights (rebrand, rename, publish as your own)
- No royalties or revenue sharing
- No attribution requirements
- Email support for setup questions
