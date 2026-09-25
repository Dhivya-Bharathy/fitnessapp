/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const siteUrl = (
  process.env.EXPO_PUBLIC_SITE_URL
  || process.env.DEPLOY_PRIME_URL
  || process.env.URL
  || ''
).replace(/\/$/, '');

const ogImage = siteUrl ? `${siteUrl}/og-image.jpg` : '/og-image.jpg';
const webMeta = {
  ...appJson.expo.web.meta,
  'og:image': ogImage,
  'twitter:image': ogImage,
};

module.exports = {
  expo: {
    ...appJson.expo,
    web: {
      ...appJson.expo.web,
      meta: webMeta,
    },
  },
};
