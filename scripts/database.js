// Enhanced database.js with debugging for symbols
import { generateFallbackLetterSVG } from './utils.js';

export default class LetterDatabase {
  constructor() {
    this.letterCache = {};       // Cache loaded Image objects
    this.loadingPromises = {};   // Ongoing load promises
    this.pathExistsCache = {};   // Cache results of pathExists checks
    this.assetsDetected = false; // Flag to track if we've detected any assets
    this.decorativePathFormat = null; // Store detected decorative path format
    
    // Check for assets once to avoid excessive 404s
    this._checkForAssets();
  }
  
  /**
   * Quick check to see if any assets exist to reduce 404 errors
   */
  async _checkForAssets() {
    console.log('Checking for asset availability...');
    
    // Check each category separately
    let alphabetAssetsFound = false;
    let numberAssetsFound = false;
    let symbolAssetsFound = false;
    let decorativeAssetsFound = false;
    
    // First check basic alphabet
    const basicPaths = [
      'assets/Alphabet/cities/NYC/Alphabet/A/sans-upper/01.jpg',
      'assets/Alphabet/cities/NYC/Alphabet/a/sans-lower/01.jpg',
      'assets/Alphabet/cities/NYC/Alphabet/A/serif-upper/01.jpg'
    ];
    
    for (const path of basicPaths) {
      const exists = await this.pathExists(path);
      if (exists) {
        alphabetAssetsFound = true;
        this.assetsDetected = true;
        console.log(`Alphabet assets detected at path: ${path}`);
        break;
      }
    }
    
    // Now check numbers
    const numberPaths = [
      'assets/Numbers/1/01.jpg',
      'assets/Numbers/0/01.jpg'
    ];
    
    for (const path of numberPaths) {
      const exists = await this.pathExists(path);
      if (exists) {
        numberAssetsFound = true;
        this.assetsDetected = true;
        console.log(`Number assets detected at path: ${path}`);
        break;
      }
    }
    
    // Check symbols
    const symbolPaths = [
      'assets/Symbols/period/01.jpg',
      'assets/Symbols/comma/01.jpg'
    ];
    
    for (const path of symbolPaths) {
      const exists = await this.pathExists(path);
      if (exists) {
        symbolAssetsFound = true;
        this.assetsDetected = true;
        console.log(`Symbol assets detected at path: ${path}`);
        break;
      }
    }
    
    // Check decorative paths with different variations
    // Test multiple possible structures for decorative letters
    const decorativePathVariations = [
      // Structure 1: With Display folder and hyphen
      'assets/Alphabet/cities/NYC/Alphabet/A/Display/Decorative-upper/01.jpg',
      // Structure 2: Without Display folder
      'assets/Alphabet/cities/NYC/Alphabet/A/Decorative-upper/01.jpg',
      // Structure 3: With Display folder but no hyphen
      'assets/Alphabet/cities/NYC/Alphabet/A/Display/Decorative/upper/01.jpg',
      // Structure 4: With different capitalization
      'assets/Alphabet/cities/NYC/Alphabet/A/display/decorative-upper/01.jpg',
      // Structure 5: Check Q specifically
      'assets/Alphabet/cities/NYC/Alphabet/Q/Display/Decorative-upper/01.jpg',
      'assets/Alphabet/cities/NYC/Alphabet/Q/Decorative-upper/01.jpg'
    ];
    
    for (const path of decorativePathVariations) {
      const exists = await this.pathExists(path);
      if (exists) {
        decorativeAssetsFound = true;
        this.assetsDetected = true;
        this.decorativePathFormat = path; // Store the working format
        console.log(`Decorative assets detected at path: ${path}`);
        break;
      }
    }
    
    this.pathExistsCache.checked = true;
    
    // Log what we found
    console.log(`Asset detection complete: 
      - Alphabet assets: ${alphabetAssetsFound ? 'FOUND' : 'NOT FOUND'}
      - Number assets: ${numberAssetsFound ? 'FOUND' : 'NOT FOUND'}
      - Symbol assets: ${symbolAssetsFound ? 'FOUND' : 'NOT FOUND'}
      - Decorative assets: ${decorativeAssetsFound ? 'FOUND' : 'NOT FOUND'}
    `);
    
    if (!this.assetsDetected) {
      console.warn('No assets detected. Will use SVG fallbacks.');
    } else {
      console.log('Assets detected and available.');
    }
  }

