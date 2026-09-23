# CalFit — Getting Started

## Prerequisites

- Node.js **18+**
- Expo CLI (`npm install -g expo-cli`)
- A Supabase account (free tier works)
- (Optional) NVIDIA API key from [build.nvidia.com](https://build.nvidia.com) — for AI coach, meal plans, food scanner
- (Optional) Deepgram API key from [deepgram.com](https://deepgram.com) — for voice-to-text on voice notes

---

## 1. Clone & Install

```bash
git clone <repo-url> calfit
cd calfit
npm install
```

## 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Once created, go to **Project Settings → API** and copy:
   - `Project URL` (e.g. `https://xxxxx.supabase.co`)
   - `anon public key`
3. In the Supabase Dashboard, open **SQL Editor**
4. Run the migration file:
   - `supabase/migrations/000_full_schema.sql`
5. Create storage buckets:
   - **Storage → New bucket** → name: `avatars` → Public
   - **Storage → New bucket** → name: `partner-media` → Public
6. Enable the **Realtime** feature for the `partner_messages` table:
   - **Database → Replication** → enable Realtime for `partner_messages`

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_NVIDIA_API_KEY=optional-nvidia-key
EXPO_PUBLIC_NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
EXPO_PUBLIC_NVIDIA_MODEL=meta/llama-3.1-70b-instruct
EXPO_PUBLIC_NVIDIA_VISION_MODEL=meta/llama-3.2-90b-vision-instruct
EXPO_PUBLIC_DEEPGRAM_KEY=optional-deepgram-key
```

## 4. Run

```bash
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) or press `a` for Android emulator / `i` for iOS simulator.

## 5. Build APK (Android)

```bash
npx expo run:android
```

Or for a standalone build:

```bash
npx expo build:android
```

---

## Project Structure

```
calfit/
├── App.tsx                  # Entry point
├── src/
│   ├── screens/             # All screen components
│   ├── services/            # Supabase, NVIDIA, notifications, etc.
│   ├── store/               # Zustand stores (auth, theme, AI coach, meal plans)
│   ├── modules/             # Feature modules (accountability partners)
│   ├── navigation/          # React Navigation setup
│   ├── utils/               # Helpers (AI prompts, JSON parser)
│   ├── types/               # Shared TypeScript types
│   └── theme.ts             # Light/dark colour system
├── supabase/
│   └── migrations/          # SQL migration files
└── .env                     # Environment variables (gitignored)
```

## Key Features

- Calorie, water, step, and sleep tracking
- AI-powered workout & meal plan generation (NVIDIA)
- Accountability partners with real-time chat
- Personal records tracking
- Body measurement logging
- Intermittent fasting timer
- Light/dark theme
- Data export (JSON)

## For Demo / Portfolio

All API keys are client-side and bundled into the APK. This is acceptable for a demo/portfolio showcase. Before commercial deployment:
1. I would move AI calls behind a server-side proxy
2. I will add rate limiting
3. I will replace anonymous auth with your preferred auth provider
