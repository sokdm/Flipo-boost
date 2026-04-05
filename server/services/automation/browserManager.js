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
        '--disable-features=IsolateOrigins,site-per-process'
      ];

      if (proxy) {
        args.push(`--proxy-server=${proxy}`);
      }

      const browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS === 'true' ? 'new' : false,
        args,
        ignoreHTTPSErrors: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
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
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      
      await page.setUserAgent(userAgent.toString());
      await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: true,
        isMobile: false
      });

      // Set extra headers to appear more human
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Override navigator properties
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
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

  async humanLikeDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanLikeScroll(page) {
    await page.evaluate(async () => {
      const scrollHeight = Math.floor(Math.random() * 300) + 100;
      window.scrollBy(0, scrollHeight);
      await new Promise Promise(r => setTimeout(r, Math.random() * 500 + 200));
      if (Math.random() > 0.7) {
        window.scrollBy(0, -scrollHeight / 2);
      }
    });
  }

  async humanLikeMouseMove(page) {
    const x = Math.floor(Math.random() * 800) + 200;
    const y = Math.floor(Math.random() * 600) + 100;
    await page.mouse.move(x, y, { steps: 10 });
  }
}

module.exports = new BrowserManager();
