// StreetType Visual Renderer - p5.js canvas rendering with proper letter spacing
import { createLogger, getSystemFontFallbacks } from './utils.js';
import { debug, styleColors } from './config.js';

const logger = createLogger('Renderer', debug.enabled);

/**
 * VisualRenderer handles p5.js canvas rendering of letters with proper spacing and fallbacks.
 */
export class VisualRenderer {
  constructor(containerId) {
    this.containerId = containerId;
    this.letterSpacing = 5;
    this.lineHeight = 80;
    this.letterWidth = 40;
    this.letterHeight = 60;
    this.topPadding = 60;
    this.bottomPadding = 40;
    this.canvas = null;
    this.p5Instance = null;
    this.debugMode = false;
    
    // Style colors for fallback rendering
    this.styleColors = {
      sans: { fill: '#3a7ca5', bg: '#f0f8ff' },
      serif: { fill: '#d63030', bg: '#fff0f0' },
      mono: { fill: '#2d882d', bg: '#f0fff0' },
      script: { fill: '#aa7c39', bg: '#fff8e6' },
      decorative: { fill: '#9933cc', bg: '#f8f0ff' },
      default: { fill: '#666666', bg: '#f5f5f5' }
    };

    this._updateLetters = () => {};
    this.downloadLink = this._createDownloadLink();
    
    window.addEventListener('resize', () => this._handleResize());
    this.initP5();
  }

  _createDownloadLink() {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.download = 'streettype.png';
    document.body.appendChild(a);
    return a;
  }

  _ensureContainerSize() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const minHeight = 300;
    const computedStyle = window.getComputedStyle(container);
    
    if (parseInt(computedStyle.height) < minHeight || computedStyle.height === 'auto') {
      container.style.minHeight = `${minHeight}px`;
    }
    
