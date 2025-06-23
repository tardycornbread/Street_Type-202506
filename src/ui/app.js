// StreetType main application bootstrap
import { VisualRenderer } from '../modules/renderer.js';
import { typographyManager } from '../modules/typographyManager.js';
import { assetManager } from '../modules/assetManager.js';
import { createLogger, debounce, showMessage } from '../modules/utils.js';
import { debug, defaults } from '../modules/config.js';

const logger = createLogger('StreetType', debug.enabled);

document.addEventListener('DOMContentLoaded', async () => {
  logger.log('Application starting...');
  
  // Get DOM elements
  const elements = {
    userTextInput: document.getElementById('user-text'),
    fontStyleSelect: document.getElementById('font-style'),
    locationSelect: document.getElementById('location'),
    caseOptionSelect: document.getElementById('case-option'),
    generateBtn: document.getElementById('generate-btn'),
    exportBtn: document.getElementById('export-btn'),
    shareBtn: document.getElementById('share-btn'),
    outputContainer: document.getElementById('output-container'),
    testPathsBtn: document.getElementById('test-paths-btn'),
    fontSizeToggle: document.getElementById('size-toggle')
  };

  // Initialize renderer and typography manager
  const renderer = new VisualRenderer('p5-canvas-container');
  await typographyManager.initialize();

  // Initialize font size
  let currentFontSize = defaults.fontSize;

  // Disable buttons initially
  if (elements.exportBtn) elements.exportBtn.disabled = true;
  if (elements.shareBtn) elements.shareBtn.disabled = true;

  /**
   * Show loading state.
   */
  function showLoading() {
    logger.log('Showing loading indicator');
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-indicator';
    loadingEl.innerHTML = `
      <div class="spinner"></div>
      <div>Generating typography...</div>
    `;
    
    if (elements.outputContainer) {
      elements.outputContainer.innerHTML = '';
      elements.outputContainer.appendChild(loadingEl);
    }
    
    if (elements.generateBtn) {
      elements.generateBtn.disabled = true;
      elements.generateBtn.textContent = 'Generating...';
    }
  }

  /**
   * Hide loading state.
   */
  function hideLoading() {
    logger.log('Hiding loading indicator');
    if (elements.outputContainer) {
      elements.outputContainer.innerHTML = '';
    }
    
    if (elements.generateBtn) {
      elements.generateBtn.disabled = false;
      elements.generateBtn.textContent = 'Generate Typography';
    }
  }

  /**
   * Show error message in the UI.
   */
  function showErrorMessage(message, isWarning = false) {
    if (!elements.outputContainer) return;
    
    showMessage(
      elements.outputContainer, 
      message, 
      isWarning ? 'warning' : 'error'
    );
  }

  /**
   * Update the canvas with new text and settings.
   */
  async function updateCanvas() {
    try {
      showLoading();
      logger.log('Starting typography generation');
      
      // Get input values with fallbacks
      const inputText = elements.userTextInput?.value.trim() || defaults.text;
      const style = elements.fontStyleSelect?.value || defaults.fontStyle;
      const location = elements.locationSelect?.value || defaults.city;
      const caseOption = elements.caseOptionSelect?.value || defaults.caseOption;
      
      // Update input field if needed
      if (elements.userTextInput && !elements.userTextInput.value.trim()) {
        elements.userTextInput.value = inputText;
      }
      
      logger.log('Input values:', { text: inputText, style, city: location, caseOption });
      
      // Special handling for random mix
      if (style === 'random') {
        logger.log('🎲 Random Mix selected - generating mixed typography styles');
        // Enable debug mode to show style distribution
        renderer.setDebugMode(true);
      } else {
        // Disable debug mode for single styles (unless manually enabled)
        renderer.setDebugMode(debug.enabled);
      }
      
      try {
        // Generate letter array
        const letterArray = await typographyManager.getLettersFromText(inputText, {
          style,
          city: location,
          caseOption
        });
        
        // Render the letters
        renderer.renderLetters(letterArray);
        
        // Enable export buttons
        if (elements.exportBtn) elements.exportBtn.disabled = false;
        if (elements.shareBtn) elements.shareBtn.disabled = false;
        
        logger.log('Render complete');
      } catch (error) {
        logger.error('Failed to generate typography:', error);
        showErrorMessage(`Failed to generate typography: ${error.message}`);
      }
    } catch (error) {
      logger.error('Fatal error in updateCanvas:', error);
      showErrorMessage('A fatal error occurred while updating the canvas.');
    } finally {
      hideLoading();
    }
  }

  /**
   * Test asset paths and show diagnostics.
   */
  async function testAssetPaths() {
    logger.log('Running asset path test...');
    
    const testResults = document.createElement('div');
    testResults.className = 'test-results';
    testResults.innerHTML = `
      <h3>Testing Asset Paths</h3>
      <p>Testing asset availability...</p>
      <pre id="test-log" style="max-height: 300px; overflow: auto; background: #eee; padding: 10px;"></pre>
    `;
    
    if (elements.outputContainer) {
      elements.outputContainer.innerHTML = '';
      elements.outputContainer.appendChild(testResults);
    }
    
    const testLog = document.getElementById('test-log');
    if (!testLog) return;
    
    function logTest(message) {
      const timestamp = new Date().toISOString().substring(11, 23);
      testLog.innerHTML += `[${timestamp}] ${message}\n`;
      testLog.scrollTop = testLog.scrollHeight;
    }
    
    logTest('Starting asset tests...');
    
    // Test sample letters
    const testCases = [
      { char: 'A', style: 'sans', case: 'upper', city: 'NYC' },
      { char: 'a', style: 'sans', case: 'lower', city: 'NYC' },
      { char: '1', style: 'sans', case: 'upper', city: 'NYC' },
      { char: '.', style: 'sans', case: 'upper', city: 'NYC' }
    ];
    
    let foundAssets = false;
    
    for (const testCase of testCases) {
      try {
        logTest(`Testing: ${testCase.char} (${testCase.style}-${testCase.case})`);
        const url = await assetManager.get(testCase);
        
        if (url.startsWith('data:')) {
          logTest(`→ Fallback SVG generated`);
        } else {
          logTest(`→ Asset found: ${url}`);
          foundAssets = true;
        }
      } catch (error) {
        logTest(`→ Error: ${error.message}`);
      }
    }
    
    // Show summary
    const summaryClass = foundAssets ? 'success' : 'warning';
    const summaryMessage = foundAssets 
      ? 'Some assets found! The application is working correctly.'
      : 'No assets found. Using SVG fallbacks for all letters.';
    
    testResults.insertAdjacentHTML('afterbegin', `
      <div class="${summaryMessage.includes('working') ? 'success' : 'warning'}-message">
        <strong>${foundAssets ? 'Success!' : 'Notice:'}</strong> ${summaryMessage}
      </div>
    `);
    
    // Add sample generation button
    testResults.insertAdjacentHTML('beforeend', `
      <div style="margin-top: 10px;">
        <button id="test-sample-btn" style="padding: 8px 16px;">Generate Test Sample</button>
      </div>
    `);
    
    const testSampleBtn = document.getElementById('test-sample-btn');
    if (testSampleBtn) {
      testSampleBtn.addEventListener('click', updateCanvas);
    }
    
    // Show stats
    const stats = assetManager.getStats();
    logTest(`\nStatistics:`);
    logTest(`Requested: ${stats.requested}, Loaded: ${stats.loaded}, Failed: ${stats.failed}`);
    logTest(`Cache size: ${stats.cacheSize}, Fallbacks: ${stats.fallbacks}`);
  }

  /**
   * Update font size.
   */
  function updateFontSize() {
    const sizes = ['SMALL', 'MEDIUM', 'LARGE'];
    const currentSize = elements.fontSizeToggle?.textContent || 'SMALL';
    const currentIndex = sizes.indexOf(currentSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const nextSize = sizes[nextIndex];
    
    if (elements.fontSizeToggle) {
      elements.fontSizeToggle.textContent = nextSize;
    }
    
    currentFontSize = nextSize.toLowerCase();
    renderer.setFontSize(currentFontSize);
    
    logger.log(`Font size changed to: ${nextSize}`);
    
    // Re-render with new size
    updateCanvas();
  }

  /**
   * Export canvas as image.
   */
  function exportImage() {
    if (!renderer?.canvas?.elt) {
      showErrorMessage('The typography canvas is not ready yet. Please generate typography first.');
      return;
    }
    
    try {
      renderer.exportAsImage();
    } catch (error) {
      logger.error('Export failed:', error);
      showErrorMessage('Could not export the typography. Please try again.');
    }
  }

  /**
   * Share canvas in new window.
   */
  function shareImage() {
    if (!renderer?.canvas?.elt) {
      showErrorMessage('The typography canvas is not ready yet. Please generate typography first.');
      return;
    }
    
    try {
      const dataURL = renderer.canvas.elt.toDataURL('image/png');
      const win = window.open();
      if (win) {
        win.document.body.innerHTML = `<img src="${dataURL}" alt="Shared Typography" />`;
      } else {
        showErrorMessage('Could not open a new window. Please check your popup blocker settings.');
      }
    } catch (error) {
      logger.error('Share failed:', error);
      showErrorMessage('Could not share the typography. Please try again.');
    }
  }

  // Event listeners
  if (elements.generateBtn) {
    elements.generateBtn.addEventListener('click', updateCanvas);
  }
  
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', exportImage);
  }
  
  if (elements.shareBtn) {
    elements.shareBtn.addEventListener('click', shareImage);
  }
  
  if (elements.testPathsBtn) {
    elements.testPathsBtn.addEventListener('click', testAssetPaths);
  }
  
  if (elements.fontSizeToggle) {
    elements.fontSizeToggle.addEventListener('click', updateFontSize);
  }

  // Auto-generate on text input (debounced)
  if (elements.userTextInput) {
    const debouncedUpdate = debounce(updateCanvas, 500);
    elements.userTextInput.addEventListener('input', debouncedUpdate);
  }

  // Initial render
  setTimeout(() => {
    updateCanvas();
  }, 500);
  
  logger.log('Application initialization complete');
});