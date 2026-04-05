const browserManager = require('./browserManager');
const platformActions = require('./platformActions');
const Task = require('../../models/Task');
const logger = require('../../utils/logger');

class TaskExecutor {
  constructor() {
    this.runningTasks = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await browserManager.initialize();
      this.initialized = true;
    }
  }

  async executeTask(taskId) {
    try {
      await this.initialize();

      // Check if Chrome is available
      if (!browserManager.isAvailable()) {
        const task = await Task.findById(taskId);
        if (task) {
          task.status = 'failed';
          task.logs.push({
            message: 'Browser automation not available on free tier. Please upgrade to Standard tier ($7/month) for full automation features.',
            type: 'error',
            timestamp: new Date()
          });
          await task.save();
        }
        logger.error('Chrome not available - cannot execute automation task');
        return;
      }

      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (this.runningTasks.has(taskId)) {
        throw new Error('Task already running');
      }

      this.runningTasks.set(taskId, { startTime: Date.now(), shouldStop: false });
      
      task.status = 'running';
      task.startedAt = new Date();
      task.logs.push({
        message: 'Task started',
        type: 'info',
        timestamp: new Date()
      });
      await task.save();

      const proxy = task.settings.proxyEnabled ? this.getRandomProxy() : null;
      const browser = await browserManager.createBrowser(taskId, proxy);
      const page = await browserManager.createPage(taskId, task.platform);

      let completedCount = 0;
      const targetCount = task.quantity;

      while (completedCount < targetCount && !this.runningTasks.get(taskId)?.shouldStop) {
        try {
          await platformActions.navigateToPage(page, task.targetUrl, taskId);
          
          let actionSuccess = false;
          
          switch (task.service) {
            case 'followers':
              actionSuccess = await platformActions.performFollow(page, task.platform, taskId);
              break;
            case 'likes':
              actionSuccess = await platformActions.performLike(page, task.platform, taskId);
              break;
            case 'comments':
              const commentResult = await platformActions.performComment(page, task.platform, taskId);
              actionSuccess = commentResult.success;
              break;
            case 'views':
              actionSuccess = await platformActions.performView(page, task.platform, taskId);
              break;
            case 'subscribers':
              actionSuccess = await platformActions.performFollow(page, task.platform, taskId);
              break;
            case 'shares':
              actionSuccess = await platformActions.performLike(page, task.platform, taskId);
              break;
            default:
              throw new Error(`Unknown service: ${task.service}`);
          }

          if (actionSuccess) {
            completedCount++;
            task.completed = completedCount;
            task.progress = Math.floor((completedCount / targetCount) * 100);
            task.logs.push({
              message: `Successfully completed action ${completedCount}/${targetCount}`,
              type: 'success',
              timestamp: new Date()
            });
          }

          const delayBase = task.settings.speed === 'fast' ? 3000 : 
                           task.settings.speed === 'slow' ? 15000 : 8000;
          const delayVariation = Math.random() * 5000;
          await browserManager.humanLikeDelay(delayBase, delayBase + delayVariation);

          if (Math.random() > 0.5) {
            await browserManager.humanLikeScroll(page);
          }

          await task.save();

        } catch (actionError) {
          logger.error(`Action failed for task ${taskId}:`, actionError);
          task.logs.push({
            message: `Action failed: ${actionError.message}`,
            type: 'error',
            timestamp: new Date()
          });
          
          if (task.logs.filter(l => l.type === 'error').length > 5) {
            throw new Error('Too many consecutive errors');
          }
          
          await browserManager.humanLikeDelay(5000, 10000);
          await task.save();
        }
      }

      task.status = this.runningTasks.get(taskId)?.shouldStop ? 'paused' : 'completed';
      task.completedAt = new Date();
      task.logs.push({
        message: `Task ${task.status} with ${completedCount} actions completed`,
        type: 'info',
        timestamp: new Date()
      });
      await task.save();

    } catch (error) {
      logger.error(`Task execution failed for ${taskId}:`, error);
      const task = await Task.findById(taskId);
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

  stopTask(taskId) {
    const task = this.runningTasks.get(taskId);
    if (task) {
      task.shouldStop = true;
      return true;
    }
    return false;
  }

  getRandomProxy() {
    const proxyList = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [];
    if (proxyList.length === 0) return null;
    return proxyList[Math.floor(Math.random() * proxyList.length)];
  }

  getRunningTasks() {
    return Array.from(this.runningTasks.keys());
  }
}

module.exports = new TaskExecutor();
