const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const logger = require('../../utils/logger');

puppeteer.use(StealthPlugin());

class BrowserManager {
  constructor() {
    this.browsers = new Map();
    this.activePages = new Map();
  }

  async createBrowser(taskId, proxy = null) {
    try {
      // FREE TIER: Use puppeteer's bundled Chromium (no disk needed)
      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--single-process', // Critical for free tier (less memory)
        '--no-zygote',
        '--deterministic-fetch',
        '--disable-features=IsolateOrigins,site-per-process,SitePerProcess',
        '--disable-site-isolation-trials'
      ];

      if (proxy) {
        args.push(`--proxy-server=${proxy}`);
      }

      logger.info(`Launching browser for task ${taskId} (Free Tier Mode)`);

      const browser = await puppeteer.launch({
        headless: 'new',
        args,
        ignoreHTTPSErrors: true,
        // No executablePath - uses bundled Chromium
      });

      this.browsers.set(taskId, browser);
      logger.info(`Browser created for task ${taskId}`);
      return browser;
    } catch (error) {
      logger.error(`Failed to create browser for task ${taskId}:`, error);
      throw error;
    }
  }

  async createPage(taskId, platform) {
    try {
      const browser = this.browsers.get(taskId);
      if (!browser) throw new Error('Browser not found');

      const page = await browser.newPage();
      
      // FREE TIER: Minimal viewport to save memory
      await page.setViewport({
        width: 1366,
        height: 768,
        deviceScaleFactor: 1
      });

      // Rotate user agents
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await page.setUserAgent(userAgent.toString());

      // Basic stealth
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
      });

      this.activePages.set(taskId, page);
      return page;
    } catch (error) {
      logger.error(`Failed to create page for task ${taskId}:`, error);
      throw error;
    }
  }

  async closeBrowser(taskId) {
    try {
      const browser = this.browsers.get(taskId);
      if (browser) {
        await browser.close();
        this.browsers.delete(taskId);
        this.activePages.delete(taskId);
        logger.info(`Browser closed for task ${taskId}`);
      }
    } catch (error) {
      logger.error(`Error closing browser for task ${taskId}:`, error);
    }
  }

  async humanLikeDelay(min = 2000, max = 5000) {
    // FREE TIER: Slower delays to avoid detection with fewer resources
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanLikeScroll(page) {
    await page.evaluate(async () => {
      window.scrollBy(0, Math.floor(Math.random() * 200) + 50);
      await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
    });
  }
}

module.exports = new BrowserManager();
