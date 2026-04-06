const puppeteer = require('puppeteer-core');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteerExtra = require('puppeteer-extra');

// Configure stealth plugin with all evasions
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.runtime'); // Fix chrome.runtime issue
stealth.enabledEvasions.delete('navigator.plugins'); // Better plugin handling
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
    
    // Load proxies from environment
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
    const path = require('path');
    
    const possiblePaths = [
      '/opt/render/project/src/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome',
      '/opt/render/project/src/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];

    for (const chromePath of possiblePaths) {
      if (chromePath.includes('*')) {
        // Handle glob patterns
        const dir = path.dirname(chromePath.split('*')[0]);
        if (fs.existsSync(dir)) {
          const versions = fs.readdirSync(dir).filter(d => d.startsWith('linux-'));
          for (const v of versions) {
            const fullPath = path.join(dir, v, 'chrome-linux64', 'chrome');
            if (fs.existsSync(fullPath)) {
              console.log('Found Chrome at:', fullPath);
              return fullPath;
            }
          }
        }
      } else if (fs.existsSync(chromePath)) {
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
    
    // Parse proxy URL for authentication
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
      // Chrome args optimized for Render and anti-detection
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
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--disable-features=InterestFeedContentSuggestions',
        '--disable-features=MediaRouter',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list'
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
      
      // Set realistic viewport
      await page.setViewport({
        width: 1366 + Math.floor(Math.random() * 200),
        height: 768 + Math.floor(Math.random() * 200),
        deviceScaleFactor: 1
      });

      // Set user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
      ];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(userAgent);

      // Set extra headers
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

      // Authenticate proxy if needed
      if (proxyConfig?.username) {
        await page.authenticate({
          username: proxyConfig.username,
          password: proxyConfig.password
        });
      }

      // Override navigator and webdriver properties
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
        
        // Override chrome
        window.chrome = { runtime: {} };
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' 
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
        );
        
        // Add notification permission
        if (!window.Notification) {
          window.Notification = { permission: 'default' };
        }
        
        // Override webdriver
        delete navigator.__proto__.webdriver;
        
        // Add plugins
        Object.defineProperty(navigator, 'mimeTypes', {
          get: () => [
            { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
            { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
          ]
        });
      });

      // Enable request/response logging for debugging
      await page.setRequestInterception(true);
      
      page.on('request', request => {
        const url = request.url();
        if (url.includes('follow') || url.includes('like') || url.includes('comment') || 
            url.includes('create') || url.includes('api')) {
          console.log(`[${taskId}] Request: ${request.method()} ${url.substring(0, 100)}`);
        }
        request.continue();
      });

      page.on('response', async response => {
        const url = response.url();
        if (url.includes('follow') || url.includes('like') || url.includes('comment') || 
            url.includes('create') || url.includes('api')) {
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

      // Handle dialogs
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

  async humanLikeMouseMove(page, selector) {
    try {
      const element = await page.$(selector);
      if (!element) return false;
      
      const box = await element.boundingBox();
      if (!box) return false;
      
      // Move to random position within element
      const x = box.x + box.width / 2 + (Math.random() * 20 - 10);
      const y = box.y + box.height / 2 + (Math.random() * 20 - 10);
      
      // Move with steps (human-like path)
      await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 10) });
      await this.humanLikeDelay(500, 1500);
      return true;
    } catch (error) {
      console.log('Mouse move error:', error.message);
      return false;
    }
  }

  async performFollow(page, profileUrl, platform = 'instagram') {
    const logs = [];
    const screenshot = async (name) => {
      try {
        await page.screenshot({ path: `debug-${name}-${Date.now()}.png`, fullPage: true });
      } catch (e) {}
    };

    try {
      logs.push(`Navigating to: ${profileUrl}`);
      await page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await this.humanLikeDelay(3000, 5000);
      await this.humanLikeScroll(page);
      
      // Platform-specific selectors
      const selectors = {
        instagram: [
          'button._acan._acap._acas._aj1-._ap30',
          'button[type="button"]:has-text("Follow")',
          'button:has-text("Follow")',
          'svg[aria-label="Follow"]',
          '[data-testid="followBtn"]',
          'button._acan',
          'div[role="button"]:has-text("Follow")'
        ],
        twitter: [
          'button[data-testid="follow"]',
          'button:has-text("Follow")',
          'div[role="button"]:has-text("Follow")'
        ],
        tiktok: [
          'button[data-e2e="follow-button"]',
          'button:has-text("Follow")'
        ]
      };

      const platformSelectors = selectors[platform] || selectors.instagram;
      
      let followBtn = null;
      let usedSelector = null;
      
      // Find follow button
      for (const selector of platformSelectors) {
        try {
          const btn = await page.waitForSelector(selector, { visible: true, timeout: 5000 });
          if (btn) {
            const text = await page.evaluate(el => el.textContent || el.getAttribute('aria-label'), btn);
            if (text && text.toLowerCase().includes('follow')) {
              followBtn = btn;
              usedSelector = selector;
              break;
            }
          }
        } catch (e) {}
      }
      
      if (!followBtn) {
        // Check if already following
        const followingSelectors = [
          'button:has-text("Following")',
          'button:has-text("Unfollow")',
          '[data-testid="unfollow"]'
        ];
        
        for (const selector of followingSelectors) {
          const btn = await page.$(selector);
          if (btn) {
            return { 
              success: true, 
              alreadyFollowing: true,
              details: 'Already following this user',
              logs 
            };
          }
        }
        
        logs.push('Follow button not found');
        await screenshot('no-button');
        return { success: false, error: 'Follow button not found', logs };
      }
      
      logs.push(`Found follow button: ${usedSelector}`);
      
      // Scroll into view
      await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, usedSelector);
      
      await this.humanLikeDelay(1000, 2000);
      
      // Move mouse to button
      await this.humanLikeMouseMove(page, usedSelector);
      
      // Try multiple click methods
      const clickResult = await page.evaluate((selectors) => {
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
            if (text.includes('follow')) {
              // Scroll into view
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Method 1: Native click
              try { btn.click(); } catch (e) {}
              
              // Method 2: MouseEvent
              try {
                btn.dispatchEvent(new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                }));
              } catch (e) {}
              
              // Method 3: Full event sequence
              try {
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              } catch (e) {}
              
              return { clicked: true, selector: sel, text: btn.textContent };
            }
          }
        }
