/**
 * Expo `export -p web` does not copy /public or inject Open Graph tags.
 * Netlify/WhatsApp crawlers need static og:image + meta in index.html.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

const OG_W = 1200;
const OG_H = 630;

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

function copyDir(src, dest, skip = new Set()) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (skip.has(name)) continue;
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to, skip);
    else fs.copyFileSync(from, to);
  }
}

copyDir(publicDir, dist, new Set(['og-image.jpg', 'og-image.png']));

const sourceOg = path.join(publicDir, 'og-image.jpg');
if (fs.existsSync(sourceOg)) {
  const jpegOut = path.join(dist, 'og-image.jpg');
  const pngOut = path.join(dist, 'og-image.png');
  const resized = () => sharp(sourceOg).resize(OG_W, OG_H, { fit: 'cover', position: 'centre' });
  await resized().jpeg({ quality: 85, mozjpeg: true, chromaSubsampling: '4:2:0' }).toFile(jpegOut);
  await resized().png({ compressionLevel: 8 }).toFile(pngOut);
  console.log(`post-export-web: optimized og-image → ${OG_W}x${OG_H} jpg + png`);
} else {
  console.warn('post-export-web: public/og-image.jpg missing');
}

const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

/** Use JPEG under ~300KB — WhatsApp often skips multi‑MB PNG previews. */
const ogImage = siteUrl ? `${siteUrl}/og-image.jpg` : '/og-image.jpg';
const ogUrl = siteUrl ? `${siteUrl}/` : '/';
const ogTitle = 'Fitness App — Your AI Health Companion';

// WhatsApp reads OG tags from early in <head> (see Meta link preview docs).
const previewMeta = `
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:url" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="${OG_W}" />
    <meta property="og:image:height" content="${OG_H}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="Track • Scan • Plan • Get AI Guidance • Stay Healthy" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Fitness App" />
    <meta name="description" content="Your AI Health Companion — track, scan, plan, and get AI guidance." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="Track • Scan • Plan • Get AI Guidance • Stay Healthy" />
    <link rel="image_src" href="${ogImage}" />
    <link rel="preload" as="image" href="${ogImage}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="/favicon.png" type="image/png" />
`;

html = html.replace(/<title>[^<]*<\/title>/i, `<title>${ogTitle}</title>`);
html = html.replace(/<meta name="description"[^>]*>/i, '');
html = html.replace(/<link rel="icon"[^>]*>/gi, '');
html = html.replace(
  /<head>\s*\n/i,
  `<head>\n${previewMeta}\n`,
);

fs.writeFileSync(indexPath, html);
console.log('post-export-web: copied public/ → dist/, injected link preview meta');
console.log('post-export-web: og:image =', ogImage);
