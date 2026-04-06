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
        const isLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('a[href="/upload"]') ||
                 !!document.querySelector('[data-e2e="nav-profile"]') ||
                 !!document.querySelector('.tiktok-logo') === false; // If no login button
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
      await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
      await browserManager.humanLikeDelay(3000, 5000);

      // Click "Use phone / email / username" - using XPath or text content
      const buttons = await page.$$('div, button, span');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.includes('Use phone') || text.includes('email') || text.includes('username')) {
          await button.click();
          break;
        }
      }
      
      await browserManager.humanLikeDelay(2000, 3000);

      // Click "Email / Username" tab
      const tabs = await page.$$('div, button, span');
      for (const tab of tabs) {
        const text = await page.evaluate(el => el.textContent, tab);
        if (text && text.includes('Email') && text.includes('Username')) {
          await tab.click();
          break;
        }
      }
      
      await browserManager.humanLikeDelay(2000, 3000);

      // Fill credentials
      await page.type('input[name="username"]', bot.username, { delay: 100 });
      await browserManager.humanLikeDelay(1000, 2000);
      await page.type('input[type="password"]', bot.password, { delay: 100 });
      await browserManager.humanLikeDelay(1000, 2000);

      // Click login button
      const loginButtons = await page.$$('button');
      for (const btn of loginButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        const type = await page.evaluate(el => el.type, btn);
        if ((text && text.toLowerCase().includes('log in')) || type === 'submit') {
          await btn.click();
          break;
        }
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await browserManager.humanLikeDelay(5000, 8000);

      // Check for CAPTCHA
      const captcha = await page.$('#captcha-container, .captcha, iframe[src*="captcha"]');
      if (captcha) {
        return { success: false, error: 'CAPTCHA detected', captcha: true };
      }

      // Check for verification code input
      const verificationInput = await page.$('input[type="text"], input[name="code"], input[placeholder*="code" i]');
      if (verificationInput) {
        return { success: false, error: 'Verification code required', verification: true };
      }

      // Verify login success
      const isLoggedIn = await this.validateBotSession(page, 'tiktok');
      
      if (isLoggedIn) {
        await this.saveBotSession(page, bot._id);
        return { success: true };
      }

      // Check if still on login page
      const stillOnLogin = await page.$('input[name="username"], input[type="password"]');
      if (stillOnLogin) {
        return { success: false, error: 'Login failed - check credentials' };
      }

      return { success: true };
      
    } catch (error) {
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
