const BotAccount = require('../../models/BotAccount');
const browserManager = require('./browserManager');

class BotPoolManager {
  constructor() {
    this.activeBots = new Map();
    this.dailyLimits = {
      tiktok: { follows: 40, likes: 100, views: 500 },
      instagram: { follows: 30, likes: 80, comments: 20, views: 300 },
      twitter: { follows: 40, likes: 100 },
      youtube: { subscribes: 20, likes: 50, views: 200 }
    };
  }

  async initialize() {
    console.log('BotPoolManager initialized');
    await BotAccount.updateMany(
      { status: 'active' },
      { $set: { status: 'active', lastUsed: null } }
    );
  }

  async getAvailableBot(platform, actionType) {
    const today = new Date().toISOString().split('T')[0];
    const limit = this.dailyLimits[platform]?.[actionType] || 50;

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const bot = await BotAccount.findOne({
      platform: platform,
      status: 'active',
      $or: [
        { lastUsed: { $lt: tenMinutesAgo } },
        { lastUsed: null }
      ],
      $expr: {
        $lt: [
          { $ifNull: [{ $getField: { field: today, input: { $ifNull: ['$dailyActions', {}] } } }, 0] },
          limit
        ]
      }
    }).sort({ lastUsed: 1 });

    if (!bot) {
      console.log(`[BotPool] No available bots for ${platform}/${actionType}`);
      return null;
    }

    this.activeBots.set(bot._id.toString(), {
      botId: bot._id,
      platform,
      actionType,
      startTime: Date.now()
    });

    return bot;
  }

  async releaseBot(botId, success = true, errorMessage = null) {
    const botIdStr = botId.toString();
    const usage = this.activeBots.get(botIdStr);
    
    if (!usage) return;

    const today = new Date().toISOString().split('T')[0];
    const update = {
      lastUsed: new Date(),
      $inc: {}
    };

    if (success) {
      update.$inc[`dailyActions.${today}`] = 1;
      update.$inc.totalActions = 1;
      update.errorCount = 0;
    } else {
      update.errorCount = 1;
      update.lastError = errorMessage;
      
      const bot = await BotAccount.findById(botId);
      if (bot && bot.errorCount >= 2) {
        update.status = 'error';
      }
    }

    await BotAccount.findByIdAndUpdate(botId, update);
    this.activeBots.delete(botIdStr);
  }

  async loadBotSession(page, bot) {
    if (bot.cookies && bot.cookies.length > 0) {
      try {
        const validCookies = bot.cookies.filter(cookie => {
          if (!cookie.name || !cookie.value) return false;
          if (cookie.expires && cookie.expires < Date.now() / 1000) return false;
          return true;
        });

        if (validCookies.length > 0) {
          await page.setCookie(...validCookies);
          console.log(`[BotPool] Loaded ${validCookies.length} cookies for ${bot.username}`);
          return true;
        }
      } catch (error) {
        console.error(`[BotPool] Error loading cookies:`, error);
      }
    }
    return false;
  }

  async saveBotSession(page, botId) {
    try {
      const cookies = await page.cookies();
      const relevantCookies = cookies.filter(cookie => {
        const domain = cookie.domain || '';
        return domain.includes('tiktok.com') || 
               domain.includes('instagram.com') || 
               domain.includes('twitter.com') ||
               domain.includes('youtube.com');
      });

      await BotAccount.findByIdAndUpdate(botId, {
        cookies: relevantCookies,
        updatedAt: new Date()
      });

      console.log(`[BotPool] Saved ${relevantCookies.length} cookies`);
      return true;
    } catch (error) {
      console.error(`[BotPool] Error saving session:`, error);
      return false;
    }
  }

