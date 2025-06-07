// Background script for OpenAI API translation (previously Groq)

class TranslationService {
  constructor() {
    // Groq API (commented out)
    // this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    // this.defaultModel = "gemma2-9b-it"
    // this.defaultModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
    
    // OpenAI API
    this.openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
    this.defaultModel = 'gpt-4.1-nano-2025-04-14';
  }

  async getApiKey() {
    // Generic API key (provider-independent)
    const result = await chrome.storage.sync.get(['apiKey']);
    return result.apiKey;
  }

  async translateText(text, tabId) {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        this.sendErrorToContent(tabId, 'APIキーが設定されていません');
        return;
      }

      // Groq API request (commented out)
      /*
      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "日本語に翻訳して、日本語のみを出力して"
            },
            {
              role: "user",
              content: text
            }
          ],
          model: this.defaultModel,
          temperature: 1,
          max_completion_tokens: 1024,
          top_p: 1,
          stream: false,
          stop: null
        })
      });
      */

      // OpenAI API request
      const response = await fetch(this.openaiApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            {
              role: "system",
              content: "日本語に翻訳して、日本語のみを出力して"
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 1,
          max_tokens: 1024,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0]?.message?.content || '';

      // Update session translation count
      await this.updateSessionCount();

      // Store translation in cache
      await this.storeTranslationCache(text, translatedText);

      // Send translated text back to content script
      chrome.tabs.sendMessage(tabId, {
        action: 'displayTranslation',
        originalText: text,
        translatedText: translatedText
      });

    } catch (error) {
      console.error('Translation error:', error);
      this.sendErrorToContent(tabId, `翻訳エラー: ${error.message}`);
    }
  }

  sendErrorToContent(tabId, errorMessage) {
    chrome.tabs.sendMessage(tabId, {
      action: 'translationError',
      error: errorMessage
    });
  }

  async updateSessionCount() {
    try {
      const result = await chrome.storage.sync.get(['translationStats']);
      const stats = result.translationStats || { sessionCount: 0, cacheCount: 0 };
      
      stats.sessionCount += 1;
      
      await chrome.storage.sync.set({ translationStats: stats });
      console.log('Session count updated:', stats.sessionCount);
    } catch (error) {
      console.error('Error updating session count:', error);
    }
  }

  async storeTranslationCache(originalText, translatedText) {
    try {
      const result = await chrome.storage.local.get(['translationCache']);
      const cache = result.translationCache || {};
      
      cache[originalText] = translatedText;
      
      await chrome.storage.local.set({ translationCache: cache });
    } catch (error) {
      console.error('Error storing translation cache:', error);
    }
  }
}

// Initialize translation service
const translationService = new TranslationService();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    translationService.translateText(request.text, sender.tab.id);
    sendResponse({ status: 'processing' });
  }
  
  if (request.action === 'checkApiKey') {
    translationService.getApiKey().then(apiKey => {
      sendResponse({ hasApiKey: !!apiKey });
    });
    return true; // Will respond asynchronously
  }
  
  return false;
});

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Udemy字幕翻訳拡張がインストールされました');
  
  // Set default API key from environment if available
  // Note: In production, users should set their own API key through popup
  const result = await chrome.storage.sync.get(['apiKey']);
  if (!result.apiKey) {
    // This is just for development - users should set their own key
    console.log('APIキーが設定されていません。ポップアップから設定してください。');
  }
});
