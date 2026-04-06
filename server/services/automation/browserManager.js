const puppeteer = require('puppeteer-core');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteerExtra = require('puppeteer-extra');

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.runtime');
stealth.enabledEvasions.delete('navigator.plugins');
puppeteerExtra.use(stealth);

class BrowserManager {
  constructor() {
    this.browsers = new Map();
    this.activePages = new Map();
    this.chromePath = null;
    this.chromeAvailable = false;
    this.proxyList = [];
  }

  async initialize() {
    this.chromePath = await this.findChrome();
    this.chromeAvailable = !!this.chromePath;
    
    this.proxyList = [
      process.env.PROXY_1,
      process.env.PROXY_2,
      process.env.PROXY_3,
      process.env.PROXY_4,
      process.env.PROXY_5
    ].filter(Boolean);
    
    console.log(`BrowserManager initialized. Chrome: ${this.chromeAvailable}, Proxies: ${this.proxyList.length}`);
  }

  async findChrome() {
    const fs = require('fs');
    const possiblePaths = [
      '/opt/render/project/src/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser'
    ];

    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        console.log('Found Chrome at:', chromePath);
        return chromePath;
      }
    }
    return null;
  }

  isAvailable() {
    return this.chromeAvailable;
  }

  getRandomProxy() {
    if (!this.proxyList || this.proxyList.length === 0) {
      return null;
    }
    const proxy = this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
    
    if (proxy && proxy.includes('@')) {
      try {
        const url = new URL(proxy);
        return {
          server: `${url.protocol}//${url.hostname}:${url.port}`,
          username: url.username,
          password: url.password
        };
      } catch (e) {
        return { server: proxy };
      }
    }
    
    return { server: proxy };
  }

  async createBrowser(taskId, proxyConfig = null) {
    if (!this.chromeAvailable) {
      throw new Error('Chrome not available');
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
        '--disable-blink-features=AutomationControlled',
        '--disable-features=site-per-process',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      ];

      if (proxyConfig?.server) {
        args.push(`--proxy-server=${proxyConfig.server}`);
      }

      console.log(`[${taskId}] Launching browser${proxyConfig?.server ? ' with proxy' : ''}`);

      const browser = await puppeteerExtra.launch({
        headless: 'new',
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
      console.error(`[${taskId}] Failed to create browser:`, error);
      throw error;
    }
  }

  async createPage(taskId, platform, proxyConfig = null) {
    try {
      const browser = this.browsers.get(taskId);
      if (!browser) throw new Error('Browser not found');

      const page = await browser.newPage();
      
      await page.setViewport({
        width: 1366 + Math.floor(Math.random() * 200),
        height: 768 + Math.floor(Math.random() * 200),
        deviceScaleFactor: 1
      });

      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      ];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      await page.setUserAgent(userAgent);

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });

      if (proxyConfig?.username) {
        await page.authenticate({
          username: proxyConfig.username,
          password: proxyConfig.password
        });
      }

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
        
        window.chrome = { runtime: {} };
        
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' 
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
        );
        
        if (!window.Notification) {
          window.Notification = { permission: 'default' };
        }
        
        delete navigator.__proto__.webdriver;
        
        Object.defineProperty(navigator, 'mimeTypes', {
          get: () => [
            { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
            { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
          ]
        });
      });

      await page.setRequestInterception(true);
      
      page.on('request', request => {
        const url = request.url();
        if (url.includes('follow') || url.includes('like') || url.includes('comment') || 
            url.includes('create') || url.includes('api') || url.includes('friendship')) {
          console.log(`[${taskId}] Request: ${request.method()} ${url.substring(0, 100)}`);
        }
        request.continue();
      });

      page.on('response', async response => {
        const url = response.url();
        if (url.includes('follow') || url.includes('like') || url.includes('comment') || 
            url.includes('create') || url.includes('api') || url.includes('friendship')) {
          const status = response.status();
          let body = '';
          try {
            body = await response.text();
          } catch (e) {
            body = 'unreadable';
          }
          console.log(`[${taskId}] Response: ${status} ${url.substring(0, 100)} - ${body.substring(0, 200)}`);
        }
      });

      page.on('dialog', async dialog => {
        console.log(`[${taskId}] Dialog: ${dialog.type()} - ${dialog.message()}`);
        await dialog.dismiss();
      });

      this.activePages.set(taskId, page);
      return page;
    } catch (error) {
      console.error(`[${taskId}] Failed to create page:`, error);
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
        console.log(`[${taskId}] Browser closed`);
      }
    } catch (error) {
      console.error(`[${taskId}] Error closing browser:`, error);
    }
  }

  async humanLikeDelay(min = 5000, max = 10000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanLikeMouseMove(page, selector) {
    try {
      const element = await page.$(selector);
      if (!element) return false;
      
      const box = await element.boundingBox();
      if (!box) return false;
      
      const x = box.x + box.width / 2 + (Math.random() * 20 - 10);
      const y = box.y + box.height / 2 + (Math.random() * 20 - 10);
      
      await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 10) });
      await this.humanLikeDelay(500, 1500);
      return true;
    } catch (error) {
      return false;
    }
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
