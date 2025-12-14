import { ResponsivePanel } from './panel';
import { ResponsivePanelConfig } from './types';
import { isProduction } from './utils';

/**
 * Global instance reference
 */
let globalPanelInstance: ResponsivePanel | null = null;

/**
 * Inject the responsive panel into the current page
 * This is the main entry point for the library
 */
export function injectResponsivePanel(config: ResponsivePanelConfig = {}): ResponsivePanel | null {
  // Skip in production unless explicitly enabled
  if (isProduction()) {
    console.warn('ResponsivePanel: Skipping initialization in production mode');
    return null;
  }

  // Check if we should hide the trigger (when inside panel iframe)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('rp-hide-trigger') === 'true') {
    return null; // Don't create panel in iframe views
  }

  // Clean up existing instance if present
  globalPanelInstance?.destroy();

  // Create new instance
  globalPanelInstance = new ResponsivePanel(config);
  // Add to window for debugging in development
  if (!isProduction() && typeof window !== 'undefined') {
    (window as Window & { __responsivePanel?: ResponsivePanel }).__responsivePanel = globalPanelInstance;
  }

  return globalPanelInstance;
}

/**
 * Get the current global panel instance
 */
export function getResponsivePanelInstance(): ResponsivePanel | null {
  return globalPanelInstance;
}

/**
 * Destroy the current global panel instance
 */
export function destroyResponsivePanel(): void {
  globalPanelInstance?.destroy();
  globalPanelInstance = null;

  // Clean up window reference
  if (typeof window !== 'undefined') {
    delete (window as Window & { __responsivePanel?: ResponsivePanel }).__responsivePanel;
  }
}

/**
 * Check if responsive panel is currently active
 */
export function isResponsivePanelActive(): boolean {
  return globalPanelInstance !== null;
}

/**
 * Auto-inject when DOM is ready (for script tag usage)
 */
function autoInject(): void {
  if (typeof window === 'undefined') return;

  // Check for data attributes on script tag
  const scripts = document.querySelectorAll('script[src*="responsive-panel"]');
  const script = scripts[scripts.length - 1] as HTMLScriptElement | undefined;

  if (script && script.dataset.autoInject !== 'false') {
    const config: ResponsivePanelConfig = {};
    // Parse configuration from data attributes
    if (script.dataset.breakpoints) {
      try {
        config.breakpoints = JSON.parse(script.dataset.breakpoints);
      } catch {
        console.warn('ResponsivePanel: Invalid breakpoints data attribute');
      }
    }
    if (script.dataset.position) {
      config.position = script.dataset.position as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    }

    if (script.dataset.theme) {
      config.theme = script.dataset.theme as 'light' | 'dark' | 'auto';
    }

    if (script.dataset.liveSync) {
      config.liveSync = script.dataset.liveSync === 'true';
    }
    if (script.dataset.showLabels) {
      config.showLabels = script.dataset.showLabels === 'true';
    }

    if (script.dataset.zIndex) {
      const zIndex = Number.parseInt(script.dataset.zIndex, 10);
      if (!Number.isNaN(zIndex)) {
        config.zIndex = zIndex;
      }
    }

    // Auto-inject when DOM is ready
    const inject = () => setTimeout(() => injectResponsivePanel(config), 100);
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    } else {
      inject();
    }
  }
}

// Run auto-inject when this module is loaded
autoInject();
