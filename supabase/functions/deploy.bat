@echo off
REM ──────────────────────────────────────────────────────
REM  Deploy Supabase Edge Functions for CalFit
REM ──────────────────────────────────────────────────────
REM  Prerequisites:
REM    1. Node.js installed
REM    2. Run:  npm i -g supabase
REM    3. Run:  supabase login
REM    4. Get your project ref from https://supabase.com/dashboard/project
REM ──────────────────────────────────────────────────────

echo.
echo === Step 1: Link to your Supabase project ===
echo Run: supabase link --project-ref YOUR_PROJECT_REF
echo.

echo === Step 2: Set API secrets (server-side, never in bundle) ===
echo supabase secrets set NVIDIA_API_KEY=nvapi-your-key-here
echo supabase secrets set NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
echo supabase secrets set DEEPGRAM_API_KEY=your-deepgram-key-here
echo.

echo === Step 3: Deploy the functions ===
echo supabase functions deploy ai-proxy --no-verify-jwt --timeout 30
echo supabase functions deploy deepgram-proxy --no-verify-jwt --timeout 30
echo.

echo === Step 4: Verify ===
echo supabase functions list
echo.

pause
