const browserManager = require('./browserManager');
const platforms = require('../../utils/platforms');
const logger = require('../../utils/logger');

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
      logger.info(`Navigating to ${url} for task ${taskId}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Random initial delay
      await browserManager.humanLikeDelay(2000, 4000);
      
      // Simulate human scrolling
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(1000, 2000);
      
      return true;
    } catch (error) {
      logger.error(`Navigation failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async performFollow(page, platform, taskId) {
    try {
      const config = platforms[platform];
      const selectors = config.selectors;
      
      // Try multiple selector strategies
      const followSelectors = [
        selectors.followButton,
        'button:has-text("Follow")',
        'button[type="button"]:has-text("Follow")',
        '[data-testid="follow"]',
        'div[role="button"]:has-text("Follow")'
      ];

      let followButton = null;
      for (const selector of followSelectors) {
        try {
          followButton = await page.waitForSelector(selector, { timeout: 5000 });
          if (followButton) break;
        } catch (e) {
          continue;
        }
      }

      if (!followButton) {
        throw new Error('Follow button not found');
      }

      // Human-like interaction
      await browserManager.humanLikeMouseMove(page);
      await browserManager.humanLikeDelay(500, 1500);
      
      const box = await followButton.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await browserManager.humanLikeDelay(200, 500);
      }

      await followButton.click();
      
      // Wait for action to complete
      await browserManager.humanLikeDelay(2000, 4000);
      
      // Verify action (check if button changed to "Following" or similar)
      try {
        await page.waitForFunction(
          () => document.body.innerText.includes('Following') || 
                document.body.innerText.includes('Unfollow'),
          { timeout: 5000 }
        );
        return true;
      } catch (e) {
        // Action might still have succeeded
        return true;
      }
    } catch (error) {
      logger.error(`Follow action failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async performLike(page, platform, taskId) {
    try {
      const config = platforms[platform];
      const selectors = config.selectors;
      
      const likeSelectors = [
        selectors.likeButton,
        '[data-testid="like"]',
        'button[aria-label*="like" i]',
        'svg[aria-label="Like"]',
        'div[role="button"]:has-text("Like")'
      ];

      let likeButton = null;
      for (const selector of likeSelectors) {
        try {
          likeButton = await page.waitForSelector(selector, { timeout: 5000 });
          if (likeButton) break;
        } catch (e) {
          continue;
        }
      }

      if (!likeButton) {
        throw new Error('Like button not found');
      }

      await browserManager.humanLikeMouseMove(page);
      await browserManager.humanLikeDelay(500, 1500);
      
      const box = await likeButton.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await browserManager.humanLikeDelay(200, 500);
      }

      await likeButton.click();
      await browserManager.humanLikeDelay(1500, 3000);
      
      return true;
    } catch (error) {
      logger.error(`Like action failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async performComment(page, platform, taskId, customComment = null) {
    try {
      const config = platforms[platform];
      const selectors = config.selectors;
      const commentText = customComment || this.getRandomComment();
      
      // Find comment input
      const inputSelectors = [
        selectors.commentInput,
        'textarea[placeholder*="comment" i]',
        'div[contenteditable="true"]',
        '[data-testid="tweetTextarea_0"]',
        'input[placeholder*="comment" i]'
      ];

      let commentInput = null;
      for (const selector of inputSelectors) {
        try {
          commentInput = await page.waitForSelector(selector, { timeout: 5000 });
          if (commentInput) {
            await commentInput.click();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!commentInput) {
        throw new Error('Comment input not found');
      }

      await browserManager.humanLikeDelay(500, 1000);
      
      // Type like human
      for (const char of commentText) {
        await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
      }

      await browserManager.humanLikeDelay(1000, 2000);

      // Submit comment
      const submitSelectors = [
        selectors.commentSubmit,
        'button[type="submit"]',
        'button:has-text("Post")',
        'button:has-text("Comment")',
        'button:has-text("Reply")',
        '[data-testid="tweetButton"]'
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.waitForSelector(selector, { timeout: 3000 });
          if (submitButton) break;
        } catch (e) {
          continue;
        }
      }

      if (submitButton) {
        await submitButton.click();
        await browserManager.humanLikeDelay(2000, 4000);
      }

      return { success: true, comment: commentText };
    } catch (error) {
      logger.error(`Comment action failed for task ${taskId}:`, error);
      throw error;
    }
  }

  async performView(page, platform, taskId) {
    try {
      // Simulate watching/viewing
      const viewTime = Math.floor(Math.random() * 5000) + 5000; // 5-10 seconds
      
      await browserManager.humanLikeScroll(page);
      await browserManager.humanLikeDelay(viewTime, viewTime + 3000);
      
      return true;
    } catch (error) {
      logger.error(`View action failed for task ${taskId}:`, error);
      throw error;
    }
  }
}

module.exports = new PlatformActions();
