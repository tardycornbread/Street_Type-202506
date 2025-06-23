// Typography orchestration layer for StreetType
import { assetManager } from './assetManager.js';
import { LetterSelector } from './letterSelector.js';
import { createLogger, generateFallbackLetterSVG } from './utils.js';
import { debug, defaults } from './config.js';

const logger = createLogger('Typography', debug.enabled);

/**
 * TypographyManager orchestrates asset loading and letter generation.
 */
export class TypographyManager {
  constructor() {
    this.initialized = false;
    this.letterSelector = new LetterSelector();
  }
  
  /**
   * Initialize the typography manager.
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      // Pre-warm cache with common letters
      this._prewarmCache();
      
      this.initialized = true;
      logger.log('Typography manager initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize typography manager', error);
      return false;
    }
  }
  
  /**
   * Pre-warm the cache with common letters.
   */
  async _prewarmCache() {
    const prewarmLetters = ['A', 'E', 'T', 'O'];
    const styles = ['sans', 'serif'];
    const cases = ['upper', 'lower'];
    
    // Fire-and-forget preloading
    for (const letter of prewarmLetters) {
      for (const style of styles) {
        for (const charCase of cases) {
          assetManager.get({
            char: letter,
            style,
            case: charCase,
            city: defaults.city,
            variant: '01'
          }).catch(() => {
            // Silently handle preload failures
          });
        }
      }
    }
  }
  
  /**
   * Convert text to an array of letter objects ready for rendering.
   */
  async getLettersFromText(text, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const opts = {
      style: defaults.fontStyle,
      city: defaults.city,
      caseOption: defaults.caseOption,
      ...options
    };
    
    // Validate and process text
    if (!text || typeof text !== 'string') {
      logger.warn('Invalid text input:', text);
      text = defaults.text;
    }
    
    // Handle case conversion
    let processedText = text;
    if (opts.caseOption === 'upper') {
      processedText = text.toUpperCase();
    } else if (opts.caseOption === 'lower') {
      processedText = text.toLowerCase();
    }
    
    logger.log(`Processing text "${text}" → "${processedText}" with options:`, opts);
    
    try {
      const letters = await this.letterSelector.selectLettersForText(
        processedText,
        opts.style,
        opts.city
      );
      
      logger.log(`Generated ${letters.length} letter objects`);
      return letters;
    } catch (error) {
      logger.error('Error processing text:', error);
      throw new Error(`Failed to process text: ${error.message}`);
    }
  }
  
  /**
   * Get comprehensive statistics about the typography system.
   */
  getStats() {
    return {
      assetManager: assetManager.getStats(),
      letterSelector: this.letterSelector.getStats(),
      initialized: this.initialized
    };
  }
  
  /**
   * Clear all caches.
   */
  clearCache() {
    assetManager.clearCache();
    logger.log('All caches cleared');
  }
  
  /**
   * Get available font styles.
   */
  getAvailableStyles() {
    return this.letterSelector.getAvailableStyles();
  }
}

// Export singleton instance
export const typographyManager = new TypographyManager();