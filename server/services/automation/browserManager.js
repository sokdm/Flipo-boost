const puppeteer = require('puppeteer-core');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');

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
  }

  async findChrome() {
    const fs = require('fs');
    const path = require('path');
    
    const possiblePaths = [
      '/opt/render/project/src/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome',
      ...this.findChromeInCache('/opt/render/project/src/.cache/puppeteer'),
      '/usr/bin/google-chrome',
      '/usr/bin/chromium'
    ].filter(Boolean);

    for (const chromePath of possiblePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        console.log('Found Chrome at:', chromePath);
        return chromePath;
      }
    }
    return null;
  }

  findChromeInCache(cacheDir) {
    try {
      if (!require('fs').existsSync(cacheDir)) return [];
      const chromeDir = require('path').join(cacheDir, 'chrome');
      if (!require('fs').existsSync(chromeDir)) return [];
      const versions = require('fs').readdirSync(chromeDir).filter(d => d.startsWith('linux-'));
      return versions.map(v => require('path').join(chromeDir, v, 'chrome-linux64', 'chrome'));
    } catch (e) { return []; }
  }

  isAvailable() {
    return this.chromeAvailable;
  }

  async createBrowser(taskId, proxy = null) {
    if (!this.chromeAvailable) {
      throw new Error('Chrome not available');
    }

    try {
      // Headless mode with stealth
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
        '--disable-infobars',
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--password-store=basic',
        '--use-mock-keychain',
        '--single-process',
        '--no-zygote'
      ];

      if (proxy) {
        args.push(`--proxy-server=${proxy}`);
      }

      console.log(`Launching browser for task ${taskId}`);

      const browser = await puppeteerExtra.launch({
        headless: 'new', // Back to headless
        executablePath: this.chromePath,
        args,
        ignoreHTTPSErrors: true,
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });

      this.browsers.set(taskId, browser);
      return browser;
    } catch (error) {
      console.error(`Failed to create browser for task ${taskId}:`, error);
      throw error;
    }
  }

  async createPage(taskId, platform) {
    try {
      const browser = this.browsers.get(taskId);
      if (!browser) throw new Error('Browser not found');

      const page = await browser.newPage();
      
      // Desktop viewport (more reliable than mobile in headless)
      await page.setViewport({
        width: 1366 + Math.floor(Math.random() * 200),
        height: 768 + Math.floor(Math.random() * 200),
        deviceScaleFactor: 1
      });

      // Realistic user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      ];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      await page.setUserAgent(userAgent);

      // Override navigator
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        window.chrome = { runtime: {} };
        window.navigator.chrome = { runtime: {} };
      });

      this.activePages.set(taskId, page);
      return page;
    } catch (error) {
      console.error(`Failed to create page for task ${taskId}:`, error);
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
      }
    } catch (error) {
      console.error(`Error closing browser for task ${taskId}:`, error);
    }
  }

  // Long delays
  async humanLikeDelay(min = 5000, max = 10000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanLikeScroll(page) {
    await page.evaluate(async () => {
      const scrolls = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < scrolls; i++) {
        window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
        await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
      }
    });
  }
}

module.exports = new BrowserManager();