return { clicked: false };
      }, platformSelectors);
      
      logs.push(`Click result: ${JSON.stringify(clickResult)}`);
      
      if (!clickResult.clicked) {
        return { success: false, error: 'Click failed', logs };
      }
      
      // Wait for API response
      await this.humanLikeDelay(5000, 8000);
      
      // Verify by checking button changed to "Following"
      const verifyResult = await page.evaluate((selectors) => {
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
            if (text.includes('following') || text.includes('unfollow')) {
              return { success: true, text: text, selector: sel };
            }
          }
        }
        return { success: false };
      }, platformSelectors);
      
      logs.push(`Verification: ${JSON.stringify(verifyResult)}`);
      
      if (verifyResult.success) {
        return { 
          success: true, 
          verified: true,
          details: `Button now shows "${verifyResult.text}"`,
          logs 
        };
      } else {
        await screenshot('verify-fail');
        return { 
          success: false, 
          error: 'Verification failed - button state did not change',
          possibleBlock: true,
          logs 
        };
      }
      
    } catch (error) {
      logs.push(`Error: ${error.message}`);
      await screenshot('error');
      return { success: false, error: error.message, logs };
    }
  }

  async performLike(page, targetUrl, platform = 'instagram') {
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.humanLikeDelay(2000, 4000);
      
      const likeSelectors = {
        instagram: [
          'svg[aria-label="Like"]',
          'button:has(svg[aria-label="Like"])',
          '[data-testid="like-button"]'
        ],
        twitter: [
          'button[data-testid="like"]',
          'button:has-text("Like")'
        ],
        tiktok: [
          '[data-e2e="like-button"]'
        ]
      };
      
      const selectors = likeSelectors[platform] || likeSelectors.instagram;
      
      for (const selector of selectors) {
        const btn = await page.$(selector);
        if (btn) {
          await this.humanLikeMouseMove(page, selector);
          
          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) {
              el.click();
              el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
          }, selector);
          
          await this.humanLikeDelay(3000, 5000);
          
          // Verify
          const liked = await page.evaluate(() => {
            return !!document.querySelector('svg[aria-label="Unlike"]') ||
                   !!document.querySelector('svg[fill="#ed4956"]');
          });
          
          return { success: liked, details: liked ? 'Like confirmed' : 'Like not confirmed' };
        }
      }
      
      return { success: false, error: 'Like button not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async performComment(page, targetUrl, platform = 'instagram', commentText = 'Great post! 🔥') {
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.humanLikeDelay(3000, 5000);
      
      const commentSelectors = {
        instagram: {
          input: 'textarea[aria-label="Add a comment…"], textarea[placeholder="Add a comment…"]',
          submit: 'button[type="submit"]:has-text("Post"), button:has-text("Post")'
        },
        twitter: {
          input: 'div[data-testid="tweetTextarea_0"], div[role="textbox"]',
          submit: 'button[data-testid="tweetButton"], button:has-text("Reply")'
        }
      };
      
      const selectors = commentSelectors[platform] || commentSelectors.instagram;
      
      // Click on input
      const input = await page.$(selectors.input);
      if (!input) {
        return { success: false, error: 'Comment input not found' };
      }
      
      await this.humanLikeMouseMove(page, selectors.input);
      await input.click();
      await this.humanLikeDelay(1000, 2000);
      
      // Type comment with human-like delays
      await input.type(commentText, { delay: 100 + Math.random() * 200 });
      await this.humanLikeDelay(2000, 4000);
      
      // Submit
      const submit = await page.$(selectors.submit);
      if (submit) {
        await this.humanLikeMouseMove(page, selectors.submit);
        await submit.click();
        await this.humanLikeDelay(5000, 8000);
        
        return { success: true, commentPosted: true, commentText };
      }
      
      return { success: false, error: 'Submit button not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async performView(page, targetUrl, platform = 'tiktok', viewDuration = 10000) {
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Simulate watching
      const startTime = Date.now();
      
      // Random scrolls while watching
      while (Date.now() - startTime < viewDuration) {
        await this.humanLikeScroll(page);
        await this.humanLikeDelay(2000, 4000);
      }
      
      return { 
        success: true, 
        viewTime: Date.now() - startTime,
        details: `Viewed for ${(Date.now() - startTime)/1000}s`
      };
    } catch (error) {
      return { success: false, error: error.message };
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
