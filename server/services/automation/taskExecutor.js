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

      // Initialize task state
      const taskState = {
        startTime: Date.now(),
        shouldStop: false,
        consecutiveErrors: 0,
        successfulActions: 0,
        lastSuccessTime: null,
        proxyFailures: 0
      };
      
      this.runningTasks.set(taskId, taskState);
      
      task.status = 'running';
      task.startedAt = new Date();
      task.logs.push({
        message: 'Task started with anti-detection measures',
        type: 'info',
        timestamp: new Date()
      });
      await task.save();

      let completedCount = task.completed || 0;
      const targetCount = task.quantity;
      const maxConsecutiveErrors = 3;
      const maxProxyFailures = 5;

      // Main execution loop
      while (completedCount < targetCount && !taskState.shouldStop) {
        let browser = null;
        let proxyConfig = null;
        
        try {
          // Check failure thresholds
          if (taskState.consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Stopped after ${maxConsecutiveErrors} consecutive errors - likely blocked or detected`);
          }
          
          if (taskState.proxyFailures >= maxProxyFailures) {
            throw new Error(`Stopped after ${maxProxyFailures} proxy failures`);
          }

          // Get fresh proxy for every action (IP rotation)
          proxyConfig = browserManager.getRandomProxy();
          
          task.logs.push({
            message: `Action ${completedCount + 1}/${targetCount} - Using ${proxyConfig?.server ? 'proxy' : 'direct connection'}`,
            type: 'info',
            timestamp: new Date()
          });
          await task.save();

          // Create fresh browser instance
          browser = await browserManager.createBrowser(taskId, proxyConfig);
          const page = await browserManager.createPage(taskId, task.platform, proxyConfig);

          // Navigate with retry
          let navigateSuccess = false;
          let navAttempts = 0;
          const maxNavAttempts = 2;
          
          while (!navigateSuccess && navAttempts < maxNavAttempts) {
            try {
              await page.goto(task.targetUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
              });
              navigateSuccess = true;
            } catch (navError) {
              navAttempts++;
              if (navAttempts >= maxNavAttempts) throw navError;
              task.logs.push({
                message: `Navigation retry ${navAttempts}/${maxNavAttempts}`,
                type: 'warning',
                timestamp: new Date()
              });
              await browserManager.humanLikeDelay(3000, 5000);
            }
          }

          // Perform the specific service action
          let actionResult = { success: false, details: 'Not executed' };
          
          switch (task.service) {
            case 'followers':
            case 'subscribers':
              actionResult = await browserManager.performFollow(page, task.targetUrl, task.platform);
              break;
              
            case 'likes':
              actionResult = await browserManager.performLike(page, task.targetUrl, task.platform);
              break;
              
            case 'comments':
              // Get comment text from settings or use default
              const commentText = task.settings?.commentText || 'Great content! 🔥';
              actionResult = await browserManager.performComment(page, task.targetUrl, task.platform, commentText);
              break;
              
            case 'views':
              const viewDuration = task.settings?.viewDuration || 15000;
              actionResult = await browserManager.performView(page, task.targetUrl, task.platform, viewDuration);
              break;
              
            case 'shares':
              // Shares often require different logic - using like as fallback or implement specific share logic
              actionResult = await browserManager.performLike(page, task.targetUrl, task.platform);
              if (actionResult.success) {
                actionResult.details = 'Share action simulated (using like as proxy)';
              }
              break;
              
            default:
              throw new Error(`Unknown service type: ${task.service}`);
          }

          // Wait for API calls to complete before closing browser
          await browserManager.humanLikeDelay(6000, 10000);

          // Process result
          if (actionResult.success) {
            completedCount++;
            task.completed = completedCount;
            task.progress = Math.floor((completedCount / targetCount) * 100);
            
            // Reset error counters on success
            taskState.consecutiveErrors = 0;
            taskState.successfulActions++;
            taskState.lastSuccessTime = Date.now();
            
            task.logs.push({
              message: `✓ ${task.service} action ${completedCount}/${targetCount} successful - ${actionResult.details}`,
              type: 'success',
              timestamp: new Date()
            });
          } else {
            // Action failed
            taskState.consecutiveErrors++;
            
            if (actionResult.possibleBlock) {
              taskState.proxyFailures++;
              task.logs.push({
                message: `⚠ Possible detection/block: ${actionResult.error}. Rotating proxy...`,
                type: 'warning',
                timestamp: new Date()
              });
            } else {
              task.logs.push({
                message: `✗ Action failed: ${actionResult.error || actionResult.details}`,
                type: 'error',
                timestamp: new Date()
              });
            }
          }

          await task.save();

          // Calculate dynamic delay
          const baseDelay = task.settings?.speed === 'fast' ? 10000 : 
                           task.settings?.speed === 'slow' ? 30000 : 20000;
          
          // Increase delay if errors are occurring
          const errorMultiplier = Math.min(taskState.consecutiveErrors, 3);
          const errorDelay = errorMultiplier * 5000;
          const randomVariation = Math.floor(Math.random() * 5000);
          const totalDelay = baseDelay + errorDelay + randomVariation;
          
          if (errorMultiplier > 0) {
            task.logs.push({
              message: `Adding ${errorDelay/1000}s delay due to recent errors`,
              type: 'info',
              timestamp: new Date()
            });
            await task.save();
          }
          
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
          
          // Long delay after error
          await browserManager.humanLikeDelay(15000, 25000);
          
        } finally {
          // Always close browser to ensure fresh IP next iteration
          if (browser) {
            try {
              await browserManager.closeBrowser(taskId);
            } catch (closeError) {
              console.error(`[${taskId}] Error closing browser:`, closeError);
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
      
      task.logs.push({
        message: `Task ${finalStatus}. Completed ${completedCount}/${targetCount} actions. Success rate: ${successRate}%`,
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
      // Cleanup
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
