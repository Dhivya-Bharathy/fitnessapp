# Fitness App — one-time Supabase demo setup (run from project root)
# Requires: Supabase CLI (npm i -g supabase), logged in (supabase login)

param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,
  [Parameter(Mandatory = $true)]
  [string]$AnonKey
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$url = "https://$ProjectRef.supabase.co"
@"
EXPO_PUBLIC_SUPABASE_URL=$url
EXPO_PUBLIC_SUPABASE_ANON_KEY=$AnonKey
EXPO_PUBLIC_NVIDIA_MODEL=meta/llama-3.1-70b-instruct
EXPO_PUBLIC_NVIDIA_VISION_MODEL=meta/llama-3.2-90b-vision-instruct
"@ | Set-Content -Path ".env" -Encoding utf8

Write-Host "Wrote .env with Supabase URL $url"

Write-Host "Linking Supabase project..."
supabase link --project-ref $ProjectRef

Write-Host "Applying database schema..."
Get-Content "supabase/migrations/000_full_schema.sql" -Raw | supabase db execute

Write-Host ""
Write-Host "In Supabase Dashboard, also:"
Write-Host "  - Authentication -> Providers -> enable Anonymous sign-ins"
Write-Host "  - Storage -> buckets: avatars (public), partner-media (public)"
Write-Host "  - Database -> Replication -> Realtime on partner_messages"
Write-Host ""
Write-Host "For AI coach / food scanner / voice (optional):"
Write-Host "  supabase secrets set NVIDIA_API_KEY=nvapi-..."
Write-Host "  supabase secrets set NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1"
Write-Host "  supabase secrets set DEEPGRAM_API_KEY=..."
Write-Host "  supabase functions deploy ai-proxy --no-verify-jwt"
Write-Host "  supabase functions deploy deepgram-proxy --no-verify-jwt"
Write-Host ""
Write-Host "Then run: npm run web   (or npx expo start --web)"
