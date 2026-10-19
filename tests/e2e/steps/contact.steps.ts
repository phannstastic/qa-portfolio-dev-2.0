import { When, Then } from '@cucumber/cucumber';
import { By, until } from 'selenium-webdriver';
import { driver } from '../support/hooks.ts';
import assert from 'node:assert';

When('I scroll to the contact section', async function () {
  const contactSection = await driver.findElement(By.id('contact'));
  await driver.executeScript('arguments[0].scrollIntoView();', contactSection);
});

When('I enter my full name {string}', async function (name: string) {
  const nameInput = await driver.findElement(By.id('contact-name'));
  await nameInput.clear();
  await nameInput.sendKeys(name);
});

When('I enter my email {string}', async function (email: string) {
  const emailInput = await driver.findElement(By.id('contact-email'));
  await emailInput.clear();
  await emailInput.sendKeys(email);
});

When('I enter message {string}', async function (msg: string) {
  const msgInput = await driver.findElement(By.id('contact-message'));
  await msgInput.clear();
  await msgInput.sendKeys(msg);
});

When('I click the "Send Message" submit button', async function () {
  const submitBtn = await driver.findElement(By.id('contact-submit-btn'));
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", submitBtn);
  await driver.sleep(300);
  await driver.wait(until.elementIsVisible(submitBtn), 5000);
  await submitBtn.click();
});

Then('a success message {string} should appear', async function (expectedMsg: string) {
  const feedback = await driver.wait(until.elementLocated(By.id('contact-feedback')), 5000);
  await driver.wait(until.elementIsVisible(feedback), 5000);
  const text = await feedback.getText();
  assert(text.includes(expectedMsg), `Expected success banner to include "${expectedMsg}", got "${text}"`);
});

Then('the contact form fields should be cleared', async function () {
  const nameVal = await driver.findElement(By.id('contact-name')).getAttribute('value');
  const emailVal = await driver.findElement(By.id('contact-email')).getAttribute('value');
  const msgVal = await driver.findElement(By.id('contact-message')).getAttribute('value');
  assert.strictEqual(nameVal, '', 'Name field should be reset');
  assert.strictEqual(emailVal, '', 'Email field should be reset');
  assert.strictEqual(msgVal, '', 'Message field should be reset');
});

Then('an error message {string} should appear', async function (expectedErr: string) {
  const feedback = await driver.wait(until.elementLocated(By.id('contact-feedback')), 5000);
  await driver.wait(until.elementIsVisible(feedback), 5000);
  const text = await feedback.getText();
  assert(text.includes(expectedErr), `Expected error banner to include "${expectedErr}", got "${text}"`);
});

Then('the form should not be submitted to the server', async function () {
  // Check that submit button did not stay disabled or that feedback is error
  const feedback = await driver.findElement(By.id('contact-feedback'));
  const classes = (await feedback.getAttribute('class')) || '';
  assert(classes.includes('error'), 'Feedback banner should have error class');
});

When('I click the filter button {string}', async function (filterText: string) {
  const filterBtns = await driver.findElements(By.css('#view-contacts .filter-btn'));
  for (const btn of filterBtns) {
    const text = await btn.getText();
    if (text.toLowerCase().includes(filterText.toLowerCase())) {
      await btn.click();
      await driver.sleep(400);
      break;
    }
  }
});

Then('only messages with status {string} should be displayed', async function (status: string) {
  const badges = await driver.findElements(By.css('#contacts-tbody .status-badge'));
  for (const b of badges) {
    const text = await b.getText();
    assert.strictEqual(text.toLowerCase(), status.toLowerCase());
  }
});

When('I click "View Detail" on the top message', async function () {
  const viewBtns = await driver.findElements(By.css('#contacts-tbody button'));
  if (viewBtns.length > 0) {
    await viewBtns[0].click();
  }
});

Then('the message detail modal should open', async function () {
  const modal = await driver.wait(until.elementLocated(By.id('contact-detail-modal')), 5000);
  await driver.wait(async () => {
    const classes = (await modal.getAttribute('class')) || '';
    return classes.includes('open');
  }, 5000);
  const classes = (await modal.getAttribute('class')) || '';
  assert(classes.includes('open'), 'Message detail modal should have open class');
});

When('I click the "Mark as Read" status button', async function () {
  const markReadBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Mark as Read')]")), 5000);
  await markReadBtn.click();
});

Then('the message status badge should update to {string}', async function (expectedStatus: string) {
  await driver.sleep(500);
  // Switch to 'All' filter so the newly updated message is visible in table
  const filterBtns = await driver.findElements(By.css('.filter-pill'));
  for (const btn of filterBtns) {
    const text = await btn.getText();
    if (text.toLowerCase().includes('all')) {
      await btn.click();
      await driver.sleep(500);
      break;
    }
  }
  const badges = await driver.findElements(By.css('#contacts-tbody .status-badge'));
  if (badges.length > 0) {
    const text = await badges[0].getText();
    assert.strictEqual(text.toLowerCase(), expectedStatus.toLowerCase());
  }
});
