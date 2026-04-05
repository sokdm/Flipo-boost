const platforms = {
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    icon: 'Music2',
    services: ['followers', 'likes', 'views', 'comments', 'shares'],
    baseUrl: 'https://www.tiktok.com',
    selectors: {
      followButton: '[data-e2e="follow-button"], button[type="button"]:has-text("Follow")',
      likeButton: '[data-e2e="like-icon"], [data-e2e="browse-like-icon"]',
      commentInput: '[data-e2e="comment-input"], textarea',
      commentSubmit: '[data-e2e="comment-post"], button:has-text("Post")'
    }
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    icon: 'Youtube',
    services: ['subscribers', 'likes', 'views', 'comments'],
    baseUrl: 'https://www.youtube.com',
    selectors: {
      subscribeButton: 'yt-formatted-string:has-text("Subscribe"), #subscribe-button button',
      likeButton: 'button[title="I like this"], button[aria-label*="like"]',
      commentInput: '#contenteditable-root',
      commentSubmit: '#submit-button'
    }
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    icon: 'Instagram',
    services: ['followers', 'likes', 'comments', 'views'],
    baseUrl: 'https://www.instagram.com',
    selectors: {
      followButton: 'button:has-text("Follow"), button[type="button"]:has(div:has-text("Follow"))',
      likeButton: 'svg[aria-label="Like"], button svg[aria-label="Like"]',
      commentInput: 'textarea[aria-label="Add a comment…"], textarea',
      commentSubmit: 'button[type="submit"]'
    }
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    icon: 'Facebook',
    services: ['followers', 'likes', 'comments', 'shares'],
    baseUrl: 'https://www.facebook.com',
    selectors: {
      followButton: 'div[aria-label="Follow"], button:has-text("Follow")',
      likeButton: 'div[aria-label="Like"], div[aria-label="Remove Like"]',
      commentInput: 'div[contenteditable="true"][role="textbox"]',
      commentSubmit: 'div[aria-label="Comment"], button[type="submit"]'
    }
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0A66C2',
    icon: 'Linkedin',
    services: ['followers', 'likes', 'comments', 'shares'],
    baseUrl: 'https://www.linkedin.com',
    selectors: {
      followButton: 'button:has-text("Follow"), button[aria-label*="Follow"]',
      likeButton: 'button[aria-label="Like"], button:has-text("Like")',
      commentInput: 'div[contenteditable="true"][role="textbox"]',
      commentSubmit: 'button[type="submit"]'
    }
  },
  x: {
    name: 'X / Twitter',
    color: '#000000',
    icon: 'Twitter',
    services: ['followers', 'likes', 'comments', 'retweets'],
    baseUrl: 'https://twitter.com',
    selectors: {
      followButton: 'div[role="button"]:has-text("Follow"), button:has-text("Follow")',
      likeButton: 'div[role="button"][data-testid="like"], button[data-testid="like"]',
      commentInput: 'div[contenteditable="true"][data-testid="tweetTextarea_0"]',
      commentSubmit: 'div[role="button"][data-testid="tweetButton"], button:has-text("Reply")'
    }
  }
};

module.exports = platforms;
