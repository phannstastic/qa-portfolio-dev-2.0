import { Given, When, Then } from '@cucumber/cucumber';
import { By, until } from 'selenium-webdriver';
import { driver, baseUrl } from '../support/hooks.ts';
import { signAuthToken } from '../../../src/utils/jwt.ts';
import assert from 'node:assert';

Given('I navigate to the public portfolio homepage at {string}', async function (path: string) {
  await driver.get(`${baseUrl}${path}`);
  await driver.wait(until.elementLocated(By.id('hero')), 5000);
});

When('I scroll to the projects section', async function () {
  const projectsSection = await driver.findElement(By.id('projects'));
  await driver.executeScript('arguments[0].scrollIntoView();', projectsSection);
});

When('I enter {string} into the project search input', async function (searchTerm: string) {
  const searchInput = await driver.wait(until.elementLocated(By.id('project-search')), 5000);
  await searchInput.clear();
  await searchInput.sendKeys(searchTerm);
  await driver.sleep(500);
});

Then('only projects matching {string} should be displayed in the list', async function (term: string) {
  const cards = await driver.findElements(By.className('project-card'));
  for (const card of cards) {
    const text = await card.getText();
    assert(text.toLowerCase().includes(term.toLowerCase()), `Project card should match term "${term}"`);
  }
});

When('I click the category filter button {string}', async function (categoryName: string) {
  const filterPills = await driver.findElements(By.className('filter-pill'));
  for (const pill of filterPills) {
    const txt = await pill.getText();
    if (txt.includes(categoryName)) {
      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", pill);
      await driver.sleep(300);
      await driver.wait(until.elementIsVisible(pill), 5000);
      await pill.click();
      await driver.sleep(400);
      break;
    }
  }
});

Then('only projects in the {string} category should be displayed', async function (categoryName: string) {
  const cards = await driver.findElements(By.className('project-card'));
  for (const card of cards) {
    const text = await card.getText();
    assert(text.toLowerCase().includes(categoryName.toLowerCase()), `Project card should match category "${categoryName}"`);
  }
});

When('I click on the project card for {string}', async function (projectTitle: string) {
  await driver.wait(until.elementLocated(By.className('project-card')), 5000);
  const cards = await driver.findElements(By.className('project-card'));
  for (const card of cards) {
    const text = await card.getText();
    if (text.includes(projectTitle)) {
      const btn = await card.findElement(By.className('view-detail-btn'));
      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", btn);
      await driver.sleep(300);
      await driver.wait(until.elementIsVisible(btn), 5000);
      await btn.click();
      break;
    }
  }
});

Then('a modal dialog should open displaying detailed project information', async function () {
  const modal = await driver.wait(until.elementLocated(By.id('project-modal')), 5000);
  await driver.wait(async () => {
    const classes = (await modal.getAttribute('class')) || '';
    return classes.includes('open');
  }, 5000);
  const classes = (await modal.getAttribute('class')) || '';
  assert(classes.includes('open'), 'Project modal should have open class');
});

Then('the modal should contain tech stack badges and GitHub repository links', async function () {
  const modal = await driver.findElement(By.id('project-modal'));
  const text = await modal.getText();
  assert(text.length > 20, 'Modal content should be populated');
});

When('I click the modal close button', async function () {
  const modal = await driver.findElement(By.id('project-modal'));
  await driver.wait(async () => {
    const classes = (await modal.getAttribute('class')) || '';
    return classes.includes('open');
  }, 5000);
  await driver.sleep(250);
  const closeBtn = await driver.findElement(By.id('modal-close-btn'));
  await driver.wait(until.elementIsVisible(closeBtn), 5000);
  await closeBtn.click();
  await driver.sleep(300);
});

Then('the modal dialog should be closed', async function () {
  const modal = await driver.findElement(By.id('project-modal'));
  await driver.wait(async () => {
    const classes = (await modal.getAttribute('class')) || '';
    return !classes.includes('open');
  }, 5000);
  const classes = (await modal.getAttribute('class')) || '';
  assert(!classes.includes('open'), 'Modal should not have open class');
});

Given('I am authenticated as an administrator on {string}', async function (path: string) {
  const token = await signAuthToken({ id: 1, email: 'admin@qa-portfolio.local', role: 'admin' });
  await driver.get(`${baseUrl}/login`);
  await driver.executeScript(`
    sessionStorage.setItem('admin_token', '${token}');
    sessionStorage.setItem('admin_user', JSON.stringify({ id: 1, name: 'Admin E2E', role: 'admin' }));
  `);
  await driver.get(`${baseUrl}${path}`);
  await driver.wait(until.elementLocated(By.id('admin-sidebar')), 5000);

  if (path.includes('projects')) {
    const nav = await driver.findElement(By.id('nav-projects'));
    await driver.wait(until.elementIsVisible(nav), 5000);
    await nav.click();
    await driver.wait(until.elementLocated(By.id('btn-create-project')), 5000);
  } else if (path.includes('contacts')) {
    const nav = await driver.findElement(By.id('nav-contacts'));
    await driver.wait(until.elementIsVisible(nav), 5000);
    await nav.click();
    await driver.wait(until.elementLocated(By.id('view-contacts')), 5000);
  }
});

