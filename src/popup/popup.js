// Popup script for Udemy subtitle translator

class PopupManager {
  constructor() {
    this.elements = {};
    this.initializeElements();
    this.bindEvents();
    this.loadSettings();
    this.updateStatus();
  }

  initializeElements() {
    this.elements = {
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      enableToggle: document.getElementById('enableToggle'),
      apiKey: document.getElementById('apiKey'),
      toggleApiKey: document.getElementById('toggleApiKey'),
      saveBtn: document.getElementById('saveBtn'),
      sessionCount: document.getElementById('sessionCount'),
      cacheCount: document.getElementById('cacheCount'),
      clearCache: document.getElementById('clearCache'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toastMessage')
    };
  }

  bindEvents() {
    // Save button
    this.elements.saveBtn.addEventListener('click', () => {
      this.saveSettings();
    });

    // API key visibility toggle
    this.elements.toggleApiKey.addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    // Enable/disable toggle
    this.elements.enableToggle.addEventListener('change', () => {
      this.toggleExtension();
    });

    // Clear cache
    this.elements.clearCache.addEventListener('click', (e) => {
      e.preventDefault();
      this.clearTranslationCache();
    });

    // Auto-save API key on input
    this.elements.apiKey.addEventListener('input', () => {
      this.validateApiKey();
    });
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'apiKey', 
        'enabled',
        'translationStats'
      ]);

      // Load API key
      if (settings.apiKey) {
        this.elements.apiKey.value = settings.apiKey;
      }

      // Load enabled state
      this.elements.enableToggle.checked = settings.enabled !== false;

      // Load statistics
      this.updateStatistics(settings.translationStats);
      
