import { Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../support/driver.ts';

// Set standard timeout for UI interactions (30 seconds)
setDefaultTimeout(30 * 1000);

export let driver: WebDriver;
export let baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3001';

export function setBaseUrl(url: string) {
  baseUrl = process.env.E2E_BASE_URL || url;
}

Before(async function () {
  driver = await createDriver();
});

After(async function () {
  if (driver) {
    try {
      await driver.quit();
    } catch {
      // Ignore cleanup error
    }
  }
});