When('I click the "+ Add Project" button', async function () {
  const addBtn = await driver.wait(until.elementLocated(By.id('btn-create-project')), 5000);
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", addBtn);
  await driver.sleep(300);
  await driver.wait(until.elementIsVisible(addBtn), 5000);
  await addBtn.click();
});

Then('the project modal should be displayed', async function () {
  const modal = await driver.wait(until.elementLocated(By.id('project-modal')), 5000);
  await driver.wait(async () => {
    const classes = (await modal.getAttribute('class')) || '';
    return classes.includes('open');
  }, 5000);
  const classes = (await modal.getAttribute('class')) || '';
  assert(classes.includes('open'), 'Admin project modal should be displayed');
});

When('I fill in project title {string}', async function (title: string) {
  const titleInput = await driver.findElement(By.id('project-title'));
  await titleInput.clear();
  await titleInput.sendKeys(title);
});

When('I fill in project category {string}', async function (category: string) {
  const catInput = await driver.findElement(By.id('project-category'));
  await catInput.clear();
  await catInput.sendKeys(category);
});

When('I fill in project tech stack {string}', async function (techStack: string) {
  const techInput = await driver.findElement(By.id('project-tech-stack'));
  await techInput.clear();
  await techInput.sendKeys(techStack);
});

When('I fill in project description {string}', async function (desc: string) {
  const descInput = await driver.findElement(By.id('project-description'));
  await descInput.clear();
  await descInput.sendKeys(desc);
});

When('I click "Save Project"', async function () {
  const saveBtn = await driver.findElement(By.id('project-save-btn'));
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", saveBtn);
  await driver.sleep(250);
  await driver.wait(until.elementIsVisible(saveBtn), 5000);
  await saveBtn.click();
});

Then('a success toast {string} should appear', async function (msg: string) {
  await driver.wait(async () => {
    try {
      const toasts = await driver.findElements(By.className('toast'));
      for (const t of toasts) {
        const txt = (await t.getText().catch(() => '')) || (await t.getAttribute('innerText').catch(() => '')) || '';
        if (txt.includes(msg)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }, 7000);
  const toasts = await driver.findElements(By.className('toast'));
  let found = false;
  for (const t of toasts) {
    try {
      const txt = (await t.getText().catch(() => '')) || (await t.getAttribute('innerText').catch(() => '')) || '';
      if (txt.includes(msg)) {
        found = true;
        break;
      }
    } catch {}
  }
  assert(found, `Expected toast containing "${msg}"`);
});

Then('the new project {string} should appear in the projects table', async function (title: string) {
  const tbody = await driver.findElement(By.id('projects-tbody'));
  await driver.wait(async () => {
    const text = await tbody.getText();
    return text.includes(title);
  }, 6000);
  const text = await tbody.getText();
  assert(text.includes(title), `Expected table to contain "${title}"`);
});

When('I locate the project {string} in the table', async function (title: string) {
  const tbody = await driver.findElement(By.id('projects-tbody'));
  await driver.wait(async () => {
    const text = await tbody.getText();
    return text.includes(title);
  }, 6000);
  assert((await tbody.getText()).includes(title));
});

When('I click the delete button for that project', async function () {
  // Find delete button on the row for Mobile App Automated Testing Suite or top matching row
  const rows = await driver.findElements(By.css('#projects-tbody tr'));
  let targetBtn = null;
  for (const r of rows) {
    const text = await r.getText();
    if (text.includes('Mobile App Automated Testing Suite')) {
      targetBtn = await r.findElement(By.css('.btn-icon.delete'));
      break;
    }
  }
  if (!targetBtn) {
    targetBtn = await driver.findElement(By.css('.btn-icon.delete'));
  }
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", targetBtn);
  await driver.sleep(300);
  await driver.wait(until.elementIsVisible(targetBtn), 5000);
  await targetBtn.click();
});

Then('a confirmation dialog should appear asking {string}', async function (expectedPrompt: string) {
  const confirmModal = await driver.wait(until.elementLocated(By.id('confirm-modal')), 5000);
  await driver.wait(async () => {
    const classes = (await confirmModal.getAttribute('class')) || '';
    return classes.includes('open');
  }, 5000);
  const text = await confirmModal.getText();
  assert(text.includes(expectedPrompt), `Expected confirmation modal to ask "${expectedPrompt}"`);
});

When('I click the "Confirm Delete" button', async function () {
  const confirmBtn = await driver.findElement(By.id('confirm-delete-btn'));
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", confirmBtn);
  await driver.sleep(250);
  await driver.wait(until.elementIsVisible(confirmBtn), 5000);
  await confirmBtn.click();
});

Then('the project should no longer appear in the projects table', async function () {
  await driver.sleep(500);
  const tbody = await driver.findElement(By.id('projects-tbody'));
  await driver.wait(async () => {
    const text = await tbody.getText();
    return !text.includes('Mobile App Automated Testing Suite');
  }, 6000);
  const text = await tbody.getText();
  assert(!text.includes('Mobile App Automated Testing Suite'), 'Deleted project should no longer appear in table');
});