      console.log('設定を読み込みました');
    } catch (error) {
      console.error('設定読み込みエラー:', error);
      this.showToast('設定の読み込みに失敗しました', 'error');
    }
  }

  async saveSettings() {
    try {
      this.elements.saveBtn.disabled = true;
      this.elements.saveBtn.textContent = '保存中...';

      const apiKey = this.elements.apiKey.value.trim();
      const enabled = this.elements.enableToggle.checked;

      // Validate API key
      if (apiKey && !this.isValidApiKey(apiKey)) {
        this.showToast('無効なAPIキー形式です', 'error');
        return;
      }

      // Save to storage
      await chrome.storage.sync.set({
        apiKey: apiKey,
        enabled: enabled
      });

      this.showToast('設定を保存しました', 'success');
      this.updateStatus();

      // Notify content script of toggle change if needed
      const tabs = await chrome.tabs.query({ 
        active: true, 
        url: '*://*.udemy.com/*' 
      });
      
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggle' 
        }).catch(err => {
          // Ignore errors if content script is not loaded
          console.log('Content script not available:', err);
        });
      }

    } catch (error) {
      console.error('設定保存エラー:', error);
      this.showToast('設定の保存に失敗しました', 'error');
    } finally {
      this.elements.saveBtn.disabled = false;
      this.elements.saveBtn.textContent = '設定を保存';
    }
  }

  toggleApiKeyVisibility() {
    const input = this.elements.apiKey;
    const button = this.elements.toggleApiKey;
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
    } else {
      input.type = 'password';
      button.textContent = '👁';
    }
  }

  async toggleExtension() {
    const enabled = this.elements.enableToggle.checked;
    
    try {
      await chrome.storage.sync.set({ enabled });
      this.updateStatus();
      
      // Send message to active Udemy tab
      const tabs = await chrome.tabs.query({ 
        active: true, 
        url: '*://*.udemy.com/*' 
      });
      
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggle' 
        }).catch(err => {
          console.log('Content script not available:', err);
        });
      }
      
      this.showToast(enabled ? '翻訳機能を有効にしました' : '翻訳機能を無効にしました', 'success');
    } catch (error) {
      console.error('トグル設定エラー:', error);
      this.showToast('設定の変更に失敗しました', 'error');
    }
  }

  async clearTranslationCache() {
    try {
      // Clear local storage (translation cache)
      await chrome.storage.local.clear();
      
      // Reset translation statistics
      const resetStats = { sessionCount: 0, cacheCount: 0 };
      await chrome.storage.sync.set({ translationStats: resetStats });
      
      this.updateStatistics(resetStats);
      this.showToast('キャッシュと統計情報をクリアしました', 'success');
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
      this.showToast('キャッシュのクリアに失敗しました', 'error');
    }
  }

  validateApiKey() {
    const apiKey = this.elements.apiKey.value.trim();
    const isValid = this.isValidApiKey(apiKey);
    
    this.elements.apiKey.style.borderColor = isValid || !apiKey ? '' : '#dc3545';
    this.elements.saveBtn.disabled = apiKey && !isValid;
  }

  isValidApiKey(apiKey) {
    // Generic API key validation (provider-independent)
    // Check for minimum length and valid characters
    return apiKey.length >= 20 && /^[A-Za-z0-9_-]+$/.test(apiKey);
  }

  async updateStatus() {
    try {
      const settings = await chrome.storage.sync.get(['apiKey', 'enabled']);
      const hasApiKey = !!settings.apiKey;
      const isEnabled = settings.enabled !== false;

      let status, statusClass;
      
      if (!hasApiKey) {
        status = 'APIキーが未設定です';
        statusClass = 'error';
      } else if (!isEnabled) {
        status = '翻訳機能が無効です';
        statusClass = 'warning';
      } else {
        // Check if we're on a Udemy page
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const isUdemyPage = tabs.length > 0 && tabs[0].url?.includes('udemy.com');
        
        if (isUdemyPage) {
          status = '翻訳準備完了';
          statusClass = 'success';
        } else {
          status = 'Udemyページで使用可能';
          statusClass = 'warning';
        }
      }

      this.elements.statusText.textContent = status;
      this.elements.statusDot.className = `status-dot ${statusClass}`;
      
      // Update border color of status indicator
      const statusIndicator = this.elements.statusDot.closest('.status-indicator');
      const borderColors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
      };
      statusIndicator.style.borderLeftColor = borderColors[statusClass];

    } catch (error) {
      console.error('ステータス更新エラー:', error);
    }
  }

  updateStatistics(stats = {}) {
    this.elements.sessionCount.textContent = stats.sessionCount || 0;
    this.elements.cacheCount.textContent = stats.cacheCount || 0;
  }

  showToast(message, type = 'info') {
    this.elements.toastMessage.textContent = message;
    this.elements.toast.className = `toast ${type}`;
    
    // Show toast
    setTimeout(() => {
      this.elements.toast.classList.remove('hidden');
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
      this.elements.toast.classList.add('hidden');
    }, 3000);
  }

  // Listen for storage changes to update UI
  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        if (changes.translationStats) {
          this.updateStatistics(changes.translationStats.newValue);
        }
        this.updateStatus();
      }
    });
  }

  // Refresh statistics from storage
  async refreshStatistics() {
    try {
      const settings = await chrome.storage.sync.get(['translationStats']);
      this.updateStatistics(settings.translationStats);
    } catch (error) {
      console.error('統計情報の更新エラー:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupManager();
  popup.setupStorageListener();
  
  // Refresh statistics when popup opens
  popup.refreshStatistics();
  
  // Refresh statistics periodically while popup is open
  const statsInterval = setInterval(() => {
    popup.refreshStatistics();
  }, 1000);
  
  // Clear interval when popup is closed
  window.addEventListener('beforeunload', () => {
    clearInterval(statsInterval);
  });
});

// Set default API key from environment variable for development
// In production, users should set their own API key
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.sync.get(['apiKey']);
    if (!result.apiKey) {
      // Only set the default key if no key is already stored
      // This is for development convenience
      const defaultKey = '';
      await chrome.storage.sync.set({ apiKey: defaultKey });
      console.log('開発用APIキーを設定しました');
    }
  } catch (error) {
    console.error('デフォルトAPIキー設定エラー:', error);
  }
});
