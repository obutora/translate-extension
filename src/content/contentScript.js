// Content script for Udemy subtitle translation

class UdemySubtitleTranslator {
  constructor() {
    this.isEnabled = true;
    this.currentSubtitle = '';
    this.translationCache = new Map();
    this.observer = null;
    this.translatedSubtitleContainer = null;
    this.isTranslating = false;
    
    this.init();
  }

  async init() {
    // Check if extension is enabled
    const settings = await this.getSettings();
    this.isEnabled = settings.enabled !== false;
    
    // Load cached translations from storage
    await this.loadCachedTranslations();
    
    if (this.isEnabled) {
      this.createTranslatedSubtitleContainer();
      this.startObserving();
      console.log('Udemy字幕翻訳拡張が開始されました');
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['enabled', 'displayPosition'], (result) => {
        resolve(result);
      });
    });
  }

  async loadCachedTranslations() {
    try {
      const result = await chrome.storage.local.get(['translationCache']);
      const cache = result.translationCache || {};
      
      // Load cached translations into memory map
      Object.entries(cache).forEach(([original, translated]) => {
        this.translationCache.set(original, translated);
      });
      
      console.log(`キャッシュから ${Object.keys(cache).length} 件の翻訳を読み込みました`);
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error);
    }
  }

  async updateCacheCount() {
    try {
      const result = await chrome.storage.sync.get(['translationStats']);
      const stats = result.translationStats || { sessionCount: 0, cacheCount: 0 };
      
      stats.cacheCount += 1;
      
      await chrome.storage.sync.set({ translationStats: stats });
      console.log('Cache count updated:', stats.cacheCount);
    } catch (error) {
      console.error('Error updating cache count:', error);
    }
  }

  createTranslatedSubtitleContainer() {
    // Create container for translated subtitles
    this.translatedSubtitleContainer = document.createElement('div');
    this.translatedSubtitleContainer.id = 'udemy-translated-subtitle';
    this.translatedSubtitleContainer.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 24px;
      font-family: Arial, sans-serif;
      z-index: 10000;
      max-width: 80%;
      text-align: center;
      display: none;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      line-height: 1.4;
    `;
    
    document.body.appendChild(this.translatedSubtitleContainer);
  }

  startObserving() {
    const targetNode = document.body;
    const config = {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    };

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations();
    });

    this.observer.observe(targetNode, config);
  }

  handleMutations() {
    if (!this.isEnabled || this.isTranslating) return;

    const subtitle = this.extractSubtitle();
    
    if (subtitle && subtitle !== this.currentSubtitle && subtitle.trim() !== '') {
      this.currentSubtitle = subtitle;
      this.processSubtitle(subtitle);
    } else if (!subtitle) {
      // Hide translated subtitle when original subtitle disappears
      this.hideTranslatedSubtitle();
    }
  }

  extractSubtitle() {
    // Try different selectors for Udemy subtitles
    const selectors = [
      "div[class^='well--container--']",
      "div[class^='captions-display--captions-container']",
      ".captions-display--captions-container",
      "[data-purpose='captions-cue-text']",
      ".transcript-cue-container span"
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return null;
  }

  async processSubtitle(subtitle) {
    // Check cache first
    if (this.translationCache.has(subtitle)) {
      this.displayTranslatedSubtitle(this.translationCache.get(subtitle));
      // Update cache count for cache hit
      await this.updateCacheCount();
      return;
    }

    this.isTranslating = true;
    
    // Show loading indicator
    this.showLoadingIndicator();

    try {
      // Send to background script for translation
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'translate',
          text: subtitle
        }, resolve);
      });

      if (response.status === 'processing') {
        console.log('翻訳処理中...');
      }
    } catch (error) {
      console.error('翻訳リクエストエラー:', error);
      this.hideTranslatedSubtitle();
    } finally {
      this.isTranslating = false;
    }
  }

  showLoadingIndicator() {
    if (this.translatedSubtitleContainer) {
      this.translatedSubtitleContainer.textContent = '翻訳中...';
      this.translatedSubtitleContainer.style.display = 'block';
    }
  }

  displayTranslatedSubtitle(translatedText) {
    if (this.translatedSubtitleContainer && translatedText) {
      this.translatedSubtitleContainer.textContent = translatedText;
      this.translatedSubtitleContainer.style.display = 'block';
      
      // Cache the translation
      this.translationCache.set(this.currentSubtitle, translatedText);
    }
  }

  hideTranslatedSubtitle() {
    if (this.translatedSubtitleContainer) {
      this.translatedSubtitleContainer.style.display = 'none';
    }
  }

  showError(errorMessage) {
    if (this.translatedSubtitleContainer) {
      this.translatedSubtitleContainer.textContent = `エラー: ${errorMessage}`;
      this.translatedSubtitleContainer.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
      this.translatedSubtitleContainer.style.display = 'block';
      
      // Reset background color after 3 seconds
      setTimeout(() => {
        this.translatedSubtitleContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      }, 3000);
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      this.startObserving();
      console.log('字幕翻訳が有効になりました');
    } else {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.hideTranslatedSubtitle();
      console.log('字幕翻訳が無効になりました');
    }

    // Save setting
    chrome.storage.sync.set({ enabled: this.isEnabled });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.translatedSubtitleContainer) {
      this.translatedSubtitleContainer.remove();
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'displayTranslation') {
    translator.displayTranslatedSubtitle(request.translatedText);
  }
  
  if (request.action === 'translationError') {
    translator.showError(request.error);
  }
  
  if (request.action === 'toggle') {
    translator.toggle();
    sendResponse({ enabled: translator.isEnabled });
  }
});

// Initialize translator when page loads
let translator;

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTranslator);
} else {
  initializeTranslator();
}

function initializeTranslator() {
  // Wait a bit more for Udemy's dynamic content to load
  setTimeout(() => {
    translator = new UdemySubtitleTranslator();
  }, 2000);
}

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  if (translator) {
    translator.destroy();
  }
});
