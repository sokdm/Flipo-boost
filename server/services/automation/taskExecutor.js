const browserManager = require('./browserManager');
const Task = require('../../models/Task');

class TaskExecutor {
  constructor() {
    this.runningTasks = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await browserManager.initialize();
      this.initialized = true;
      console.log('TaskExecutor initialized');
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
            message: 'Browser automation not available - Chrome not found',
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

      // Initialize fresh task state - THIS WAS THE BUG, need fresh state
      const taskState = {
        startTime: Date.now(),
        shouldStop: false,
        consecutiveErrors: 0,  // Start at 0
        successfulActions: 0,
        lastSuccessTime: null,
        proxyFailures: 0,
        loginRequiredCount: 0,
        totalAttempts: 0
      };
      
      this.runningTasks.set(taskId, taskState);
      
      task.status = 'running';
      task.startedAt = new Date();
      task.logs.push({
        message: `Task started - Platform: ${task.platform}, Service: ${task.service}, Target: ${task.targetUrl}`,
        type: 'info',
        timestamp: new Date()
      });
      await task.save();

      let completedCount = task.completed || 0;
      const targetCount = task.quantity;
      const maxConsecutiveErrors = 3;
      const maxLoginRequired = 2;

      console.log(`[${taskId}] Starting execution: ${completedCount}/${targetCount} completed`);

      while (completedCount < targetCount && !taskState.shouldStop) {
        let browser = null;
        let proxyConfig = null;
        
        try {
          // Get current state
          const currentState = this.runningTasks.get(taskId);
          if (!currentState) {
            throw new Error('Task state lost');
          }
          
          currentState.totalAttempts++;
          
          console.log(`[${taskId}] Attempt ${currentState.totalAttempts}: ${completedCount}/${targetCount} completed, Errors: ${currentState.consecutiveErrors}`);

          if (currentState.consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Stopped after ${maxConsecutiveErrors} consecutive errors`);
          }
          
          if (currentState.loginRequiredCount >= maxLoginRequired) {
            throw new Error(`Login required for ${currentState.loginRequiredCount} attempts. ${task.platform} requires authenticated accounts.`);
          }

          // Get fresh proxy for each action
          proxyConfig = browserManager.getRandomProxy();
          
          task.logs.push({
            message: `Action ${completedCount + 1}/${targetCount} - ${task.platform} ${task.service} ${proxyConfig?.server ? '(with proxy)' : '(direct)'}`,
            type: 'info',
            timestamp: new Date()
          });
          await task.save();

          // Create browser and page
          console.log(`[${taskId}] Creating browser...`);
          browser = await browserManager.createBrowser(taskId, proxyConfig);
          const page = await browserManager.createPage(taskId, task.platform, proxyConfig);
          console.log(`[${taskId}] Browser created successfully`);

          // Route to correct platform action
          let actionResult = { success: false, details: 'Not executed' };
          const platform = (task.platform || '').toLowerCase();
          const service = (task.service || '').toLowerCase();
          
          console.log(`[${taskId}] Executing ${platform} ${service} for ${task.targetUrl}`);

          // TIKTOK
          if (platform === 'tiktok') {
            if (service === 'followers') {
              actionResult = await browserManager.performTikTokFollow(page, task.targetUrl);
            } else if (service === 'likes') {
              actionResult = await browserManager.performLike(page, task.targetUrl, 'tiktok');
            } else if (service === 'views') {
              // Views just need to load and watch
              actionResult = await browserManager.performView(page, task.targetUrl, 'tiktok', task.settings?.viewDuration || 15000);
            } else if (service === 'shares') {
              actionResult = await browserManager.performShare(page, task.targetUrl, 'tiktok');
            } else {
              throw new Error(`Service ${service} not supported for TikTok`);
            }
          }
          // INSTAGRAM
          else if (platform === 'instagram') {
            if (service === 'followers') {
              actionResult = await browserManager.performInstagramFollow(page, task.targetUrl);
            } else if (service === 'likes') {
              actionResult = await browserManager.performLike(page, task.targetUrl, 'instagram');
            } else if (service === 'comments') {
              const commentText = task.settings?.commentText || 'Great post! 🔥';
              actionResult = await browserManager.performComment(page, task.targetUrl, 'instagram', commentText);
            } else if (service === 'views') {
              actionResult = await browserManager.performView(page, task.targetUrl, 'instagram', task.settings?.viewDuration || 10000);
            } else {
              throw new Error(`Service ${service} not supported for Instagram`);
            }
          }
          // TWITTER/X
          else if (platform === 'twitter' || platform === 'x') {
            if (service === 'followers') {
              actionResult = await browserManager.performTwitterFollow(page, task.targetUrl);
            } else if (service === 'likes') {
              actionResult = await browserManager.performLike(page, task.targetUrl, 'twitter');
            } else {
              throw new Error(`Service ${service} not supported for Twitter/X`);
            }
          }
          // YOUTUBE
          else if (platform === 'youtube') {
            if (service === 'subscribers') {
              actionResult = await browserManager.performYouTubeSubscribe(page, task.targetUrl);
            } else if (service === 'likes') {
              actionResult = await browserManager.performLike(page, task.targetUrl, 'youtube');
            } else if (service === 'views') {
              actionResult = await browserManager.performView(page, task.targetUrl, 'youtube', task.settings?.viewDuration || 20000);
            } else {
              throw new Error(`Service ${service} not supported for YouTube`);
            }
          } else {
            throw new Error(`Platform ${platform} not supported`);
          }

          console.log(`[${taskId}] Action result:`, actionResult);

          // Wait for API calls to complete
          await browserManager.humanLikeDelay(3000, 5000);

          // Process result
          if (actionResult.requiresLogin) {
            currentState.loginRequiredCount++;
            task.logs.push({
              message: `⚠ ${actionResult.error}`,
              type: 'warning',
              timestamp: new Date()
            });
          } else if (actionResult.success) {
            completedCount++;
            task.completed = completedCount;
            task.progress = Math.floor((completedCount / targetCount) * 100);
            currentState.consecutiveErrors = 0; // RESET on success
            currentState.successfulActions++;
            currentState.lastSuccessTime = Date.now();
            
            task.logs.push({
              message: `✓ ${service} ${completedCount}/${targetCount} - ${actionResult.details || 'Success'}`,
              type: 'success',
              timestamp: new Date()
            });
            
            console.log(`[${taskId}] SUCCESS: ${completedCount}/${targetCount}`);
          } else {
            // Action failed but not login required
            currentState.consecutiveErrors++;
            task.logs.push({
              message: `✗ Failed: ${actionResult.error || actionResult.details || 'Unknown error'}`,
              type: 'error',
              timestamp: new Date()
            });
            
            console.log(`[${taskId}] FAILED: ${actionResult.error}, consecutiveErrors: ${currentState.consecutiveErrors}`);
          }

          await task.save();

          // Dynamic delay based on speed setting and error count
          const baseDelay = task.settings?.speed === 'fast' ? 5000 : 
                           task.settings?.speed === 'slow' ? 20000 : 10000;
          const errorDelay = currentState.consecutiveErrors * 3000;
          const totalDelay = baseDelay + errorDelay + Math.floor(Math.random() * 3000);
          
          console.log(`[${taskId}] Waiting ${totalDelay}ms before next action`);
          await browserManager.humanLikeDelay(totalDelay, totalDelay + 2000);

        } catch (actionError) {
          console.error(`[${taskId}] Action error:`, actionError);
          
          const currentState = this.runningTasks.get(taskId);
          if (currentState) {
            currentState.consecutiveErrors++;
            console.log(`[${taskId}] Error count: ${currentState.consecutiveErrors}`);
          }
          
          task.logs.push({
            message: `Error: ${actionError.message}`,
            type: 'error',
            timestamp: new Date()
          });
          await task.save();
          
          await browserManager.humanLikeDelay(10000, 15000);
          
        } finally {
          // Always close browser
          if (browser) {
            try {
              await browserManager.closeBrowser(taskId);
              console.log(`[${taskId}] Browser closed`);
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
      
      let finalMessage = `Task ${finalStatus}. ${completedCount}/${targetCount} completed. Success rate: ${successRate}%`;
      
      if (finalState?.loginRequiredCount >= maxLoginRequired) {
        finalMessage += ` - Note: ${task.platform} requires login for ${task.service}.`;
      }
      
      task.logs.push({
        message: finalMessage,
        type: 'info',
        timestamp: new Date()
      });
      
      console.log(`[${taskId}] Task ${finalStatus}: ${finalMessage}`);
      await task.save();

    } catch (error) {
      console.error(`[${taskId}] Task execution failed:`, error);
      
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
      try {
        await browserManager.closeBrowser(taskId);
      } catch (e) {
        console.error(`[${taskId}] Cleanup error:`, e);
      }
      this.runningTasks.delete(taskId);
      console.log(`[${taskId}] Task cleaned up`);
    }
  }

  stopTask(taskId) {
    const task = this.runningTasks.get(taskId);
    if (task) {
      task.shouldStop = true;
      console.log(`[${taskId}] Stop requested`);
      return true;
    }
    return false;
  }

  getRunningTasks() {
    return Array.from(this.runningTasks.keys());
  }

  getTaskStatus(taskId) {
    return this.runningTasks.get(taskId);
  }
}

module.exports = new TaskExecutor();
