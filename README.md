# fitnessapp

Fitness App — AI training and Indian diet planning, built with Expo + Supabase.

## Local run

```bash
npm install
cp .env.example .env   # add Supabase + OpenAI keys
npm run web
# or: npx expo start --web --port 8086
```

### Google sign-in on localhost (not Netlify)

If login sends you to **Netlify** instead of `localhost`, Supabase is rejecting your local redirect URL.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add every URL you use locally (same port as Expo):
   - `http://localhost:8086`
   - `http://localhost:8086/**`
   - `http://127.0.0.1:8086`
   - (optional) `http://localhost:19006` if you use the default Expo web port
3. Keep your Netlify URL in the list too, e.g. `https://dashing-mermaid-42fea4.netlify.app/**`
4. **Save**, then restart Expo and try again in a **private/incognito** window.

Optional in `.env` (must match a Redirect URL above):

```env
EXPO_PUBLIC_OAUTH_REDIRECT_URL=http://localhost:8086
```

Verify OAuth wiring:

```bash
npm run validate:oauth -- http://localhost:8086/
```

Google Cloud **Authorized redirect URIs** should include only Supabase callback:  
`https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback` (not localhost).

## Netlify deploy

Connect this repo on [Netlify](https://app.netlify.com). Build uses `netlify.toml`.

Set **Site environment variables** (required):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY`
- `EXPO_PUBLIC_OPENAI_MODEL` (e.g. `gpt-4o-mini`)

Do not commit `.env` — it is gitignored.
