// Shared utility functions for StreetType

/**
 * Check whether the browser supports required APIs.
 */
export function checkBrowserSupport() {
  const features = {
    canvas: !!window.CanvasRenderingContext2D,
    p5: typeof window.p5 !== 'undefined',
    fetch: typeof window.fetch !== 'undefined',
    fileAPI: typeof window.FileReader !== 'undefined',
  };
  const missing = Object.entries(features)
    .filter(([, ok]) => !ok)
    .map(([feat]) => feat);

  if (missing.length > 0) {
    console.warn('Missing browser features:', missing.join(', '));
  }
  return missing.length === 0;
}

/**
 * Debounce function calls to reduce excessive invocations.
 */
export function debounce(fn, wait, immediate = false) {
  let timeout = null;
  return function(...args) {
    const callNow = immediate && timeout === null;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) fn.apply(this, args);
    }, wait);
    if (callNow) fn.apply(this, args);
  };
}

/**
 * Create a logger with optional debug mode.
 */
export function createLogger(prefix, debugEnabled = false) {
  return {
    log: (...args) => {
      if (debugEnabled) {
        console.log(`[${prefix}]`, ...args);
      }
    },
    warn: (...args) => {
      if (debugEnabled) {
        console.warn(`[${prefix}]`, ...args);
      }
    },
    error: (...args) => {
      console.error(`[${prefix}]`, ...args);
    }
  };
}

/**
 * Return system-font fallback string based on style.
 */
export function getSystemFontFallbacks(style) {
  const baseStyle = style?.split('-')[0] || style;
  
  switch (baseStyle) {
    case 'sans':
      return 'Arial, Helvetica, sans-serif';
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'mono':
      return '"Courier New", Courier, monospace';
    case 'script':
      return '"Comic Sans MS", cursive, sans-serif';
    case 'decorative':
      return '"Impact", fantasy';
    default:
      return 'sans-serif';
  }
}

/**
 * Generate a simple SVG-based fallback for missing letters as a data URL.
 */
export function generateFallbackLetterSVG(char, style) {
  const font = getSystemFontFallbacks(style);
  const baseStyle = style?.split('-')[0] || style;
  
  // Select colors based on style
  let fill = '#333';
  let background = '#f0f0f0';
  let stroke = '#ccc';
  
  const styleColorMap = {
    sans: { fill: '#3a7ca5', background: '#f0f8ff', stroke: '#2a5a7a' },
    serif: { fill: '#d63030', background: '#fff0f0', stroke: '#a02020' },
    mono: { fill: '#2d882d', background: '#f0fff0', stroke: '#1d681d' },
    script: { fill: '#aa7c39', background: '#fff8e6', stroke: '#8a5c19' },
    decorative: { fill: '#9933cc', background: '#f8f0ff', stroke: '#7922aa' }
  };
  
  if (styleColorMap[baseStyle]) {
    ({ fill, background, stroke } = styleColorMap[baseStyle]);
  }
  
  // Special colors for numbers and symbols
  if (/^[0-9]$/.test(char)) {
    fill = '#6a5acd';
    background = '#f5f0ff';
    stroke = '#483d8b';
  } else if (/^[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]$/.test(char)) {
    fill = '#ff8c00';
    background = '#fff8f0';
    stroke = '#cc7000';
  }
  
  const filterId = `shadow_${char}_${Math.floor(Math.random() * 10000)}`;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="60" viewBox="0 0 40 60" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="${filterId}">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect width="40" height="60" fill="${background}" stroke="${stroke}" stroke-width="1"/>
      <text 
        x="20" 
        y="35" 
        font-family="${font}" 
        font-size="30" 
        fill="${fill}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        filter="url(#${filterId})"
      >${char}</text>
    </svg>`;
    
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Download an image from a data URL.
 */
export function downloadImage(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Show a message in a container.
 */
export function showMessage(container, message, type = 'info') {
  if (!container) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}-message`;
  messageEl.innerHTML = `<p>${message}</p>`;
  
  container.innerHTML = '';
  container.appendChild(messageEl);
}

/**
 * Check if a file exists by attempting to load it.
 */
export function checkFileExists(path, timeout = 2000) {
  return new Promise((resolve) => {
    const img = new Image();
    
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };
    
    img.src = `${path}?t=${Date.now()}`;
  });
}

/**
 * Load an image and return a promise that resolves with the image element.
 */
export function loadImage(path, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout loading image: ${path}`));
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${path}`));
    };
    
    img.src = `${path}?t=${Date.now()}`;
  });
}