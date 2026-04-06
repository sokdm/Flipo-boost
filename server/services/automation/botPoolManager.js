const BotAccount = require('../../models/BotAccount');
const browserManager = require('./browserManager');

class BotPoolManager {
  constructor() {
    this.activeBots = new Map(); // Currently in-use bots
    this.dailyLimits = {
      tiktok: {
        follows: 50,
        likes: 100,
        views: 500
      },
      instagram: {
        follows: 30,
        likes: 80,
        comments: 20,
        views: 300
      },
      twitter: {
        follows: 40,
        likes: 100
      },
      youtube: {
        subscribes: 20,
        likes: 50,
        views: 200
      }
    };
  }

  async initialize() {
    console.log('BotPoolManager initialized');
    // Reset any bots stuck in "active" status from previous crashes
    await BotAccount.updateMany(
      { status: 'active' },
      { $set: { status: 'active', lastUsed: null } }
    );
  }

  // Get available bot for a platform
  async getAvailableBot(platform, actionType) {
    const today = new Date().toISOString().split('T')[0];
    const limit = this.dailyLimits[platform]?.[actionType] || 50;

    // Find bot that:
    // 1. Is for this platform
    // 2. Is active
    // 3. Hasn't been used in last 10 minutes (cooldown)
    // 4. Hasn't hit daily limit for this action
    // 5. Not currently in use
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
    }).sort({ lastUsed: 1 }); // Use least recently used first

    if (!bot) {
      console.log(`[BotPool] No available bots for ${platform}/${actionType}`);
      return null;
    }

    // Mark as in-use
    this.activeBots.set(bot._id.toString(), {
      botId: bot._id,
      platform,
      actionType,
      startTime: Date.now()
    });

    return bot;
  }

  // Release bot back to pool
  async releaseBot(botId, success = true, errorMessage = null) {
    const botIdStr = botId.toString();
    const usage = this.activeBots.get(botIdStr);
    
    if (!usage) {
      console.log(`[BotPool] Bot ${botIdStr} not found in active bots`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const update = {
      lastUsed: new Date(),
      totalActions: success ? 1 : 0,
      $inc: {}
    };

    // Increment daily action count
    if (success) {
      update.$inc[`dailyActions.${today}`] = 1;
      update.$inc.totalActions = 1;
      update.errorCount = 0;
    } else {
      update.errorCount = 1;
      update.lastError = errorMessage;
      
      // Suspend bot if too many consecutive errors
      const bot = await BotAccount.findById(botId);
      if (bot && bot.errorCount >= 2) {
        update.status = 'error';
        console.log(`[BotPool] Bot ${bot.username} suspended due to errors`);
      }
    }

    await BotAccount.findByIdAndUpdate(botId, update);
    this.activeBots.delete(botIdStr);

    console.log(`[BotPool] Released bot ${botIdStr}, success: ${success}`);
  }

  // Load bot session into page
  async loadBotSession(page, bot) {
    if (bot.cookies && bot.cookies.length > 0) {
      try {
        // Filter valid cookies
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
        console.error(`[BotPool] Error loading cookies for ${bot.username}:`, error);
      }
    }
    return false;
  }

  // Save bot session from page
  async saveBotSession(page, botId) {
    try {
      const cookies = await page.cookies();
      
      // Filter out unnecessary cookies
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

      console.log(`[BotPool] Saved ${relevantCookies.length} cookies for bot ${botId}`);
      return true;
    } catch (error) {
      console.error(`[BotPool] Error saving session:`, error);
      return false;
    }
  }

  // Validate bot is still logged in
  async validateBotSession(page, platform) {
    try {
      if (platform === 'tiktok') {
        const isLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('a[href="/upload"], [data-e2e="nav-profile"], div[data-e2e="profile-icon"]') ||
                 !!document.querySelector('div[class*="DivProfileIcon"]');
        });
        return isLoggedIn;
      }
      
      if (platform === 'instagram') {
        const isLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('svg[aria-label="Home"], a[href="/"] > svg[aria-label="Instagram"]') ||
                 !!document.querySelector('div[class*="x1iyjqo2"]'); // Instagram profile indicator
        });
        return isLoggedIn;
      }
      
      if (platform === 'twitter' || platform === 'x') {
        const isLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('a[href="/home"], a[href="/compose/tweet"]');
        });
        return isLoggedIn;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // Login bot if session expired
  async loginBot(page, bot) {
    console.log(`[BotPool] Logging in bot ${bot.username} on ${bot.platform}`);
    
    try {
      if (bot.platform === 'tiktok') {
        return await this.loginTikTok(page, bot);
      } else if (bot.platform === 'instagram') {
        return await this.loginInstagram(page, bot);
      } else if (bot.platform === 'twitter' || bot.platform === 'x') {
        return await this.loginTwitter(page, bot);
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

      // Try email/username login
      const emailButton = await page.$('div:has-text("Use phone / email / username")');
      if (emailButton) {
        await emailButton.click();
        await browserManager.humanLikeDelay(2000, 3000);
      }

      const emailTab = await page.$('div:has-text("Email / Username")');
      if (emailTab) {
        await emailTab.click();
        await browserManager.humanLikeDelay(2000, 3000);
      }

      // Fill credentials with human-like typing
      await page.type('input[name="username"]', bot.username, { delay: 100 + Math.random() * 100 });
      await browserManager.humanLikeDelay(1000, 2000);
      await page.type('input[type="password"]', bot.password, { delay: 100 + Math.random() * 100 });
      await browserManager.humanLikeDelay(1000, 2000);

      const loginButton = await page.$('button[type="submit"], button:has-text("Log in")');
      if (loginButton) {
        await loginButton.click();
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await browserManager.humanLikeDelay(5000, 8000);

      // Check for CAPTCHA
      const captcha = await page.$('div[id="captcha-container"], .captcha, iframe[src*="captcha"]');
      if (captcha) {
        return { success: false, error: 'CAPTCHA detected', captcha: true };
      }

      // Verify login
      const isLoggedIn = await this.validateBotSession(page, 'tiktok');
      
      if (isLoggedIn) {
        await this.saveBotSession(page, bot._id);
        return { success: true };
      }

      return { success: false, error: 'Login failed - check credentials' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loginInstagram(page, bot) {
    try {
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
      await browserManager.humanLikeDelay(3000, 5000);

      // Accept cookies
      const acceptCookies = await page.$('button:has-text("Allow all cookies"), button:has-text("Accept")');
      if (acceptCookies) {
        await acceptCookies.click();
        await browserManager.humanLikeDelay(2000, 3000);
      }

      await page.type('input[name="username"]', bot.username, { delay: 100 + Math.random() * 100 });
      await browserManager.humanLikeDelay(1000, 2000);
      await page.type('input[name="password"]', bot.password, { delay: 100 + Math.random() * 100 });
      await browserManager.humanLikeDelay(1000, 2000);

      await page.click('button[type="submit"]');
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await browserManager.humanLikeDelay(5000, 8000);

      // Check for verification
      const verification = await page.$('input[name="verificationCode"], input[aria-label*="security" i]');
      if (verification) {
        return { success: false, error: 'Security verification required', verification: true };
      }

      const notNowButton = await page.$('button:has-text("Not Now")');
      if (notNowButton) {
        await notNowButton.click();
        await browserManager.humanLikeDelay(2000, 3000);
      }

      const isLoggedIn = await this.validateBotSession(page, 'instagram');
      
      if (isLoggedIn) {
        await this.saveBotSession(page, bot._id);
        return { success: true };
      }

      return { success: false, error: 'Instagram login failed' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loginTwitter(page, bot) {
    try {
      await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2', timeout: 30000 });
      await browserManager.humanLikeDelay(3000, 5000);

      await page.type('input[autocomplete="username"]', bot.username, { delay: 100 + Math.random() * 100 });
      await browserManager.humanLikeDelay(1000, 2000);
      
      const nextButton = await page.$('div[role="button"]:has-text("Next"), button:has-text("Next")');
      if (nextButton) {
        await nextButton.click();
      }
      
      await browserManager.humanLikeDelay(3000, 5000);

      await page.type('input[type="password"]', bot.password, { delay: 100 + Math.random() * 100 });
      await browserManager.humanLikeDelay(1000, 2000);

      const loginButton = await page.$('div[role="button"]:has-text("Log in"), button:has-text("Log in")');
      if (loginButton) {
        await loginButton.click();
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await browserManager.humanLikeDelay(5000, 8000);

      const isLoggedIn = await this.validateBotSession(page, 'twitter');
      
      if (isLoggedIn) {
        await this.saveBotSession(page, bot._id);
        return { success: true };
      }

      return { success: false, error: 'Twitter login failed' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get pool statistics
  async getPoolStats() {
    const stats = await BotAccount.aggregate([
      {
        $group: {
          _id: { platform: '$platform', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {};
    stats.forEach(stat => {
      if (!result[stat._id.platform]) {
        result[stat._id.platform] = {};
      }
      result[stat._id.platform][stat._id.status] = stat.count;
    });

    return result;
  }

  // Add new bot to pool
  async addBot(platform, username, password, email = null) {
    const bot = new BotAccount({
      platform,
      username,
      password,
      email,
      status: 'active'
    });

    await bot.save();
    console.log(`[BotPool] Added new bot ${username} for ${platform}`);
    return bot;
  }

  // Reset daily counters (call at midnight)
  async resetDailyCounters() {
    await BotAccount.updateMany({}, { $set: { dailyActions: {} } });
    console.log('[BotPool] Daily counters reset');
  }
}

module.exports = new BotPoolManager();
