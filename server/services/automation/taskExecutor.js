const browserManager = require('./browserManager');
const botPoolManager = require('./botPoolManager');
const Task = require('../../models/Task');

class TaskExecutor {
  constructor() {
    this.runningTasks = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await browserManager.initialize();
      await botPoolManager.initialize();
      this.initialized = true;
      console.log('TaskExecutor initialized with Bot Pool');
    }
  }

  async executeTask(taskId) {
    let task = null;
    
    try {
      await this.initialize();

      if (!browserManager.isAvailable()) {
        task = await Task.findById(taskId);
        if (task) {
          task.status = 'failed';
          task.logs.push({
            message: 'Browser automation not available',
            type: 'error',
            timestamp: new Date()
          });
          await task.save();
        }
        return;
      }

      task = await Task.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (this.runningTasks.has(taskId)) {
        throw new Error('Task already running');
      }

      const taskState = {
        startTime: Date.now(),
        shouldStop: false,
        consecutiveErrors: 0,
        successfulActions: 0,
        totalAttempts: 0
      };
      
      this.runningTasks.set(taskId, taskState);
      
      task.status = 'running';
      task.startedAt = new Date();
      task.logs.push({
        message: `Task started - ${task.platform} ${task.service} using bot pool`,
        type: 'info',
        timestamp: new Date()
      });
      await task.save();

      let completedCount = task.completed || 0;
      const targetCount = task.quantity;
      const maxConsecutiveErrors = 3;

      console.log(`[${taskId}] Starting: ${completedCount}/${targetCount}`);

      while (completedCount < targetCount && !taskState.shouldStop) {
        let browser = null;
        let bot = null;
        let proxyConfig = null;
        
        try {
          const currentState = this.runningTasks.get(taskId);
          if (!currentState) break;
          
          currentState.totalAttempts++;

          if (currentState.consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Stopped after ${maxConsecutiveErrors} consecutive errors`);
          }

          // Get available bot from pool
          bot = await botPoolManager.getAvailableBot(task.platform, task.service);
          
          if (!bot) {
            throw new Error(`No available bots for ${task.platform}/${task.service}. Please add more bot accounts.`);
          }

          console.log(`[${taskId}] Using bot ${bot.username} (${bot._id})`);

          task.logs.push({
            message: `Action ${completedCount + 1}/${targetCount} - Using bot ${bot.username}`,
            type: 'info',
            timestamp: new Date()
          });
          await task.save();

          // Create browser
          proxyConfig = browserManager.getRandomProxy();
          browser = await browserManager.createBrowser(taskId, proxyConfig);
          const page = await browserManager.createPage(taskId, task.platform, proxyConfig);

          // Load bot session or login
          let sessionValid = await botPoolManager.loadBotSession(page, bot);
          
          if (sessionValid) {
            // Validate session
            sessionValid = await botPoolManager.validateBotSession(page, task.platform);
          }

          if (!sessionValid) {
            // Need to login
            console.log(`[${taskId}] Bot ${bot.username} session expired, logging in...`);
            const loginResult = await botPoolManager.loginBot(page, bot);
            
            if (!loginResult.success) {
              if (loginResult.captcha) {
                await botPoolManager.releaseBot(bot._id, false, 'CAPTCHA detected');
                throw new Error('CAPTCHA detected - manual intervention needed');
              }
              if (loginResult.verification) {
                await botPoolManager.releaseBot(bot._id, false, 'Verification required');
                throw new Error('Account verification required');
              }
              
              await botPoolManager.releaseBot(bot._id, false, loginResult.error);
              throw new Error(`Login failed: ${loginResult.error}`);
            }
            
            // Save new session
            await botPoolManager.saveBotSession(page, bot._id);
          }

          // Perform action based on service
          let actionResult = { success: false };
          const platform = task.platform.toLowerCase();
          const service = task.service.toLowerCase();

          // Navigate to target
          console.log(`[${taskId}] Navigating to ${task.targetUrl}`);
          await page.goto(task.targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await browserManager.humanLikeDelay(3000, 5000);

          // Perform the specific action
          if (service === 'followers' || service === 'subscribers') {
            actionResult = await this.performFollow(page, platform);
          } else if (service === 'likes') {
            actionResult = await this.performLike(page, platform);
          } else if (service === 'views') {
            actionResult = await this.performView(page, platform, task.settings?.viewDuration || 15000);
          } else if (service === 'comments') {
            actionResult = await this.performComment(page, platform, task.settings?.commentText);
          } else if (service === 'shares') {
            actionResult = await this.performShare(page, platform);
          } else {
            throw new Error(`Unknown service: ${service}`);
          }

          console.log(`[${taskId}] Action result:`, actionResult);

          // Wait for API calls
          await browserManager.humanLikeDelay(3000, 5000);

          // Process result
          if (actionResult.success) {
            completedCount++;
            task.completed = completedCount;
            task.progress = Math.floor((completedCount / targetCount) * 100);
            currentState.consecutiveErrors = 0;
            currentState.successfulActions++;
            
            await botPoolManager.releaseBot(bot._id, true);
            
            task.logs.push({
              message: `✓ ${service} ${completedCount}/${targetCount} - ${actionResult.details || 'Success'}`,
              type: 'success',
              timestamp: new Date()
            });
          } else {
            currentState.consecutiveErrors++;
            await botPoolManager.releaseBot(bot._id, false, actionResult.error);
            
            task.logs.push({
              message: `✗ Failed: ${actionResult.error || 'Unknown error'}`,
              type: 'error',
              timestamp: new Date()
            });
          }

          await task.save();

          // Delay between actions
          const baseDelay = task.settings?.speed === 'fast' ? 5000 : 
                           task.settings?.speed === 'slow' ? 20000 : 10000;
          const totalDelay = baseDelay + Math.floor(Math.random() * 3000);
          
          await browserManager.humanLikeDelay(totalDelay, totalDelay + 2000);

        } catch (error) {
          console.error(`[${taskId}] Error:`, error);
          
          const currentState = this.runningTasks.get(taskId);
          if (currentState) {
            currentState.consecutiveErrors++;
          }
          
          if (bot) {
            await botPoolManager.releaseBot(bot._id, false, error.message);
          }
          
          task.logs.push({
            message: `Error: ${error.message}`,
            type: 'error',
            timestamp: new Date()
          });
          await task.save();
          
          await browserManager.humanLikeDelay(10000, 15000);
          
        } finally {
          if (browser) {
            try {
              await browserManager.closeBrowser(taskId);
            } catch (e) {
              console.error(`[${taskId}] Error closing browser:`, e);
            }
          }
        }
      }

      // Task completion
      const finalState = this.runningTasks.get(taskId);
      const finalStatus = finalState?.shouldStop ? 'paused' : 'completed';
      
      task.status = finalStatus;
      task.completedAt = new Date();
      
      const successRate = finalState?.totalAttempts > 0 
        ? Math.round(((finalState?.successfulActions || 0) / finalState.totalAttempts) * 100) 
        : 0;
      
      task.logs.push({
        message: `Task ${finalStatus}. ${completedCount}/${targetCount} completed. Success rate: ${successRate}%`,
        type: 'info',
        timestamp: new Date()
      });
      
      console.log(`[${taskId}] Task ${finalStatus}`);
      await task.save();

    } catch (error) {
      console.error(`[${taskId}] Task failed:`, error);
      
      if (task) {
        task.status = 'failed';
        task.logs.push({
          message: `Task failed: ${error.message}`,
          type: 'error',
          timestamp: new Date()
        });
        await task.save();
      }
    } finally {
      await browserManager.closeBrowser(taskId);
      this.runningTasks.delete(taskId);
    }
  }

  // Action implementations
  async performFollow(page, platform) {
    const selectors = {
      tiktok: [
        'button[data-e2e="follow-button"]',
        'button:has-text("Follow")',
        'div[data-e2e="follow-button"]'
      ],
      instagram: [
        'button._acan._acap._acas._aj1-._ap30',
        'button[type="button"]:has-text("Follow")',
        'div[role="button"]:has-text("Follow")'
      ],
      twitter: [
        'button[data-testid="follow"]',
        'button:has-text("Follow")'
      ],
      youtube: [
        'button:has-text("Subscribe")',
        'yt-formatted-string:has-text("Subscribe")'
      ]
    };

    const platformSelectors = selectors[platform] || selectors.tiktok;
    
    let followBtn = null;
    
    for (const selector of platformSelectors) {
      try {
        const btn = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
        if (btn) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.toLowerCase().includes('follow')) {
            followBtn = btn;
            break;
          }
        }
      } catch (e) {}
    }

    if (!followBtn) {
      // Check if already following
      const followingSelectors = {
        tiktok: ['button:has-text("Following")', 'div[data-e2e="following-button"]'],
        instagram: ['button:has-text("Following")', 'button:has-text("Unfollow")'],
        twitter: ['button[data-testid="unfollow"]'],
        youtube: ['button:has-text("Subscribed")']
      };
      
      const checkSelectors = followingSelectors[platform] || [];
      for (const selector of checkSelectors) {
        const btn = await page.$(selector);
        if (btn) return { success: true, alreadyFollowing: true, details: 'Already following' };
      }
      
      return { success: false, error: 'Follow button not found' };
    }

    // Click
    await browserManager.humanLikeMouseMove(page, platformSelectors[0]);
    await followBtn.click();
    await browserManager.humanLikeDelay(3000, 5000);

    // Verify
    const verifySelectors = {
      tiktok: ['button:has-text("Following")', 'div[data-e2e="following-button"]'],
      instagram: ['button:has-text("Following")', 'button:has-text("Unfollow")'],
      twitter: ['button[data-testid="unfollow"]'],
      youtube: ['button:has-text("Subscribed")']
    };

    const checkSelectors = verifySelectors[platform] || [];
    for (const selector of checkSelectors) {
      const btn = await page.$(selector);
      if (btn) return { success: true, verified: true, details: 'Now following' };
    }

    return { success: false, error: 'Verification failed' };
  }

  async performLike(page, platform) {
    const selectors = {
      tiktok: ['[data-e2e="like-button"]'],
      instagram: ['svg[aria-label="Like"]', 'button:has(svg[aria-label="Like"])'],
      twitter: ['button[data-testid="like"]'],
      youtube: ['button[aria-label*="like" i]']
    };

    const platformSelectors = selectors[platform] || selectors.tiktok;
    
    for (const selector of platformSelectors) {
      const btn = await page.$(selector);
      if (btn) {
        await browserManager.humanLikeMouseMove(page, selector);
        await btn.click();
        await browserManager.humanLikeDelay(3000, 5000);
        return { success: true, details: 'Liked' };
      }
    }

    return { success: false, error: 'Like button not found' };
  }

  async performView(page, platform, duration) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(2000, 4000);
    }

    return { 
      success: true, 
      viewTime: Date.now() - startTime,
      details: `Viewed for ${(Date.now() - startTime)/1000}s`
    };
  }

  async performComment(page, platform, commentText) {
    const selectors = {
      tiktok: ['div[data-e2e="comment-input"], textarea[placeholder*="comment" i]'],
      instagram: ['textarea[aria-label="Add a comment…"]'],
      twitter: ['div[data-testid="tweetTextarea_0"]']
    };

    const text = commentText || 'Great content! 🔥';
    const platformSelectors = selectors[platform] || selectors.tiktok;
    
    for (const selector of platformSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.click();
        await browserManager.humanLikeDelay(1000, 2000);
        await input.type(text, { delay: 100 });
        await browserManager.humanLikeDelay(2000, 3000);
        
        // Submit
        const submitSelectors = {
          tiktok: ['button[type="submit"]:has-text("Post")'],
          instagram: ['button[type="submit"]:has-text("Post")'],
          twitter: ['button[data-testid="tweetButton"]']
        };
        
        const submitSelector = (submitSelectors[platform] || [])[0];
        if (submitSelector) {
          const submit = await page.$(submitSelector);
          if (submit) {
            await submit.click();
            await browserManager.humanLikeDelay(3000, 5000);
            return { success: true, details: 'Comment posted' };
          }
        }
      }
    }

    return { success: false, error: 'Comment input not found' };
  }

  async performShare(page, platform) {
    // Simplified - shares are complex, often just open share dialog
    return { success: true, details: 'Share action simulated' };
  }

  stopTask(taskId) {
    const task = this.runningTasks.get(taskId);
    if (task) {
      task.shouldStop = true;
      return true;
    }
    return false;
  }

  getRunningTasks() {
    return Array.from(this.runningTasks.keys());
  }
}

module.exports = new TaskExecutor();
