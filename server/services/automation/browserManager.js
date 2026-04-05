const puppeteer = require('puppeteer-core');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

const puppeteerExtra = require('puppeteer-extra');
puppeteerExtra.use(StealthPlugin());

class BrowserManager {
  constructor() {
    this.browsers = new Map();
    this.activePages = new Map();
    this.chromePath = null;
    this.chromeAvailable = false;
  }

  async initialize() {
    this.chromePath = await this.findChrome();
    this.chromeAvailable = !!this.chromePath;
    if (this.chromeAvailable) {
      logger.info(`✅ Chrome found at: ${this.chromePath}`);
    } else {
      logger.warn('⚠️ Chrome not found');
    }
  }

  async findChrome() {
    const possiblePaths = [
      // Local project cache (Render build)
      path.join(__dirname, '..', '..', '.cache', 'puppeteer', 'chrome', 'linux-119.0.6045.105', 'chrome-linux64', 'chrome'),
      path.join(__dirname, '..', '..', '.cache', 'puppeteer', 'chrome', 'linux-121.0.6167.85', 'chrome-linux64', 'chrome'),
      path.join(__dirname, '..', '..', '.cache', 'puppeteer', 'chrome', 'linux-122.0.6261.94', 'chrome-linux64', 'chrome'),
      path.join(__dirname, '..', '..', '.cache', 'puppeteer', 'chrome', 'linux-123.0.6312.86', 'chrome-linux64', 'chrome'),
      path.join(__dirname, '..', '..', '.cache', 'puppeteer', 'chrome', 'linux-124.0.6367.60', 'chrome-linux64', 'chrome'),
      // Render disk (if mounted)
      '/opt/render/.cache/puppeteer/chrome/linux-119.0.6045.105/chrome-linux64/chrome',
      '/opt/render/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome',
      '/opt/render/.cache/puppeteer/chrome/linux-122.0.6261.94/chrome-linux64/chrome',
      '/opt/render/.cache/puppeteer/chrome/linux-123.0.6312.86/chrome-linux64/chrome',
      '/opt/render/.cache/puppeteer/chrome/linux-124.0.6367.60/chrome-linux64/chrome',
      // System paths
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/google-chrome'
    ];

    // Try exact paths first
    for (const chromePath of possiblePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        logger.info(`Found Chrome at: ${chromePath}`);
        return chromePath;
      }
    }

    // Try to find in local cache directory
    try {
      const localCache = path.join(__dirname, '..', '..', '.cache', 'puppeteer', 'chrome');
      if (fs.existsSync(localCache)) {
        const dirs = fs.readdirSync(localCache);
        for (const dir of dirs) {
          const chromePath = path.join(localCache, dir, 'chrome-linux64', 'chrome');
          if (fs.existsSync(chromePath)) {
            logger.info(`Found Chrome in local cache: ${chromePath}`);
            return chromePath;
          }
        }
      }
    } catch (e) {
      // Ignore
    }

    // Try which command
    try {
      const { execSync } = require('child_process');
      const chromePath = execSync('which google-chrome || which chromium-browser || which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
      if (chromePath && fs.existsSync(chromePath)) {
        return chromePath;
      }
    } catch (e) {
      // Not found
    }

    return null;
  }

  isAvailable() {
    return this.chromeAvailable;
  }

  async createBrowser(taskId, proxy = null) {
    if (!this.chromeAvailable) {
      throw new Error('Chrome not available. Install with: cd server && PUPPETEER_CACHE_DIR=../.cache/puppeteer npx puppeteer browsers install chrome');
    }

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
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--single-process',
        '--deterministic-fetch',
        '--disable-site-isolation-trials'
      ];

      if (proxy) {
        args.push(`--proxy-server=${proxy}`);
      }

      logger.info(`Launching browser for task ${taskId}`);

      const browser = await puppeteerExtra.launch({
        headless: 'new',
        executablePath: this.chromePath,
        args,
        ignoreHTTPSErrors: true
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
      
      await page.setViewport({
        width: 1366,
        height: 768,
        deviceScaleFactor: 1
      });

      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await page.setUserAgent(userAgent.toString());

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
