/**
 * Expo `export -p web` does not copy /public or inject Open Graph tags.
 * Netlify/WhatsApp crawlers need static og:image + meta in index.html.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

const siteUrl = (
  process.env.EXPO_PUBLIC_SITE_URL
  || process.env.URL
  || process.env.DEPLOY_PRIME_URL
  || ''
).replace(/\/$/, '');

if (!fs.existsSync(dist)) {
  console.error('post-export-web: dist/ missing — run expo export -p web first');
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

copyDir(publicDir, dist);

const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const ogImage = siteUrl ? `${siteUrl}/og-image.jpg` : '/og-image.jpg';
const ogUrl = siteUrl ? `${siteUrl}/` : '/';

const previewMeta = `
    <meta name="description" content="Your AI Health Companion — track, scan, plan, and get AI guidance." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:title" content="Fitness App — Your AI Health Companion" />
    <meta property="og:description" content="Track • Scan • Plan • Get AI Guidance • Stay Healthy" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Fitness App — Your AI Health Companion" />
    <meta name="twitter:description" content="Track • Scan • Plan • Get AI Guidance • Stay Healthy" />
    <meta name="twitter:image" content="${ogImage}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="/favicon.png" type="image/png" />
`;

html = html.replace(/<meta name="description"[^>]*>/i, '');
html = html.replace(/<link rel="icon"[^>]*>/gi, '');
html = html.replace('</head>', `${previewMeta}\n  </head>`);

fs.writeFileSync(indexPath, html);
console.log('post-export-web: copied public/ → dist/, injected link preview meta');
console.log('post-export-web: og:image =', ogImage);
