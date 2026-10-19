import 'dotenv/config';
import { Given, When, Then } from '@cucumber/cucumber';
import { By, until } from 'selenium-webdriver';
import { driver, baseUrl, setBaseUrl } from '../support/hooks.ts';
import assert from 'node:assert';

Given('the portfolio application is running at {string}', async function (url: string) {
  setBaseUrl(url);
});

Given('I navigate to the login page at {string}', async function (path: string) {
  await driver.get(`${baseUrl}${path}`);
  await driver.wait(until.elementLocated(By.id('login-form')), 5000);
});

When('I enter email {string} and password {string}', async function (email: string, pass: string) {
  const emailInput = await driver.findElement(By.id('login-email'));
  const passInput = await driver.findElement(By.id('login-password'));
  await emailInput.clear();
  await emailInput.sendKeys(email);
  await passInput.clear();

  // Safely use environment variable for seeded admin without exposing it in feature files
  const actualPass = pass === 'ValidAdminPassword123!' ? (process.env.SEED_ADMIN_PASSWORD || pass) : pass;
  await passInput.sendKeys(actualPass);
});

When('I click the sign in button', async function () {
  const btn = await driver.wait(until.elementLocated(By.id('login-submit-btn')), 5000);
  await driver.wait(until.elementIsVisible(btn), 5000);
  await btn.click();
});

Then('I should be redirected to the admin dashboard at {string}', async function (path: string) {
  await driver.wait(until.urlContains(path), 8000);
  const currentUrl = await driver.getCurrentUrl();
  assert(currentUrl.includes(path), `Expected URL to contain ${path}, got ${currentUrl}`);
});

Then('I should see the dashboard overview with navigation links', async function () {
  const sidebar = await driver.wait(until.elementLocated(By.id('admin-sidebar')), 5000);
  assert(await sidebar.isDisplayed(), 'Admin sidebar should be visible');
});

Then('the session token should be stored securely in sessionStorage', async function () {
  const token = await driver.executeScript("return sessionStorage.getItem('admin_token');");
  assert(token && typeof token === 'string' && token.length > 0, 'admin_token must be present in sessionStorage');
});

Then('I should remain on the login page at {string}', async function (path: string) {
  const currentUrl = await driver.getCurrentUrl();
  assert(currentUrl.includes(path), `Expected to remain on ${path}, got ${currentUrl}`);
});

Then('I should see an error message {string}', async function (expectedMsg: string) {
  const banner = await driver.wait(until.elementLocated(By.id('login-feedback')), 5000);
  await driver.wait(until.elementIsVisible(banner), 5000);
  const text = await banner.getText();
  assert(text.includes(expectedMsg), `Expected error banner to include "${expectedMsg}", got "${text}"`);
});

Then('no session token should be stored in sessionStorage', async function () {
  const token = await driver.executeScript("return sessionStorage.getItem('admin_token');");
  assert(!token, 'sessionStorage must not contain admin_token');
});

Given('I have no active admin session', async function () {
  await driver.get(`${baseUrl}/login`);
  await driver.executeScript("sessionStorage.clear();");
});

When('I navigate directly to the admin dashboard at {string}', async function (path: string) {
  await driver.get(`${baseUrl}${path}`);
});

Then('I should be automatically redirected to the login page at {string}', async function (path: string) {
  await driver.wait(until.urlContains(path), 6000);
  const currentUrl = await driver.getCurrentUrl();
  assert(currentUrl.includes(path), `Expected redirect to ${path}, got ${currentUrl}`);
});

Then('the admin dashboard views should not be revealed', async function () {
  const sidebarList = await driver.findElements(By.id('admin-sidebar'));
  assert(sidebarList.length === 0, 'Admin sidebar should not be revealed when redirected to login');
});
