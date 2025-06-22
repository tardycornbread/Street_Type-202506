// Letter selection and text processing for StreetType
import { assetManager } from './assetManager.js';
import { createLogger } from './utils.js';
import { debug, fontStyles } from './config.js';

const logger = createLogger('LetterSelector', debug.enabled);

/**
 * LetterSelector converts plain text into the array that Renderer expects:
 * [{ type:'letter'|'space'|'special', value:'A', url?, style? }, … ]
 */
export class LetterSelector {
  constructor() {
    this.variants = ['01', '02', '03', '04', '05'];
    this.availableStyles = fontStyles.map(s => s.value);
    // Prioritize styles that are more likely to have assets
    this.primaryStyles = ['sans', 'serif'];
    this.fallbackStyles = ['mono', 'script', 'decorative'];
  }

  /**
   * Get a random item from an array.
   */
  _random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get a random style with weighted preference for styles that have assets.
   */
  _getRandomStyle() {
    // 70% chance to pick from primary styles (sans/serif)
    // 30% chance to pick from all styles
    const usePrimary = Math.random() < 0.7;
    const stylePool = usePrimary ? this.primaryStyles : this.availableStyles;
    return this._random(stylePool);
  }

  /**
   * Build a letter object with asset URL.
   */
  async _buildLetterObj(char, requestedStyle, city) {
    let style = requestedStyle;
    let attempts = 0;
    const maxAttempts = 3;
    
    // For random style, try multiple styles if assets aren't found
    while (attempts < maxAttempts) {
      if (requestedStyle === 'random') {
        style = attempts === 0 ? this._getRandomStyle() : this._random(this.primaryStyles);
      }
      
      const charCase = char === char.toUpperCase() ? 'upper' : 'lower';
      const variant = this._random(this.variants);

      try {
        const url = await assetManager.get({
          char: char.toUpperCase(),
          style,
          case: charCase,
          city,
          variant
        });
        
        // If we got a real asset (not SVG fallback), return it
        if (!url.startsWith('data:image/svg+xml')) {
          return {
            type: 'letter',
            value: char,
            url,
            style: `${style}-${charCase}`,
            isFallback: false
          };
        }
        
        // If it's an SVG fallback and we're doing random style, try another style
        if (requestedStyle === 'random' && attempts < maxAttempts - 1) {
          logger.log(`SVG fallback for "${char}" with style "${style}", trying different style...`);
          attempts++;
          continue;
        }
        
        // Accept the SVG fallback
        return {
          type: 'letter',
          value: char,
          url,
          style: `${style}-${charCase}`,
          isFallback: true
        };
        
      } catch (error) {
        logger.warn(`Failed to load asset for "${char}" with style "${style}":`, error);
        
        // If random style and we have attempts left, try another style
        if (requestedStyle === 'random' && attempts < maxAttempts - 1) {
          attempts++;
          continue;
        }
        
        // Final fallback - return letter object for text rendering
        return {
          type: 'letter',
          value: char,
          style: `${style}-${charCase}`,
          isFallback: true
        };
      }
    }
    
    // Should never reach here, but just in case
    return {
      type: 'letter',
      value: char,
      style: `sans-${char === char.toUpperCase() ? 'upper' : 'lower'}`,
      isFallback: true
    };
  }

  /**
   * Convert text to array of letter objects.
   * @param {string} text - Raw user text
   * @param {string} style - Font style
   * @param {string} city - City code
   * @returns {Promise<Array>} Array of letter objects
   */
  async selectLettersForText(text, style = 'sans', city = 'NYC') {
    logger.log(`Processing text: "${text}" with style: ${style}`);
    
    if (style === 'random') {
      logger.log('Random mix selected - will vary styles per letter');
    }
    
    const tasks = Array.from(text).map((char, index) => {
      if (char === ' ') {
        return Promise.resolve({ type: 'space', value: ' ' });
      }
      
      if (/[a-zA-Z0-9]/.test(char)) {
        return this._buildLetterObj(char, style, city);
      }
      
      // Special characters (punctuation, symbols)
      return this._buildLetterObj(char, style, city);
    });

    // Resolve all async loads in parallel
    const results = await Promise.all(tasks);
    
    if (style === 'random') {
      const styleDistribution = {};
      results.filter(r => r.type === 'letter').forEach(letter => {
        const letterStyle = letter.style?.split('-')[0] || 'unknown';
        styleDistribution[letterStyle] = (styleDistribution[letterStyle] || 0) + 1;
      });
      logger.log('Random mix style distribution:', styleDistribution);
    }
    
    logger.log(`Generated ${results.length} letter objects`);
    
    return results;
  }

  /**
   * Get available styles.
   */
  getAvailableStyles() {
    return this.availableStyles;
  }

  /**
   * Get asset manager statistics.
   */
  getStats() {
    return assetManager.getStats();
  }
}

