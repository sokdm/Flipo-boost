const browserManager = require('./browserManager');
const platforms = require('../../utils/platforms');

class PlatformActions {
  constructor() {
    this.comments = [
      "Great content! 🔥",
      "Love this! ❤️",
      "Amazing post! 👏",
      "This is awesome! 🙌",
      "So good! 💯",
      "Incredible! ✨",
      "Nice one! 👍",
      "This is fire! 🔥",
      "Love it! 💖",
      "Fantastic! 🌟"
    ];
  }

  getRandomComment() {
    return this.comments[Math.floor(Math.random() * this.comments.length)];
  }

  async navigateToPage(page, url, taskId) {
    try {
      console.log(`Navigating to ${url} for task ${taskId}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait for page to load
      await browserManager.humanLikeDelay(3000, 5000);
      
      // Scroll to simulate human behavior
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(1000, 2000);
      
      return true;
    } catch (error) {
      console.error(`Navigation failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async findAndClick(page, selectors, taskId, actionName) {
    const selectorsList = selectors.split(', ');
    
    for (const selector of selectorsList) {
      try {
        // Try to find the element
        const element = await page.waitForSelector(selector.trim(), { 
          timeout: 5000,
          visible: true 
        });
        
        if (element) {
          // Scroll into view
          await element.scrollIntoViewIfNeeded();
          await browserManager.humanLikeDelay(500, 1000);
          
          // Click with human-like behavior
          const box = await element.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await browserManager.humanLikeDelay(200, 500);
          }
          
          await element.click();
          console.log(`${actionName} successful for task ${taskId}`);
          return true;
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }
    
    throw new Error(`${actionName} button not found with selectors: ${selectors}`);
  }

  async performFollow(page, platform, taskId) {
    try {
      const config = platforms[platform];
      if (!config) throw new Error(`Unknown platform: ${platform}`);
      
      await this.findAndClick(page, config.selectors.followButton, taskId, 'Follow');
      await browserManager.humanLikeDelay(2000, 4000);
      return true;
    } catch (error) {
      console.error(`Follow action failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async performLike(page, platform, taskId) {
    try {
      const config = platforms[platform];
      
      await this.findAndClick(page, config.selectors.likeButton, taskId, 'Like');
      await browserManager.humanLikeDelay(1500, 3000);
      return true;
    } catch (error) {
      console.error(`Like action failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async performComment(page, platform, taskId, customComment = null) {
    try {
      const config = platforms[platform];
      const commentText = customComment || this.getRandomComment();
      
      // Find and click comment input
      await this.findAndClick(page, config.selectors.commentInput, taskId, 'Comment input');
      
      // Type comment
      await browserManager.humanLikeDelay(500, 1000);
      for (const char of commentText) {
        await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
      }
      
      await browserManager.humanLikeDelay(1000, 2000);
      
      // Submit comment
      await this.findAndClick(page, config.selectors.commentSubmit, taskId, 'Comment submit');
      await browserManager.humanLikeDelay(2000, 4000);
      
      return { success: true, comment: commentText };
    } catch (error) {
      console.error(`Comment action failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async performView(page, platform, taskId) {
    try {
      // Simulate watching/viewing
      const viewTime = Math.floor(Math.random() * 5000) + 5000;
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(viewTime, viewTime + 3000);
      return true;
    } catch (error) {
      console.error(`View action failed for task ${taskId}:`, error);
      throw error;
    }
  }
}

module.exports = new PlatformActions();
