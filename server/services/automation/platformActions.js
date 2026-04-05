const browserManager = require('./browserManager');
const platforms = require('../../utils/platforms');

class PlatformActions {
  constructor() {
    this.comments = [
      "Great content! 🔥",
      "Love this! ❤️",
      "Amazing! 👏",
      "Awesome! 🙌",
      "So good! 💯"
    ];
  }

  getRandomComment() {
    return this.comments[Math.floor(Math.random() * this.comments.length)];
  }

  async navigateToPage(page, url, taskId) {
    try {
      console.log(`Navigating to ${url}`);
      
      // Navigate
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // LONG wait for page to fully render
      console.log('Page loaded, waiting...');
      await browserManager.humanLikeDelay(10000, 15000);
      
      // Scroll through content like a human
      console.log('Scrolling...');
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(5000, 8000);
      
      // Scroll more
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(3000, 5000);
      
      return true;
    } catch (error) {
      console.error(`Navigation failed:`, error);
      throw error;
    }
  }

  async findAndClick(page, selectors, taskId, actionName) {
    const selectorsList = selectors.split(', ');
    
    for (const selector of selectorsList) {
      try {
        console.log(`Trying selector: ${selector.trim()}`);
        
        const element = await page.waitForSelector(selector.trim(), { 
          timeout: 10000,
          visible: true 
        });
        
        if (element) {
          console.log(`Found ${actionName} button`);
          
          // Scroll to it slowly
          await element.scrollIntoViewIfNeeded();
          await browserManager.humanLikeDelay(2000, 4000);
          
          // Hover first
          await element.hover();
          await browserManager.humanLikeDelay(1000, 2000);
          
          // Click
          await element.click();
          console.log(`${actionName} clicked!`);
          return true;
        }
      } catch (e) {
        console.log(`Selector failed: ${selector.trim()}`);
        continue;
      }
    }
    
    throw new Error(`${actionName} not found`);
  }

  async performFollow(page, platform, taskId) {
    try {
      const config = platforms[platform];
      
      // Watch content first (CRITICAL)
      console.log('Watching content before follow...');
      await browserManager.humanLikeDelay(15000, 25000);
      
      // Try to find and click follow
      await this.findAndClick(page, config.selectors.followButton, taskId, 'Follow');
      
      // Wait after follow
      await browserManager.humanLikeDelay(10000, 15000);
      
      return true;
    } catch (error) {
      console.error(`Follow failed:`, error);
      throw error;
    }
  }

  async performLike(page, platform, taskId) {
    try {
      const config = platforms[platform];
      
      await browserManager.humanLikeDelay(5000, 10000);
      await this.findAndClick(page, config.selectors.likeButton, taskId, 'Like');
      await browserManager.humanLikeDelay(8000, 12000);
      
      return true;
    } catch (error) {
      console.error(`Like failed:`, error);
      throw error;
    }
  }

  async performView(page, platform, taskId) {
    try {
      // Watch for 30-60 seconds
      const viewTime = Math.floor(Math.random() * 30000) + 30000;
      console.log(`Viewing for ${viewTime}ms...`);
      
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(viewTime, viewTime + 10000);
      
      return true;
    } catch (error) {
      console.error(`View failed:`, error);
      throw error;
    }
  }
}

module.exports = new PlatformActions();
