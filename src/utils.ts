import { ResponsivePanelConfig } from './types';
import { DEFAULT_BREAKPOINT_WIDTHS, DEFAULT_Z_INDEX } from './constants';

/**
 * Get default configuration merged with user config
 */
export function getDefaultConfig(): Required<ResponsivePanelConfig> {
  return {
    breakpoints: DEFAULT_BREAKPOINT_WIDTHS,
    position: 'bottom-right',
    theme: 'auto',
    liveSync: false,
    className: '',
    showLabels: true,
    labels: [],
    zIndex: DEFAULT_Z_INDEX,
    customBreakpoints: []
  };
}

/**
 * Calculate scale factor for viewport
 */
export function calculateScale(containerWidth: number, viewportWidth: number): number {
  return Math.min(1, containerWidth / viewportWidth);
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const elapsed = now - lastCall;

    if (elapsed >= delay) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      func(...args);
    } else if (timeoutId === null) {
      // Schedule execution for the remaining delay
      timeoutId = setTimeout(() => {
        timeoutId = null;
        lastCall = Date.now();
        func(...args);
      }, delay - elapsed);
    }
  };
}

/**
 * Debounce function to delay execution
 * Returns a function that cancels the pending execution
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Detect if running in production environment
 */
export function isProduction(): boolean {
  // Check Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }

  // Check browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return !hostname.includes('localhost') &&
      !hostname.includes('127.0.0.1') &&
      !hostname.includes('.local') &&
      !hostname.includes('dev.');
  }

  return false;
}

/**
 * Get current theme preference
 */
export function getTheme(configTheme: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (configTheme !== 'auto') {
    return configTheme;
  }

  // Check system preference with modern API
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}

/**
 * Generate unique ID for elements
 */
export function generateId(prefix: string = 'rp'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get element position relative to viewport
 */
export function getElementPosition(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY
  };
}

/**
 * Check if element is in viewport
 */
export function isElementInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      sourceValue.constructor === Object &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue) &&
      targetValue.constructor === Object
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get CSS custom property value
 */
export function getCSSCustomProperty(property: string, element?: Element): string {
  const target = element || document.documentElement;
  return getComputedStyle(target).getPropertyValue(property).trim();
}

/**
 * Set CSS custom property
 */
export function setCSSCustomProperty(property: string, value: string, element?: Element): void {
  const target = element || document.documentElement;
  (target as HTMLElement).style.setProperty(property, value);
}