  /**
   * Test whether an image URL actually exists by letting the browser try to load it.
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async pathExists(path) {
    // Check cache first
    if (path in this.pathExistsCache) {
      const result = this.pathExistsCache[path];
      console.log(`Path cache hit: ${path}, exists: ${result}`);
      return result;
    }
    
    // Skip checking if we already know no assets exist
    if (this.pathExistsCache.checked && !this.assetsDetected) {
      console.log(`Skipping check for ${path} - no assets detected`);
      return false;
    }
    
    console.log(`Testing path: ${path}`);
    
    return new Promise(resolve => {
      const img = new Image();
      
      // Set a timeout to avoid waiting too long
      const timeoutId = setTimeout(() => {
        console.log(`Timeout checking path: ${path}`);
        this.pathExistsCache[path] = false;
        resolve(false);
      }, 1000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        console.log(`Path exists: ${path}`);
        this.pathExistsCache[path] = true;
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        console.log(`Path does not exist: ${path}`);
        this.pathExistsCache[path] = false;
        resolve(false);
      };
      
      // Add cache buster to avoid browser caching
      img.src = `${path}?t=${Date.now()}`;
    });
  }

  /**
   * Map your UI style values → actual folder names on disk.
   * Note: This is kept for compatibility, but we're using direct folder name mapping in getLetterPath
   */
  static styleFolderMap = {
    // These are just informational now, as we handle the paths directly in getLetterPath
    sans:       'sans',
    serif:      'serif',
    decorative: 'Display/Decorative',
    display:    'Display/Decorative',
    random:     'sans'
  };

