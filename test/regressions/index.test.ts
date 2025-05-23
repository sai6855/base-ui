import * as path from 'node:path';
import * as fse from 'fs-extra';
import { chromium, Locator } from '@playwright/test';
import { describe, it } from 'vitest';

const baseUrl = 'http://localhost:5173';
const screenshotDir = path.resolve(__dirname, './screenshots/chrome');

const browser = await chromium.launch({
  args: ['--font-render-hinting=none'],
  // otherwise the loaded google Roboto font isn't applied
  headless: false,
});
// reuse viewport from `vrtest`
// https://github.com/nathanmarks/vrtest/blob/1185b852a6c1813cedf5d81f6d6843d9a241c1ce/src/server/runner.js#L44
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });

// Block images since they slow down tests (need download).
// They're also most likely decorative for documentation demos
await page.route(/./, async (route, request) => {
  const type = await request.resourceType();
  if (type === 'image') {
    route.abort();
  } else {
    route.continue();
  }
});

// Wait for all requests to finish.
// This should load shared resources such as fonts.
await page.goto(`${baseUrl}#no-dev`, { waitUntil: 'networkidle' });

// Simulate portrait mode for date pickers.
// See `useIsLandscape`.
await page.evaluate(() => {
  Object.defineProperty(window.screen.orientation, 'angle', {
    get() {
      return 0;
    },
  });
});

let routes = await page.$$eval('#tests a', (links: HTMLAnchorElement[]) => {
  return links.map((link) => link.href);
});
routes = routes.map((route: string) => route.replace(baseUrl, ''));

async function renderFixture(index: number) {
  // Use client-side routing which is much faster than full page navigation via page.goto().
  // Could become an issue with test isolation.
  // If tests are flaky due to global pollution switch to page.goto(route);
  // puppeteers built-in click() times out
  await page.$eval(`#tests li:nth-of-type(${index + 1}) a`, (link: HTMLAnchorElement) => {
    link.click();
  });
  // Move cursor offscreen to not trigger unwanted hover effects.
  page.mouse.move(0, 0);

  const testcase = page.locator('[data-testid="testcase"]:not([aria-busy="true"])');
  await testcase.waitFor();
  return testcase;
}

async function takeScreenshot({ testcase, route }: { testcase: Locator; route: string }) {
  const screenshotPath = path.resolve(screenshotDir, `.${route}.png`);
  await fse.ensureDir(path.dirname(screenshotPath));

  const explicitScreenshotTarget = await page.$('[data-testid="screenshot-target"]');
  const screenshotTarget = explicitScreenshotTarget || testcase;

  await screenshotTarget?.screenshot({ path: screenshotPath, type: 'png' });
}

// prepare screenshots
await fse.emptyDir(screenshotDir);

describe('visual regressions', () => {
  beforeEach(async () => {
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  routes.forEach((route: string, index: number) => {
    it(
      `creates screenshots of ${route}`,
      // With the playwright inspector we might want to call `page.pause` which would lead to a timeout.
      { timeout: process.env.PWDEBUG ? 0 : 5000 },
      async () => {
        const testcase = await renderFixture(index);

        await takeScreenshot({ testcase, route });
      },
    );
  });
});
