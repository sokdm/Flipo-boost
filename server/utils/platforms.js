const platforms = {
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    services: ['followers', 'likes', 'views', 'comments', 'shares'],
    baseUrl: 'https://www.tiktok.com',
    selectors: {
      followButton: 'button[data-e2e="follow-button"], button:has-text("Follow"), [type="button"]:has-text("Follow")',
      likeButton: '[data-e2e="like-icon"], [data-e2e="browse-like-icon"], svg[data-e2e="like-icon"]',
      commentInput: '[data-e2e="comment-input"], textarea',
      commentSubmit: '[data-e2e="comment-post"], button:has-text("Post")'
    }
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    services: ['subscribers', 'likes', 'views', 'comments'],
    baseUrl: 'https://www.youtube.com',
    selectors: {
      subscribeButton: '#subscribe-button button, yt-formatted-string:has-text("Subscribe"), button:has-text("Subscribe")',
      likeButton: 'button[aria-label*="like" i], button[title="I like this"], #top-level-buttons button:first-child',
      commentInput: '#contenteditable-root, #placeholder-area',
      commentSubmit: '#submit-button, button:has-text("Comment")'
    }
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    services: ['followers', 'likes', 'comments', 'views'],
    baseUrl: 'https://www.instagram.com',
    selectors: {
      followButton: 'button:has-text("Follow"), button[type="button"]:has(div:has-text("Follow")), ._acan._acap._acas',
      likeButton: 'svg[aria-label="Like"], button svg[aria-label="Like"], [aria-label="Like"]',
      commentInput: 'textarea[placeholder*="comment" i], textarea[aria-label="Add a comment…"]',
      commentSubmit: 'button[type="submit"], button:has-text("Post")'
    }
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    services: ['followers', 'likes', 'comments', 'shares'],
    baseUrl: 'https://www.facebook.com',
    selectors: {
      followButton: 'div[role="button"]:has-text("Follow"), button:has-text("Follow"), [aria-label="Follow"]',
      likeButton: 'div[aria-label="Like"], div[aria-label="Remove Like"], [role="button"]:has-text("Like")',
      commentInput: 'div[contenteditable="true"][role="textbox"]',
      commentSubmit: 'div[role="button"][aria-label="Comment"], button[type="submit"]'
    }
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0A66C2',
    services: ['followers', 'likes', 'comments', 'shares'],
    baseUrl: 'https://www.linkedin.com',
    selectors: {
      followButton: 'button:has-text("Follow"), button[aria-label*="Follow" i], .follow',
      likeButton: 'button[aria-label="Like"], button:has-text("Like"), .react-button__like',
      commentInput: 'div[contenteditable="true"][role="textbox"]',
      commentSubmit: 'button[type="submit"], button:has-text("Post")'
    }
  },
  x: {
    name: 'X / Twitter',
    color: '#000000',
    services: ['followers', 'likes', 'comments', 'retweets'],
    baseUrl: 'https://twitter.com',
    selectors: {
      followButton: 'div[role="button"]:has-text("Follow"), button:has-text("Follow"), [data-testid="follow"]',
      likeButton: 'div[role="button"][data-testid="like"], button[data-testid="like"], [aria-label="Like"]',
      commentInput: 'div[contenteditable="true"][data-testid="tweetTextarea_0"]',
      commentSubmit: 'div[role="button"][data-testid="tweetButton"], button:has-text("Reply")'
    }
  }
};

module.exports = platforms;
