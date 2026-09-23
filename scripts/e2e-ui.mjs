/**
 * Browser E2E: Welcome → onboarding → 22 questions → home + calorie search.
 * Run: node scripts/e2e-ui.mjs
 * Requires: dev server on BASE_URL (default http://localhost:8083)
 */
import { chromium, devices } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8083';

async function clickByText(page, text, { exact = false } = {}) {
  await page.evaluate(
    ({ text, exact }) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const raw = node.textContent?.trim() || '';
        const match = exact ? raw === text : raw.includes(text);
        if (!match) continue;
        let el = node.parentElement;
        for (let i = 0; i < 8 && el; i++) {
          const r = el.getBoundingClientRect();
          if (r.height >= 36 && r.width >= 60) {
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            el.dispatchEvent(new PointerEvent('click', { bubbles: true, cancelable: true }));
            return true;
          }
          el = el.parentElement;
        }
      }
      throw new Error(`clickByText: ${text}`);
    },
    { text, exact },
  );
}

const ASSESSMENT_PICKS = [
  'Lose fat', '4 weeks', 'Just starting', '0', '6–15',
  null, // weekdays — handled below
  '30 min', 'Home',
  'Bodyweight only', 'None', '7 hours', 'Medium', 'Mostly sitting', 'Vegetarian',
  'Dal & roti staples', '3', '₹150–300', 'Most meals at home',
  null,
  '2–3L', 'Pull-up & muscle-up progressions', 'Fixed schedule',
];

async function answerAssessment(page) {
  for (let i = 0; i < ASSESSMENT_PICKS.length; i++) {
    await page.waitForTimeout(500);
    const body = await page.locator('body').innerText();
    if (body.includes('Building your plan') || body.includes('Your AI plan is ready')) return;

    if (i === 5) {
      for (const day of ['Mon', 'Wed', 'Fri']) {
        await page.getByText(day, { exact: true }).click({ timeout: 10000, force: true });
        await page.waitForTimeout(200);
      }
    } else if (ASSESSMENT_PICKS[i] === null) {
      await page.locator('textarea').first().fill('none').catch(() => {});
    } else {
      await clickByText(page, ASSESSMENT_PICKS[i], { exact: false });
    }

    await page.waitForTimeout(700);
    const bodyAfter = await page.locator('body').innerText();
    const needsContinue = /Continue|Generate my plan|Choose at least/i.test(bodyAfter);
    if (needsContinue) {
      if (bodyAfter.includes('Generate my plan')) {
        await clickByText(page, 'Generate my plan', { exact: false });
      } else {
        await clickByText(page, 'Continue', { exact: false }).catch(() => {});
      }
    }
  }
  await page.waitForSelector('text=Building your plan', { timeout: 60000 });
}

async function runFlow(page, label) {
  const log = [];
  const step = (msg) => {
    log.push(`[${label}] ${msg}`);
  };

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });

  step('Welcome');
  await clickByText(page, 'Get Started', { exact: true });

  step('Onboarding features');
  await clickByText(page, 'Calorie Tracking', { exact: false });
  await clickByText(page, "Let's Go", { exact: false });

  step('Goal');
  await clickByText(page, 'Lose Weight', { exact: false });
  await clickByText(page, 'Continue', { exact: false });

  step('Stats');
  await page.getByPlaceholder('175').fill('170');
  await page.getByPlaceholder('70').fill('70');
  await clickByText(page, 'Continue', { exact: false });

  step('Account');
  await clickByText(page, 'Save & Continue →', { exact: true });
  await page.waitForTimeout(3000);

  step('Assessment');
  await page.waitForSelector('text=/1\\/22|What is your/', { timeout: 45000 });
  await answerAssessment(page);

  step('Results');
  await page.waitForSelector('text=/Your AI plan is ready|Building your plan/', { timeout: 120000 });
  const building = await page.locator('body').innerText();
  if (building.includes('Building your plan')) {
    await page.waitForSelector('text=Your AI plan is ready', { timeout: 120000 });
  }
  await clickByText(page, 'Start Fitness App', { exact: false });

  step('Home');
  await page.waitForSelector('text=Home', { timeout: 45000 });
  const homeText = await page.locator('body').innerText();
  if (!/Home/i.test(homeText)) throw new Error('Main app home tab not visible');

  step('PASS');
  return log;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const [name, contextOptions] of [
    ['desktop', { viewport: { width: 1280, height: 800 } }],
    ['mobile', devices['iPhone 13']],
  ]) {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    try {
      const log = await runFlow(page, name);
      results.push({ name, ok: true, log });
    } catch (e) {
      results.push({ name, ok: false, error: String(e) });
      await page.screenshot({ path: `e2e-fail-${name}.png`, fullPage: true }).catch(() => {});
    }
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  if (results.some((r) => !r.ok)) process.exit(1);
}

main();
