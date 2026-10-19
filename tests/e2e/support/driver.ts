import { Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

/**
 * Creates and configures a headless Chrome WebDriver instance.
 */
export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--force-prefers-reduced-motion');
  const chromeBin = process.env.CHROME_BIN || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  if (chromeBin) {
    options.setChromeBinaryPath(chromeBin);
  }

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Set standard implicit wait timeout
  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 15000 });

  return driver;
}
