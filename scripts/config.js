// Central configuration for the StreetType application

export const cities = ['NYC'];

export const fontStyles = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
  { value: 'script', label: 'Script' },
  { value: 'decorative', label: 'Decorative' }
];

export const fontSizes = {
  small: { height: 60, spacing: 10 },
  medium: { height: 100, spacing: 15 },
  large: { height: 140, spacing: 20 }
};

// Color schemes for different font styles
export const styleColors = {
  sans: [100, 100, 180],      // Blue-ish
  serif: [180, 100, 100],     // Red-ish
  mono: [100, 180, 100],      // Green-ish
  script: [180, 180, 100],    // Yellow-ish
  decorative: [180, 100, 180], // Purple-ish
  default: [150, 150, 150]    // Gray for unknown styles
};

// Canvas formats
export const canvasFormats = {
  '24x36': { aspectRatio: 2/3, className: 'canvas-24x36' },
  '16x24': { aspectRatio: 2/3, className: 'canvas-16x24' },
  '11x17': { aspectRatio: 11/17, className: 'canvas-11x17' },
  '8.5x11': { aspectRatio: 8.5/11, className: 'canvas-8\\.5x11' },
  '6x9': { aspectRatio: 2/3, className: 'canvas-6x9' },
  '4x4': { aspectRatio: 1/1, className: 'canvas-4x4' }
};

// Default settings
export const defaults = {
  city: 'NYC',
  fontStyle: 'sans',
  fontSize: 'small',
  canvasFormat: '16x24',
  text: 'Type something...',
  caseOption: 'mixed'
};

// Debug settings
export const debug = {
  enabled: true, // Enable debug logging to help with random mix troubleshooting
  logAssetLoading: true,
  showPerformanceStats: false
};