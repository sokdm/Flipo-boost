const puppeteer = require('puppeteer-core');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteerExtra = require('puppeteer-extra');

// Configure stealth plugin
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
    // Store sessions for logged-in accounts
    this.sessions = new Map();
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
      console.log('Mouse move error:', error.message);
      return false;
    }
  }

  // ==========================================
  // TIKTOK SPECIFIC ACTIONS
  // ==========================================
  
  async performTikTokFollow(page, profileUrl) {
    const logs = [];
    
    try {
      logs.push(`Navigating to: ${profileUrl}`);
      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.humanLikeDelay(4000, 6000);
      
      // Check if login required
      const loginPrompt = await page.$('div[data-e2e="login-popup"], .login-mask, div:has-text("Log in to follow")');
      if (loginPrompt) {
        logs.push('Login required to follow on TikTok');
        return { 
          success: false, 
          requiresLogin: true,
          error: 'TikTok requires login to follow users',
          logs 
        };
      }

      // TikTok follow button selectors
      const followSelectors = [
        'button[data-e2e="follow-button"]',
        'button:has-text("Follow")',
        'div[data-e2e="follow-button"]',
        'button[type="button"]:has(div:has-text("Follow"))',
        'div:has-text("Follow"):not(:has-text("Following"))'
      ];
      
      let followBtn = null;
      let usedSelector = null;
      
      for (const selector of followSelectors) {
        try {
          const btn = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
          if (btn) {
            const text = await page.evaluate(el => el.textContent || el.getAttribute('aria-label'), btn);
            if (text && text.toLowerCase().includes('follow') && !text.toLowerCase().includes('following')) {
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
          'div[data-e2e="following-button"]'
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
        return { success: false, error: 'Follow button not found', logs };
      }
      
      logs.push(`Found follow button: ${usedSelector}`);
      
      // Scroll and click
      await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, usedSelector);
      
      await this.humanLikeDelay(1000, 2000);
      await this.humanLikeMouseMove(page, usedSelector);
      
      // Native JS click
      const clickResult = await page.evaluate((selectors) => {
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            const text = (btn.textContent || '').toLowerCase();
            if (text.includes('follow') && !text.includes('following')) {
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Multiple click methods
              try { 
                btn.click(); 
                btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              } catch (e) {}
              
              return { clicked: true, text: btn.textContent };
            }
          }
        }
        return { clicked: false };
      }, followSelectors);
      
      logs.push(`Click result: ${JSON.stringify(clickResult)}`);
      
      if (!clickResult.clicked) {
        return { success: false, error: 'Click failed', logs };
      }
      
      await this.humanLikeDelay(5000, 8000);
      
      // Verify
      const verifyResult = await page.evaluate(() => {
        const followingBtn = document.querySelector('button:has-text("Following"), button:has-text("Unfollow"), [data-e2e="following-button"]');
        if (followingBtn) {
          return { success: true, text: followingBtn.textContent };
        }
        return { success: false };
      });
      
      if (verifyResult.success) {
        return { success: true, verified: true, details: `Now following - ${verifyResult.text}`, logs };
      }
      
      return { success: false, error: 'Verification failed', logs };
      
    } catch (error) {
      logs.push(`Error: ${error.message}`);
      return { success: false, error: error.message, logs };
    }
  }

  // ==========================================
  // INSTAGRAM SPECIFIC ACTIONS
  // ==========================================
  
  async performInstagramFollow(page, profileUrl) {
    const logs = [];
    
    try {
      logs.push(`Navigating to: ${profileUrl}`);
      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.humanLikeDelay(3000, 5000);
      
      // Check for login wall
      const loginWall = await page.$('a[href="/accounts/login/"], div:has-text("Log in to follow")');
      if (loginWall) {
        return {
          success: false,
          requiresLogin: true,
          error: 'Instagram requires login to follow',
          logs
        };
      }

      const followSelectors = [
        'button._acan._acap._acas._aj1-._ap30',
        'button[type="button"]:has-text("Follow")',
        'div[role="button"]:has-text("Follow")',
        'button:has-text("Follow")',
        'svg[aria-label="Follow"]',
        '[data-testid="followBtn"]'
      ];
      
      let followBtn = null;
      let usedSelector = null;
      
      for (const selector of followSelectors) {
        try {
          const btn = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
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
          'button._acan._acap._acat._aj1-'
        ];
        
        for (const selector of followingSelectors) {
          const btn = await page.$(selector);
          if (btn) {
            return { success: true, alreadyFollowing: true, details: 'Already following', logs };
          }
        }
        
        return { success: false, error: 'Follow button not found', logs };
      }
      
      logs.push(`Found button: ${usedSelector}`);
      
      await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, usedSelector);
      
      await this.humanLikeDelay(1000, 2000);
      await this.humanLikeMouseMove(page, usedSelector);
      
      const clickResult = await page.evaluate((selectors) => {
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            try {
              btn.click();
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            } catch (e) {}
            return { clicked: true, text: btn.textContent };
          }
        }
        return { clicked: false };
      }, followSelectors);
      
      await this.humanLikeDelay(5000, 8000);
      
      // Verify
      const verifyResult = await page.evaluate(() => {
        const unfollowBtn = document.querySelector('button:has-text("Following"), button:has-text("Unfollow"), button._acan._acap._acat._aj1-');
        return { success: !!unfollowBtn, text: unfollowBtn?.textContent };
      });
      
      if (verifyResult.success) {
        return { success: true, verified: true, details: verifyResult.text, logs };
      }
      
      return { success: false, error: 'Verification failed', logs };
      
    } catch (error) {
      logs.push(`Error: ${error.message}`);
      return { success: false, error: error.message, logs };
    }
  }

  // ==========================================
  // TWITTER/X SPECIFIC ACTIONS
  // ==========================================
  
  async performTwitterFollow(page, profileUrl) {
    const logs = [];
    
    try {
      logs.push(`Navigating to: ${profileUrl}`);
      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.humanLikeDelay(3000, 5000);
      
      // Check login required
      const loginPrompt = await page.$('a[href="/login"], div:has-text("Sign in to follow")');
      if (loginPrompt) {
        return {
          success: false,
          requiresLogin: true,
          error: 'Twitter requires login to follow',
          logs
        };
      }

      const followSelectors = [
        'button[data-testid="follow"]',
        'button:has-text("Follow")',
        'div[role="button"]:has-text("Follow")'
      ];
      
      let followBtn = null;
      
      for (const selector of followSelectors) {
        try {
          const btn = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
          if (btn) {
            followBtn = btn;
            break;
          }
        } catch (e) {}
      }
      
      if (!followBtn) {
        // Check if already following
        const followingBtn = await page.$('button[data-testid="unfollow"], button:has-text("Following")');
        if (followingBtn) {
          return { success: true, alreadyFollowing: true, details: 'Already following', logs };
        }
        return { success: false, error: 'Follow button not found', logs };
      }
      
      await this.humanLikeMouseMove(page, followSelectors[0]);
      await followBtn.click();
      await this.humanLikeDelay(3000, 5000);
      
      // Verify
      const following = await page.$('button[data-testid="unfollow"]');
      if (following) {
        return { success: true, verified: true, details: 'Now following', logs };
      }
      
      return { success: false, error: 'Verification failed', logs };
      
    } catch (error) {
      logs.push(`Error: ${error.message}`);
      return { success: false, error: error.message, logs };
    }
  }

  // ==========================================
  // YOUTUBE SPECIFIC ACTIONS
  // ==========================================
  
  async performYouTubeSubscribe(page, channelUrl) {
    const logs = [];
    
    try {
      logs.push(`Navigating to: ${channelUrl}`);
      await page.goto(channelUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.humanLikeDelay(3000, 5000);
      
      const subscribeSelectors = [
        'button:has-text("Subscribe")',
        'yt-formatted-string:has-text("Subscribe")',
        'button[aria-label*="Subscribe"]'
      ];
      
      let subBtn = null;
      
      for (const selector of subscribeSelectors) {
        try {
          const btn = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
          if (btn) {
            subBtn = btn;
            break;
          }
        } catch (e) {}
      }
      
      if (!subBtn) {
        const subscribedBtn = await page.$('button:has-text("Subscribed")');
        if (subscribedBtn) {
          return { success: true, alreadySubscribed: true, details: 'Already subscribed', logs };
        }
        return { success: false, error: 'Subscribe button not found', logs };
      }
      
      await this.humanLikeMouseMove(page, subscribeSelectors[0]);
      await subBtn.click();
      await this.humanLikeDelay(3000, 5000);
      
      const subscribed = await page.$('button:has-text("Subscribed")');
      if (subscribed) {
        return { success: true, verified: true, details: 'Subscribed successfully', logs };
      }
      
      return { success: false, error: 'Verification failed', logs };
      
    } catch (error) {
      logs.push(`Error: ${error.message}`);
      return { success: false, error: error.message, logs };
    }
  }

  // ==========================================
  // UNIVERSAL ACTIONS (Work on all platforms)
  // ==========================================
  
  async performLike(page, targetUrl, platform) {
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.humanLikeDelay(2000, 4000);
      
      const selectors = {
        instagram: ['svg[aria-label="Like"]', 'button:has(svg[aria-label="Like"])'],
        tiktok: ['[data-e2e="like-button"]', 'div:has-text("Like"):not(:has-text("Liked"))'],
        twitter: ['button[data-testid="like"]', 'div[role="button"]:has-text("Like")'],
        youtube: ['button[aria-label*="like" i]', 'yt-icon-button:has-text("like")']
      };
      
      const platformSelectors = selectors[platform] || selectors.instagram;
      
      for (const selector of platformSelectors) {
        const btn = await page.$(selector);
        if (btn) {
          await this.humanLikeMouseMove(page, selector);
          await btn.click();
          await this.humanLikeDelay(3000, 5000);
          return { success: true, details: 'Like clicked' };
        }
      }
      
      return { success: false, error: 'Like button not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async performView(page, targetUrl, platform, viewDuration = 15000) {
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const startTime = Date.now();
      
      // Simulate watching with random scrolls
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

  async performShare(page, targetUrl, platform) {
    // Shares are complex, simulate with like as fallback
    return this.performLike(page, targetUrl, platform);
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
