// Clean asset pipeline for normalized StreetType asset structure
import { createLogger, checkFileExists, loadImage, generateFallbackLetterSVG } from './utils.js';
import { debug } from './config.js';

const logger = createLogger('AssetManager', debug.enabled);

/**
 * AssetManager handles loading assets from the normalized folder structure:
 * assets/Alphabet/cities/<CITY>/Alphabet/<LETTER>/<STYLE>-<case>/XX.jpg
 * assets/Numbers/<DIGIT>/XX.jpg  
 * assets/Symbols/<SYMBOL>/XX.jpg
 */
export class AssetManager {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.stats = {
      requested: 0,
      loaded: 0,
      failed: 0,
      cached: 0,
      fallbacks: 0
    };
  }

  /**
   * Get an asset with full fallback chain.
   * @param {Object} params - Asset parameters
   * @param {string} params.char - Character to load
   * @param {string} params.style - Style (sans, serif, etc.)
   * @param {string} params.case - Case (upper, lower)
   * @param {string} params.city - City code
   * @param {string} params.variant - Variant number (01, 02, etc.)
   * @returns {Promise<string>} Working URL or throws
   */
  async get({ char, style, case: charCase, city = 'NYC', variant = '01' }) {
    this.stats.requested++;
    
    const cacheKey = `${char}_${style}_${charCase}_${city}_${variant}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      this.stats.cached++;
      return this.cache.get(cacheKey);
    }
    
    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }
    
    // Start loading
    const loadPromise = this._loadWithFallbacks({ char, style, case: charCase, city, variant });
    this.loadingPromises.set(cacheKey, loadPromise);
    
    try {
      const url = await loadPromise;
      this.cache.set(cacheKey, url);
      this.loadingPromises.delete(cacheKey);
      return url;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Load asset with complete fallback chain.
   */
  async _loadWithFallbacks({ char, style, case: charCase, city, variant }) {
    const paths = this._buildFallbackPaths({ char, style, case: charCase, city, variant });
    
    logger.log(`Trying ${paths.length} paths for "${char}"`);
    
    // Try each path in order
    for (const path of paths) {
      try {
        const exists = await checkFileExists(path, 1000);
        if (exists) {
          logger.log(`Found asset: ${path}`);
          this.stats.loaded++;
          return path;
        }
      } catch (error) {
        logger.warn(`Error checking path ${path}:`, error);
      }
    }
    
    // No asset found, generate SVG fallback
    logger.warn(`No assets found for "${char}", using SVG fallback`);
    this.stats.fallbacks++;
    const fullStyle = charCase ? `${style}-${charCase}` : style;
    return generateFallbackLetterSVG(char, fullStyle);
  }

  /**
   * Build fallback path chain according to asset structure.
   */
  _buildFallbackPaths({ char, style, case: charCase, city, variant }) {
    const paths = [];
    const paddedVariant = variant.padStart(2, '0');
    
    // Determine asset type
    if (/^[a-zA-Z]$/.test(char)) {
      // Letter paths
      const letter = char.toUpperCase();
      const styleCase = `${style}-${charCase}`;
      
      // Primary path: assets/Alphabet/cities/NYC/Alphabet/A/sans-upper/01.jpg
      paths.push(`assets/Alphabet/cities/${city}/Alphabet/${letter}/${styleCase}/${paddedVariant}.jpg`);
      
      // City fallback: assets/Alphabet/cities/NYC/fallback/sans-upper/01.jpg
      paths.push(`assets/Alphabet/cities/${city}/fallback/${styleCase}/${paddedVariant}.jpg`);
      
      // Try other variants in the same style
      for (let i = 1; i <= 5; i++) {
        if (i.toString().padStart(2, '0') !== paddedVariant) {
          const altVariant = i.toString().padStart(2, '0');
          paths.push(`assets/Alphabet/cities/${city}/Alphabet/${letter}/${styleCase}/${altVariant}.jpg`);
        }
      }
      
    } else if (/^[0-9]$/.test(char)) {
      // Number paths
      paths.push(`assets/Numbers/${char}/${paddedVariant}.jpg`);
      
      // Try other variants
      for (let i = 1; i <= 5; i++) {
        if (i.toString().padStart(2, '0') !== paddedVariant) {
          const altVariant = i.toString().padStart(2, '0');
          paths.push(`assets/Numbers/${char}/${altVariant}.jpg`);
        }
      }
      
    } else {
      // Symbol paths
      const symbolName = this._mapSymbolToFolderName(char);
      paths.push(`assets/Symbols/${symbolName}/${paddedVariant}.jpg`);
      
      // Try other variants
      for (let i = 1; i <= 5; i++) {
        if (i.toString().padStart(2, '0') !== paddedVariant) {
          const altVariant = i.toString().padStart(2, '0');
          paths.push(`assets/Symbols/${symbolName}/${altVariant}.jpg`);
        }
      }
    }
    
    // Global fallback
    paths.push('assets/missing.png');
    
    return paths;
  }

  /**
   * Map symbols to their folder names.
   */
  _mapSymbolToFolderName(symbol) {
    const symbolMap = {
      '!': 'exclamation',
      '?': 'question',
      '.': 'period',
      ',': 'comma',
      ':': 'colon',
      ';': 'semicolon',
      '"': 'quote',
      "'": 'apostrophe',
      '(': 'parenthesis-open',
      ')': 'parenthesis-close',
      '[': 'bracket-open',
      ']': 'bracket-close',
      '{': 'brace-open',
      '}': 'brace-close',
      '<': 'angle-open',
      '>': 'angle-close',
      '+': 'plus',
      '-': 'minus',
      '*': 'asterisk',
      '/': 'slash',
      '\\': 'backslash',
      '|': 'vertical-bar',
      '=': 'equals',
      '@': 'at',
      '#': 'hash',
      '$': 'dollar',
      '%': 'percent',
      '^': 'caret',
      '&': 'ampersand',
      '_': 'underscore'
    };
    
    return symbolMap[symbol] || 'symbol';
  }

  /**
   * Get loading statistics.
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      pendingLoads: this.loadingPromises.size
    };
  }

  /**
   * Clear cache.
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
    logger.log('Cache cleared');
  }
}

// Export singleton instance
export const assetManager = new AssetManager();