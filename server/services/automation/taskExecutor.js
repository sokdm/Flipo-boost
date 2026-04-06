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

      const taskState = {
        startTime: Date.now(),
        shouldStop: false,
        consecutiveErrors: 0,
        successfulActions: 0,
        lastSuccessTime: null,
        proxyFailures: 0,
        loginRequiredCount: 0
      };
      
      this.runningTasks.set(taskId, taskState);
      
      task.status = 'running';
      task.startedAt = new Date();
      task.logs.push({
        message: `Task started - Platform: ${task.platform}, Service: ${task.service}`,
        type: 'info',
        timestamp: new Date()
      });
      await task.save();

      let completedCount = task.completed || 0;
      const targetCount = task.quantity;
      const maxConsecutiveErrors = 3;
      const maxLoginRequired = 2; // Stop if login required multiple times

      while (completedCount < targetCount && !taskState.shouldStop) {
        let browser = null;
        let proxyConfig = null;
        
        try {
          const currentState = this.runningTasks.get(taskId);
          
          if (currentState.consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Stopped after ${maxConsecutiveErrors} consecutive errors`);
          }
          
          if (currentState.loginRequiredCount >= maxLoginRequired) {
            throw new Error(`Stopped - Login required for ${currentState.loginRequiredCount} attempts. TikTok/Instagram require logged-in accounts.`);
          }

          if (currentState.proxyFailures >= 5) {
            throw new Error(`Stopped after 5 proxy failures`);
          }

          // Get fresh proxy
          proxyConfig = browserManager.getRandomProxy();
          
          task.logs.push({
            message: `Action ${completedCount + 1}/${targetCount} - ${task.platform} ${task.service}`,
            type: 'info',
            timestamp: new Date()
          });
          await task.save();

          // Create browser
          browser = await browserManager.createBrowser(taskId, proxyConfig);
          const page = await browserManager.createPage(taskId, task.platform, proxyConfig);

          // Route to platform-specific action
          let actionResult = { success: false, details: 'Not executed' };
          const platform = task.platform.toLowerCase();
          const service = task.service.toLowerCase();
          
          // Handle different platforms
          if (platform === 'tiktok') {
            switch (service) {
              case 'followers':
                actionResult = await browserManager.performTikTokFollow(page, task.targetUrl);
                break;
              case 'likes':
                actionResult = await browserManager.performLike(page, task.targetUrl, 'tiktok');
                break;
              case 'views':
                actionResult = await browserManager.performView(page, task.targetUrl, 'tiktok', task.settings?.viewDuration || 15000);
                break;
              case 'shares':
                actionResult = await browserManager.performShare(page, task.targetUrl, 'tiktok');
                break;
              default:
                throw new Error(`Service ${service} not supported for TikTok`);
            }
          } else if (platform === 'instagram') {
            switch (service) {
              case 'followers':
                actionResult = await browserManager.performInstagramFollow(page, task.targetUrl);
                break;
              case 'likes':
                actionResult = await browserManager.performLike(page, task.targetUrl, 'instagram');
                break;
              case 'comments':
                const commentText = task.settings?.commentText || 'Great post! 🔥';
                actionResult = await browserManager.performComment(page, task.targetUrl, 'instagram', commentText);
                break;
              case 'views':
                actionResult = await browserManager.performView(page, task.targetUrl, 'instagram', task.settings?.viewDuration || 10000);
                break;
              default:
                throw new Error(`Service ${service} not supported for Instagram`);
            }
          } else if (platform === 'twitter' || platform === 'x') {
            switch (service) {
              case 'followers':
                actionResult = await browserManager.performTwitterFollow(page, task.targetUrl);
                break;
              case 'likes':
                actionResult = await browserManager.performLike(page, task.targetUrl, 'twitter');
                break;
              default:
                throw new Error(`Service ${service} not supported for Twitter/X`);
            }
          } else if (platform === 'youtube') {
            switch (service) {
              case 'subscribers':
                actionResult = await browserManager.performYouTubeSubscribe(page, task.targetUrl);
                break;
              case 'likes':
                actionResult = await browserManager.performLike(page, task.targetUrl, 'youtube');
                break;
              case 'views':
                actionResult = await browserManager.performView(page, task.targetUrl, 'youtube', task.settings?.viewDuration || 20000);
                break;
              default:
                throw new Error(`Service ${service} not supported for YouTube`);
            }
          } else {
            throw new Error(`Platform ${platform} not supported`);
          }

          // Wait for API calls
          await browserManager.humanLikeDelay(6000, 10000);

          // Handle result
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
            currentState.consecutiveErrors = 0;
            currentState.successfulActions++;
            currentState.lastSuccessTime = Date.now();
            
            task.logs.push({
              message: `✓ ${service} ${completedCount}/${targetCount} - ${actionResult.details || 'Success'}`,
              type: 'success',
              timestamp: new Date()
            });
          } else {
            currentState.consecutiveErrors++;
            task.logs.push({
              message: `✗ Failed: ${actionResult.error || actionResult.details}`,
              type: 'error',
              timestamp: new Date()
            });
          }

          await task.save();

          // Dynamic delay
          const baseDelay = task.settings?.speed === 'fast' ? 10000 : 
                           task.settings?.speed === 'slow' ? 30000 : 20000;
          const errorDelay = currentState.consecutiveErrors * 5000;
          const totalDelay = baseDelay + errorDelay + Math.floor(Math.random() * 5000);
          
          await browserManager.humanLikeDelay(totalDelay, totalDelay + 3000);

        } catch (actionError) {
          console.error(`[${taskId}] Action error:`, actionError);
          
          const currentState = this.runningTasks.get(taskId);
          if (currentState) {
            currentState.consecutiveErrors++;
          }
          
          task.logs.push({
            message: `Error: ${actionError.message}`,
            type: 'error',
            timestamp: new Date()
          });
          await task.save();
          
          await browserManager.humanLikeDelay(15000, 25000);
          
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
      
      const totalAttempts = (finalState?.successfulActions || 0) + (finalState?.consecutiveErrors || 0);
      const successRate = totalAttempts > 0 
        ? Math.round(((finalState?.successfulActions || 0) / totalAttempts) * 100) 
        : 0;
      
      let finalMessage = `Task ${finalStatus}. ${completedCount}/${targetCount} completed. Success rate: ${successRate}%`;
      
      if (finalState?.loginRequiredCount >= maxLoginRequired) {
        finalMessage += ` - Note: Login required for ${task.platform}. Consider adding authenticated sessions.`;
      }
      
      task.logs.push({
        message: finalMessage,
        type: 'info',
        timestamp: new Date()
      });
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