    if (computedStyle.position === 'static') {
      container.style.position = 'relative';
    }
  }

  initP5() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      logger.error(`Container "${this.containerId}" not found`);
      return;
    }
    
    this._ensureContainerSize();

    this.p5Instance = new p5(p => {
      let letters = [];

      p.setup = () => {
        this.canvas = p
          .createCanvas(container.offsetWidth, 500)
          .parent(this.containerId);
          
        if (this.canvas.elt) {
          this.canvas.elt.style.maxWidth = '100%';
          this.canvas.elt.style.maxHeight = 'none';
        }
        
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
        p.noLoop();
      };

      p.draw = () => {
        p.clear();
        p.background(255);

        if (letters.length === 0) {
          p.fill(150);
          p.text('Generated text will appear here…', 20, p.height / 2);
          return;
        }

        let x = 10, y = this.topPadding;
        const maxW = p.width - 20;
        let currentLineMaxHeight = this.letterHeight;

        for (const lt of letters) {
          try {
            if (lt.type === 'space') {
              x += this.letterWidth + this.letterSpacing;
            } else if (lt.type === 'letter' && lt.img) {
              this._drawLetterImage(p, lt, x, y);
              const imgHeight = this._getScaledHeight(lt.img);
              currentLineMaxHeight = Math.max(currentLineMaxHeight, imgHeight);
              x += this.letterWidth + this.letterSpacing;
            } else if (lt.type === 'letter' && lt.url && lt.url.startsWith('data:image/svg+xml')) {
              this._drawSvgLetter(p, lt, x, y);
              x += this.letterWidth + this.letterSpacing;
            } else {
              this._drawFallbackLetter(p, lt.value, x, y, lt.style || 'default');
              x += this.letterWidth + this.letterSpacing;
            }
            
            // Wrap to next line if needed
            if (x > maxW) {
              x = 10;
              y += Math.max(this.lineHeight, currentLineMaxHeight + 20);
              currentLineMaxHeight = this.letterHeight;
            }
          } catch (error) {
            logger.error('Error rendering letter:', error, lt);
            x += this.letterWidth + this.letterSpacing;
          }
        }

        // Resize canvas if content exceeds height
        const neededH = y + currentLineMaxHeight + this.bottomPadding;
        if (neededH > p.height) {
          p.resizeCanvas(p.width, neededH);
        }
        
        if (this.debugMode) {
          this._drawDebugInfo(p, letters);
        }
      };

      this._drawLetterImage = (p, letter, x, y) => {
        const img = letter.img;
        const drawWidth = this.letterWidth;
        const drawHeight = this._getScaledHeight(img);
        
        const offsetX = (this.letterWidth - drawWidth) / 2;
        const offsetY = this._getVerticalOffset(letter.value);
        
        p.image(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
      };

      this._drawSvgLetter = (p, letter, x, y) => {
        if (letter.svgImg) {
          const offsetX = (this.letterWidth - this.letterWidth * 0.8) / 2;
          const offsetY = this._getVerticalOffset(letter.value);
          p.image(letter.svgImg, x + offsetX, y + offsetY, this.letterWidth * 0.8, this.letterHeight);
          return;
        }
        
        // Fallback to text rendering
        this._drawFallbackLetter(p, letter.value, x, y, letter.style || 'default');
        
        // Try to load SVG asynchronously
        if (letter.url && !letter.svgImgLoading) {
          letter.svgImgLoading = true;
          p.loadImage(
            letter.url,
            img => {
              letter.svgImg = img;
              letter.svgImgLoading = false;
              p.redraw();
            },
            () => {
              letter.svgImgLoading = false;
            }
          );
        }
      };

      this._drawFallbackLetter = (p, char, x, y, style = 'default') => {
        const styleKey = style.split('-')[0];
        const styleData = this.styleColors[styleKey] || this.styleColors.default;
        
        // Background
        p.fill(styleData.bg);
        p.rect(x, y, this.letterWidth, this.letterHeight);
        
        // Letter with proper offset
        const offsetY = this._getVerticalOffset(char);
        p.fill(styleData.fill);
        p.textSize(36);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(char, x + this.letterWidth/2, y + this.letterHeight/2 + offsetY);
        
        // Reset
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
      };

      this._drawDebugInfo = (p, letters) => {
        p.push();
        p.fill(0, 0, 0, 180);
        p.rect(0, p.height - 120, p.width, 120);
        p.fill(255);
        p.textSize(12);
        p.textAlign(p.LEFT, p.TOP);
        
        const letterCount = letters.length;
        const svgCount = letters.filter(l => l.url?.startsWith('data:')).length;
        const imageCount = letters.filter(l => l.img).length;
        
        // Count styles for random mix feedback
        const styleDistribution = {};
        letters.filter(l => l.type === 'letter' && l.style).forEach(letter => {
          const baseStyle = letter.style.split('-')[0];
          styleDistribution[baseStyle] = (styleDistribution[baseStyle] || 0) + 1;
        });
        
        const info = [
          `Letters: ${letterCount}`,
          `SVG: ${svgCount}`,
          `Images: ${imageCount}`,
          `Canvas: ${p.width}x${p.height}`,
          `Padding: ${this.topPadding}`
        ].join(' | ');
        
        p.text(info, 10, p.height - 110);
        
        // Show style distribution for random mix
        if (Object.keys(styleDistribution).length > 1) {
          const styleInfo = Object.entries(styleDistribution)
            .map(([style, count]) => `${style}: ${count}`)
            .join(', ');
          p.text(`🎲 Random Mix: ${styleInfo}`, 10, p.height - 95);
        }
        
        p.pop();
      };

      // Main update function called from outside
      this._updateLetters = async raw => {
        const loaded = [];
        
        for (const lt of raw) {
          if (lt.type === 'letter' && lt.url && !lt.url.startsWith('data:')) {
            try {
              const img = await new Promise(resolve => 
                p.loadImage(
                  lt.url,
                  img => resolve(img),
                  () => resolve(null)
                )
              );
              
              if (img) {
                loaded.push({ ...lt, img });
              } else {
                loaded.push(lt); // Will use fallback rendering
              }
            } catch (error) {
              logger.warn('Error loading image:', error);
              loaded.push(lt);
            }
          } else {
            loaded.push(lt);
          }
        }
        
        letters = loaded;
        p.redraw();
      };
    });
  }

  /**
   * Get scaled height maintaining aspect ratio.
   */
  _getScaledHeight(img) {
    const aspectRatio = img.height / img.width;
    return this.letterWidth * aspectRatio;
  }

  /**
   * Get vertical offset for tall letters.
   */
  _getVerticalOffset(char) {
    const isTallLetter = /[tdfhklbijgpqy]/i.test(char);
    return isTallLetter ? -25 : 0;
  }

  /**
   * Render letters from letter objects array.
   */
  renderLetters(letterData) {
    if (!this.p5Instance) {
      logger.error('P5 not initialized');
      return;
    }
    this._updateLetters(letterData);
  }

  /**
   * Export canvas as PNG.
   */
  exportAsImage() {
    if (!this.canvas) {
      logger.error('Canvas not ready');
      return;
    }
    const dataURL = this.canvas.elt.toDataURL('image/png');
    this.downloadLink.href = dataURL;
    this.downloadLink.click();
  }

  /**
   * Toggle debug mode.
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (this.p5Instance) this.p5Instance.redraw();
  }

  _handleResize() {
    if (!this.p5Instance || !this.canvas) return;
    const container = document.getElementById(this.containerId);
    const newW = container.offsetWidth;
    this.p5Instance.resizeCanvas(newW, this.canvas.height);
    this.p5Instance.redraw();
  }

  setLetterSpacing(n) { this.letterSpacing = n; }
  setLineHeight(n) { this.lineHeight = n; }
  
  /**
   * Set font size affecting letter dimensions.
   */
  setFontSize(size) {
    const sizeConfigs = {
      small: { width: 40, height: 60, spacing: 5, lineHeight: 70, topPadding: 40, bottomPadding: 30 },
      medium: { width: 60, height: 90, spacing: 8, lineHeight: 110, topPadding: 60, bottomPadding: 40 },
      large: { width: 80, height: 120, spacing: 12, lineHeight: 140, topPadding: 80, bottomPadding: 50 }
    };
    
    const config = sizeConfigs[size] || sizeConfigs.small;
    this.letterWidth = config.width;
    this.letterHeight = config.height;
    this.letterSpacing = config.spacing;
    this.lineHeight = config.lineHeight;
    this.topPadding = config.topPadding;
    this.bottomPadding = config.bottomPadding;
  }
}