  async validateBotSession(page, platform) {
    try {
      if (platform === 'tiktok') {
        // Check if we're on the main page and logged in
        const currentUrl = page.url();
        if (currentUrl.includes('login')) return false;
        
        // Check for profile/upload indicators
        const isLoggedIn = await page.evaluate(() => {
          const uploadBtn = document.querySelector('a[href="/upload"]');
          const profileIcon = document.querySelector('[data-e2e="nav-profile"]');
          const inboxIcon = document.querySelector('[data-e2e="nav-inbox"]');
          return !!(uploadBtn || profileIcon || inboxIcon);
        });
        return isLoggedIn;
      }
      
      if (platform === 'instagram') {
        const isLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('svg[aria-label="Home"]') ||
                 !!document.querySelector('a[href="/"]');
        });
        return isLoggedIn;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  async loginBot(page, bot) {
    console.log(`[BotPool] Logging in ${bot.username} on ${bot.platform}`);
    
    try {
      if (bot.platform === 'tiktok') {
        return await this.loginTikTok(page, bot);
      }
      return { success: false, error: 'Platform not supported' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loginTikTok(page, bot) {
    try {
      console.log(`[Login] Navigating to TikTok login...`);
      await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
      await browserManager.humanLikeDelay(4000, 6000);

      // Take screenshot to debug
      await page.screenshot({ path: `login-page-${Date.now()}.png` });
      console.log(`[Login] Screenshot saved`);

      // Try to find and click "Use phone / email / username" button
      console.log(`[Login] Looking for email login option...`);
      
      // Method 1: Look for divs with specific text
      const foundEmailOption = await page.evaluate(() => {
        const allElements = document.querySelectorAll('div, button, span, a');
        for (const el of allElements) {
          const text = el.textContent || '';
          if (text.includes('Use phone') || text.includes('email') || text.includes('username')) {
            if (el.click) {
              el.click();
              return true;
            }
          }
        }
        return false;
      });

      if (foundEmailOption) {
        console.log(`[Login] Clicked email option`);
        await browserManager.humanLikeDelay(3000, 5000);
      }

      // Look for "Email / Username" tab
      const foundTab = await page.evaluate(() => {
        const allElements = document.querySelectorAll('div, button, span');
        for (const el of allElements) {
          const text = el.textContent || '';
          if ((text.includes('Email') && text.includes('Username')) || text === 'Email') {
            if (el.click) {
              el.click();
              return true;
            }
          }
        }
        return false;
      });

      if (foundTab) {
        console.log(`[Login] Clicked Email/Username tab`);
        await browserManager.humanLikeDelay(3000, 5000);
      }

      // Find username input
      console.log(`[Login] Filling credentials...`);
      
      const usernameInput = await page.$('input[name="username"], input[placeholder*="username" i], input[type="text"]');
      if (!usernameInput) {
        console.log(`[Login] Username input not found, trying generic selector...`);
        // Try to find any text input
        const inputs = await page.$$('input');
        console.log(`[Login] Found ${inputs.length} inputs`);
        
        for (let i = 0; i < inputs.length; i++) {
          const type = await page.evaluate(el => el.type, inputs[i]);
          const placeholder = await page.evaluate(el => el.placeholder, inputs[i]);
          console.log(`[Login] Input ${i}: type=${type}, placeholder=${placeholder}`);
        }
      }

      // Fill username with delay
      try {
        await page.type('input[name="username"]', bot.username, { delay: 150 });
      } catch (e) {
        // Try first text input
        const inputs = await page.$$('input[type="text"]');
        if (inputs.length > 0) {
          await inputs[0].type(bot.username, { delay: 150 });
        }
      }
      
      await browserManager.humanLikeDelay(2000, 3000);

      // Fill password
      try {
        await page.type('input[type="password"]', bot.password, { delay: 150 });
      } catch (e) {
        const passInputs = await page.$$('input[type="password"]');
        if (passInputs.length > 0) {
          await passInputs[0].type(bot.password, { delay: 150 });
        }
      }
      
      await browserManager.humanLikeDelay(2000, 3000);

      // Find and click login button
      console.log(`[Login] Clicking login button...`);
      
      const clickedLogin = await page.evaluate(() => {
        // Look for submit buttons or buttons with "Log in" text
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of buttons) {
          const text = (btn.textContent || btn.value || '').toLowerCase();
          if (text.includes('log in') || text.includes('login') || btn.type === 'submit') {
            btn.click();
            return true;
          }
        }
        
        // Try any button that might be login
        const allButtons = document.querySelectorAll('button');
        if (allButtons.length > 0) {
          // Usually the last button or a button near password field
          allButtons[allButtons.length - 1].click();
          return true;
        }
        return false;
      });

      if (!clickedLogin) {
        console.log(`[Login] Could not find login button to click`);
      }

      console.log(`[Login] Waiting for navigation...`);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
        console.log(`[Login] Navigation timeout or no navigation`);
      });
      
      await browserManager.humanLikeDelay(5000, 8000);

      // Take screenshot after login attempt
      await page.screenshot({ path: `after-login-${Date.now()}.png` });

      // Check for CAPTCHA
      const captcha = await page.$('#captcha-container, .captcha, iframe[src*="captcha"], div[class*="captcha"]');
      if (captcha) {
        console.log(`[Login] CAPTCHA detected`);
        return { success: false, error: 'CAPTCHA detected', captcha: true };
      }

      // Check for verification
      const verification = await page.$('input[type="text"], input[name="code"], input[placeholder*="code" i], input[placeholder*="verify" i]');
      if (verification) {
        console.log(`[Login] Verification required`);
        return { success: false, error: 'Verification code required', verification: true };
      }

      // Check if login succeeded
      const currentUrl = page.url();
      console.log(`[Login] Current URL after attempt: ${currentUrl}`);
      
      const isLoggedIn = await this.validateBotSession(page, 'tiktok');
      console.log(`[Login] Session valid: ${isLoggedIn}`);

      if (isLoggedIn) {
        console.log(`[Login] SUCCESS - Saving session`);
        await this.saveBotSession(page, bot._id);
        return { success: true };
      }

      // If still on login page, it failed
      if (currentUrl.includes('login')) {
        return { success: false, error: 'Login failed - still on login page' };
      }

      // If redirected to home or other page, probably success
      console.log(`[Login] Redirected to ${currentUrl}, assuming success`);
      await this.saveBotSession(page, bot._id);
      return { success: true };
      
    } catch (error) {
      console.error(`[Login] Error:`, error);
      return { success: false, error: error.message };
    }
  }

  async getPoolStats() {
    const stats = await BotAccount.aggregate([
      { $group: { _id: { platform: '$platform', status: '$status' }, count: { $sum: 1 } } }
    ]);

    const result = {};
    stats.forEach(stat => {
      if (!result[stat._id.platform]) result[stat._id.platform] = {};
      result[stat._id.platform][stat._id.status] = stat.count;
    });
    return result;
  }

  async addBot(platform, username, password, email = null) {
    const bot = new BotAccount({ platform, username, password, email, status: 'active' });
    await bot.save();
    return bot;
  }
}

module.exports = new BotPoolManager();
