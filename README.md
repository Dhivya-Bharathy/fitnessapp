# fitnessapp

Fitness App — AI-powered training (Demic Story–style calisthenics) and Indian diet planning, built with Expo + Supabase.

## Local run

```bash
npm install
cp .env.example .env   # add Supabase + OpenAI keys
npm run web
```

## Netlify deploy

Connect this repo on [Netlify](https://app.netlify.com). Build uses `netlify.toml`.

Set **Site environment variables** (required):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY`
- `EXPO_PUBLIC_OPENAI_MODEL` (e.g. `gpt-4o-mini`)

Do not commit `.env` — it is gitignored.