  /**
   * Build the path for a character's numbered JPG variant.
   * Returns null for unsupported characters.
   *
   * @param {string} character    A single alphanumeric character or symbol
   * @param {string} styleKey     One of: "sans", "serif", "decorative", etc.
   * @param {string} location     City code (e.g. "NYC")
   * @param {number} variantIndex 1-based index to pick 01.jpg → 05.jpg
   * @returns {string|null} URL relative to web root
   */
  getLetterPath(character, styleKey, location, variantIndex = 1) {
    // Format the variant index as a two-digit string
    const idx = String(variantIndex).padStart(2, '0');
    
    // Handle numbers (0-9)
    if (/^[0-9]$/.test(character)) {
      // For numbers, use the root Numbers folder - style independent
      return [
        'assets',
        'Numbers',
        character,
        `${idx}.jpg`
      ].join('/');
    }
    
    // Handle common symbols with special naming
    // FIX: Properly escape backslash and hyphen in regex
    const symbolRegex = /^[!@#$%^&*()+\\=\[\]{}|;':",./<>?_\-]$/;
    if (symbolRegex.test(character)) {
      console.log(`[Database] Character "${character}" is a symbol`);
      let symbolName = 'symbol'; // Default name
      
      // Map symbols to folder names
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
      
      if (character in symbolMap) {
        symbolName = symbolMap[character];
        console.log(`[Database] Mapped symbol "${character}" to folder "${symbolName}"`);
      }
      
      // For symbols, use the root Symbols folder - style independent
      const symbolPath = [
        'assets',
        'Symbols',
        symbolName,
        `${idx}.jpg`
      ].join('/');
      
      console.log(`[Database] Generated symbol path: ${symbolPath}`);
      return symbolPath;
    }
    
    // Handle alpha characters (a-z, A-Z)
    if (/^[a-zA-Z]$/.test(character)) {
      const letter = character.toUpperCase();                  // "A"
      const caseType = character === letter ? 'upper' : 'lower'; // "upper" or "lower"
      
      // Determine style path based on the styleKey
      let stylePath;
      
      if (styleKey === 'sans') {
        stylePath = `sans-${caseType}`;
      } else if (styleKey === 'serif') {
        stylePath = `serif-${caseType}`;
      } else if (styleKey === 'decorative' || styleKey === 'display') {
        // Check if we've detected a decorative path format
        if (this.decorativePathFormat) {
          // Extract the decorative path structure based on what we found
          const pathParts = this.decorativePathFormat.split('/');
          
          // Find the index of the letter in the path
          const letterIndex = pathParts.indexOf(pathParts.find(part => part === 'A' || part === 'Q'));
          
          if (letterIndex >= 0 && letterIndex + 1 < pathParts.length) {
            // Get the style path that comes after the letter
            // This can handle different structures like Display/Decorative-upper or just Decorative-upper
            const decorativePart = pathParts.slice(letterIndex + 1, -1).join('/');
            
            // Replace any case information in the path
            stylePath = decorativePart.replace(/(upper|lower)/, caseType);
          } else {
            // Fallback to default format
            stylePath = `Display/Decorative-${caseType}`;
          }
        } else {
          // If no decorative path was found during asset detection, use default
          stylePath = `Display/Decorative-${caseType}`;
        }
      } else if (styleKey === 'random') {
        // For random, default to sans - this will be overridden by letterSelector.js
        stylePath = `sans-${caseType}`;
      } else {
        console.error(`Unknown style key: ${styleKey}`);
        return null;
      }
      
      // Updated path structure with double "Alphabet" folder:
      // assets/Alphabet/cities/NYC/Alphabet/A/Display/Decorative-upper/01.jpg
      return [
        'assets',
        'Alphabet',
        'cities',
        location,
        'Alphabet',  // Second Alphabet folder in your structure
        letter,
        stylePath,
        `${idx}.jpg`
      ].join('/');
    }
    
    // Unsupported character
    return null;
  }

  /**
   * Try multiple path variations for a decorative letter to find one that works
   * @param {string} character - The letter to find
   * @param {string} caseType - "upper" or "lower"
   * @param {string} location - City code (e.g. "NYC")
   * @param {number} variantIndex - The variant number
   * @returns {Promise<string|null>} - The working path or null if none found
   */
  async tryDecorativePathVariations(character, caseType, location, variantIndex = 1) {
    const idx = String(variantIndex).padStart(2, '0');
    const letter = character.toUpperCase();
    
    // Try different possible path structures for decorative letters
    const pathVariations = [
      // Path with Display folder and hyphen
      [
        'assets',
        'Alphabet',
        'cities',
        location,
        'Alphabet',
        letter,
        'Display/Decorative-' + caseType,
        `${idx}.jpg`
      ].join('/'),
      
      // Path without Display folder
      [
        'assets',
        'Alphabet',
        'cities',
        location,
        'Alphabet',
        letter,
        'Decorative-' + caseType,
        `${idx}.jpg`
      ].join('/'),
      
      // Path with Display folder but different structure
      [
        'assets',
        'Alphabet',
        'cities',
        location,
        'Alphabet',
        letter,
        'Display',
        'Decorative',
        caseType,
        `${idx}.jpg`
      ].join('/')
    ];
    
    // Try each variation
    for (const path of pathVariations) {
      const exists = await this.pathExists(path);
      if (exists) {
        return path;
      }
    }
    
    return null;
  }

  /**
   * Gather up to 3 numbered variants (01–03). Only returns those that actually exist.
   * If none exist, returns an SVG fallback URL.
   *
   * @param {string} character
   * @param {string} styleKey
   * @param {string} location
   * @param {boolean} skipFallback - If true, don't generate SVG fallback when no variants found
   * @returns {Promise<string[]>} Array of existing URLs
   */
  async getLetterVariants(character, styleKey, location, skipFallback = false) {
    console.log(`[Database] Getting variants for "${character}" with style "${styleKey}"`);
    
    // If we know no assets exist, return SVG fallback immediately
    if (this.pathExistsCache.checked && !this.assetsDetected && !skipFallback) {
      const fullStyle = `${styleKey}-${character === character.toUpperCase() ? 'upper' : 'lower'}`;
      const svgUrl = generateFallbackLetterSVG(character, fullStyle);
      console.log(`[Database] No assets detected, returning SVG fallback for "${character}"`);
      return [svgUrl];
    }
    
    const found = [];

    // Check if character is a number or symbol
    const isNumber = /^[0-9]$/.test(character);
    // Fix: Properly escape backslash and hyphen in regex
    const isSymbol = /^[!@#$%^&*()+\\=\[\]{}|;':",./<>?_\-]$/.test(character);
    console.log(`[Database] Character "${character}" is: ${isNumber ? 'number' : (isSymbol ? 'symbol' : 'letter')}`);
    
    // Special handling for decorative Q or other problematic letters
    if (/^[a-zA-Z]$/.test(character) && (styleKey === 'decorative' || styleKey === 'display')) {
      const caseType = character === character.toUpperCase() ? 'upper' : 'lower';
      
      // Try different path variations
      for (let i = 1; i <= 3; i++) {
        const workingPath = await this.tryDecorativePathVariations(character, caseType, location, i);
        if (workingPath) {
          found.push(workingPath);
        }
      }
      
      // If we found working paths, return them
      if (found.length > 0) {
        console.log(`[Database] Found ${found.length} decorative variants for "${character}":`, found);
        return found;
      }
    }
    
    // SYMBOL DEBUG: Log path generation for symbols
    if (isSymbol) {
      console.log(`[Database] Processing symbol "${character}"`);
    }
    
    // Regular path handling for other cases
    if (isNumber || isSymbol) {
      // Get the primary path from getLetterPath method
      const primaryPath = this.getLetterPath(character, styleKey, location, 1);
      console.log(`[Database] Primary path for "${character}": ${primaryPath}`);
      
      if (primaryPath) {
        // Check if this path exists
        const exists = await this.pathExists(primaryPath);
        if (exists) {
          console.log(`[Database] Path exists for "${character}": ${primaryPath}`);
          found.push(primaryPath);
        } else {
          console.log(`[Database] Path does not exist for "${character}": ${primaryPath}`);
        }
        
        // Try additional variants
        for (let i = 2; i <= 3; i++) {
          const variantPath = this.getLetterPath(character, styleKey, location, i);
          if (variantPath) {
            const exists = await this.pathExists(variantPath);
            if (exists) {
              found.push(variantPath);
            }
          }
        }
      } else {
        console.log(`[Database] Could not generate path for "${character}"`);
      }
    } else {
      // Regular letter handling for non-decorative styles
      // Only check first 3 variants to reduce 404s
      for (let i = 1; i <= 3; i++) {
        const path = this.getLetterPath(character, styleKey, location, i);
        if (path) {
          const exists = await this.pathExists(path);
          if (exists) {
            found.push(path);
          }
        }
      }
    }
    
    // If no variants found and not skipping fallbacks, add SVG fallback URL
    if (found.length === 0 && !skipFallback) {
      console.log(`[Database] No paths found for "${character}", generating fallback`);
      // The combined style with case information
      let fullStyle;
      
      // For letters, use case-specific style
      if (/^[a-zA-Z]$/.test(character)) {
        fullStyle = `${styleKey}-${character === character.toUpperCase() ? 'upper' : 'lower'}`;
      } else {
        // For numbers and symbols, just use the base style
        fullStyle = styleKey;
      }
      
      // Generate SVG data URL
      const svgUrl = generateFallbackLetterSVG(character, fullStyle);
      found.push(svgUrl);
    }

    console.log(`[Database] Final variants for "${character}":`, found);
    return found;
  }

  /**
   * Load an image (or previously found variant) and cache it.
   * @param {string} path
   * @returns {Promise<HTMLImageElement|null>}
   */
  async loadImage(path) {
    if (!path) return null;
    
    // If this is an SVG data URL, create a simple image object
    if (path.startsWith('data:image/svg+xml')) {
      const img = new Image();
      img.src = path;
      console.log(`Created SVG fallback image for: ${path.substring(0, 30)}...`);
      return img; // Return immediately without waiting for load
    }
    
    if (this.letterCache[path]) {
      console.log(`Cache hit for image: ${path}`);
      return this.letterCache[path];
    }
    
    if (this.loadingPromises[path]) {
      console.log(`Already loading image: ${path}`);
      return this.loadingPromises[path];
    }

    console.log(`Loading image: ${path}`);
    this.loadingPromises[path] = new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set timeout to avoid hanging
      const timeoutId = setTimeout(() => {
        delete this.loadingPromises[path];
        console.error(`Timeout loading image: ${path}`);
        reject(new Error(`Timeout loading image: ${path}`));
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        this.letterCache[path] = img;
        delete this.loadingPromises[path];
        console.log(`Successfully loaded image: ${path}`);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        delete this.loadingPromises[path];
        console.error(`Failed to load image: ${path}`);
        reject(new Error(`Failed to load image: ${path}`));
      };
      
      // Add cache buster to avoid browser caching
      img.src = `${path}?t=${Date.now()}`;
    });

    return this.loadingPromises[path];
  }
}