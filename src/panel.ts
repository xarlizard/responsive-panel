import {
  ResponsivePanelConfig,
  PanelState,
  ViewportInfo,
  PanelEventType,
  PanelEventHandler,
  ResponsivePanelInstance
} from './types';
import { createPanelHTML, createTriggerButton } from './ui';
import { getDefaultConfig, throttle, debounce, isProduction } from './utils';

/**
 * Main ResponsivePanel class
 */
export class ResponsivePanel implements ResponsivePanelInstance {
  private config: Required<ResponsivePanelConfig>;
  private state: PanelState;
  private triggerButton: HTMLElement | null = null;
  private panelElement: HTMLElement | null = null;
  private viewports: Map<number, HTMLIFrameElement> = new Map();
  private eventHandlers: Map<PanelEventType, Set<PanelEventHandler>> = new Map();
  private triggerDragState = { isDragging: false, startX: 0, startY: 0 };
  private panelDragState = { isDragging: false, startX: 0, startY: 0 };
  private resizeObserver: ResizeObserver | null = null;
  private abortController: AbortController | null = null;

  constructor(config: ResponsivePanelConfig = {}) {
    this.config = { ...getDefaultConfig(), ...config };
    this.state = {
      isOpen: false,
      isDragging: false,
      position: this.getInitialPosition(),
      activeBreakpoints: this.config.breakpoints,
      isFullscreen: false,
      fullscreenViewport: undefined
    };

    this.init();
  }
  private init(): void {
    // Only initialize in development mode
    if (this.isProduction()) {
      console.warn('ResponsivePanel: Skipping initialization in production mode');
      return;
    }

    // Check if we should hide the trigger (when inside panel iframe)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('rp-hide-trigger') === 'true') {
      return; // Don't create trigger button in iframe views
    }

    this.createTriggerButton();
    this.setupEventListeners();
    this.setupResizeObserver();
  }
  private isProduction(): boolean {
    return isProduction();
  }

  private getInitialPosition(): { x: number; y: number } {
    const padding = 20;
    const buttonSize = 60;
    const { innerWidth, innerHeight } = window;

    const positions = {
      'top-left': { x: padding, y: padding },
      'top-right': { x: innerWidth - buttonSize - padding, y: padding },
      'bottom-left': { x: padding, y: innerHeight - buttonSize - padding },
      'bottom-right': { x: innerWidth - buttonSize - padding, y: innerHeight - buttonSize - padding }
    } as const;

    return positions[this.config.position] ?? positions['bottom-right'];
  }

  private createTriggerButton(): void {
    this.triggerButton = createTriggerButton(this.config);
    this.updateTriggerPosition();

    this.triggerButton.addEventListener('click', () => this.toggle());
    this.triggerButton.addEventListener('mousedown', (event: Event) => {
      this.handleDragStart(event as MouseEvent);
    });

    document.body?.appendChild(this.triggerButton);
  }

  private updateTriggerPosition(): void {
    if (!this.triggerButton) return;

    this.triggerButton.style.left = `${this.state.position.x}px`;
    this.triggerButton.style.top = `${this.state.position.y}px`;
  }

  private setupEventListeners(): void {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    document.addEventListener('mousemove', this.handleDragMove.bind(this), { signal });
    document.addEventListener('mouseup', this.handleDragEnd.bind(this), { signal });
    document.addEventListener('keydown', this.handleKeyDown.bind(this), { signal });
    window.addEventListener('resize', debounce(this.handleWindowResize.bind(this), 250), { signal });
  }

  private setupResizeObserver(): void {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(
        throttle(this.handleContentResize.bind(this), 100)
      );
    }
  }
  private handleDragStart(event: MouseEvent): void {
    this.triggerDragState = {
      isDragging: true,
      startX: event.clientX - this.state.position.x,
      startY: event.clientY - this.state.position.y
    };
    this.state.isDragging = true;
    this.emit('drag', { type: 'start', position: this.state.position });
    event.preventDefault();
  }

  private handleDragMove(event: MouseEvent): void {
    if (!this.triggerDragState.isDragging) return;

    const newX = Math.max(0, Math.min(window.innerWidth - 60, event.clientX - this.triggerDragState.startX));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, event.clientY - this.triggerDragState.startY));

    this.state.position = { x: newX, y: newY };
    this.updateTriggerPosition();
    this.emit('drag', { type: 'move', position: this.state.position });
  }

  private handleDragEnd(): void {
    if (!this.triggerDragState.isDragging) return;

    this.triggerDragState.isDragging = false;
    this.state.isDragging = false;
    this.emit('drag', { type: 'end', position: this.state.position });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.state.isOpen) {
      this.close();
    }
  }

  private handleWindowResize(): void {
    if (this.state.isOpen) {
      this.updateViewports();
    }

    // Adjust trigger position if it's outside viewport
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 60;

    if (this.state.position.x > maxX || this.state.position.y > maxY) {
      this.state.position = {
        x: Math.min(this.state.position.x, maxX),
        y: Math.min(this.state.position.y, maxY)
      };
      this.updateTriggerPosition();
    }
  }

  private handleContentResize(): void {
    if (this.state.isOpen && this.config.liveSync) {
      this.syncViewports();
    }
  }
  public open(): void {
    if (this.state.isOpen) return;

    this.createPanel();
    this.state.isOpen = true;
    this.emit('open');
  }

  public close(): void {
    if (!this.state.isOpen) return;

    this.destroyPanel();
    this.state.isOpen = false;
    this.emit('close');
  }
  public toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public enterFullscreen(viewport: ViewportInfo): void {
    if (this.state.isFullscreen) return;

    this.state.isFullscreen = true;
    this.state.fullscreenViewport = viewport;

    if (this.panelElement) {
      this.panelElement.classList.add('rp-fullscreen');
      this.createFullscreenView(viewport);
    }

    this.emit('enterFullscreen', viewport);
  }

  public exitFullscreen(): void {
    if (!this.state.isFullscreen) return;

    this.state.isFullscreen = false;
    this.state.fullscreenViewport = undefined;

    if (this.panelElement) {
      this.panelElement.classList.remove('rp-fullscreen');
      this.createViewports(); // Recreate the dashboard view
    }

    this.emit('exitFullscreen');
  }

  public destroy(): void {
    this.close();

    this.triggerButton?.remove();
    this.triggerButton = null;

    this.abortController?.abort();
    this.abortController = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.eventHandlers.clear();
    this.viewports.clear();
  }

  public updateConfig(newConfig: Partial<ResponsivePanelConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Recreate panel if breakpoints changed
    if (this.state.isOpen && (
      JSON.stringify(oldConfig.breakpoints) !== JSON.stringify(this.config.breakpoints) ||
      oldConfig.theme !== this.config.theme
    )) {
      this.close();
      this.open();
    }
  }

  public on(event: PanelEventType, handler: PanelEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  public off(event: PanelEventType, handler: PanelEventHandler): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.delete(handler);
    }
  }
  private emit(event: PanelEventType, data?: unknown): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.forEach(handler => {
        try {
          handler(event, data);
        } catch (error) {
          console.error(`ResponsivePanel: Error in event handler for ${event}:`, error);
        }
      });
    }
  } private createPanel(): void {
    if (this.panelElement) return;

    this.panelElement = createPanelHTML(this.config);
    this.panelElement.style.zIndex = this.config.zIndex.toString();

    // Add event listeners
    this.setupPanelEventListeners();

    // Create viewports
    this.createViewports();

    document.body?.appendChild(this.panelElement);
  } private setupPanelEventListeners(): void {
    if (!this.panelElement) return;

    const closeBtn = this.panelElement.querySelector('.rp-close-btn');
    const header = this.panelElement.querySelector('.rp-header');

    closeBtn?.addEventListener('click', () => this.close());

    // Make panel draggable by header
    header?.addEventListener('mousedown', (event: Event) => {
      this.handlePanelDragStart(event as MouseEvent);
    });
  }
  private handlePanelDragStart(event: MouseEvent): void {
    if (!this.panelElement) return;

    const rect = this.panelElement.getBoundingClientRect();
    this.panelDragState = {
      isDragging: true,
      startX: event.clientX - rect.left,
      startY: event.clientY - rect.top
    };

    // Add temporary event listeners for panel dragging
    const handlePanelDragMove = (e: MouseEvent) => {
      if (!this.panelElement || !this.panelDragState.isDragging) return;

      const newX = e.clientX - this.panelDragState.startX;
      const newY = e.clientY - this.panelDragState.startY;

      // Constrain to viewport
      const maxX = window.innerWidth - this.panelElement.offsetWidth;
      const maxY = window.innerHeight - this.panelElement.offsetHeight;

      const constrainedX = Math.max(0, Math.min(maxX, newX));
      const constrainedY = Math.max(0, Math.min(maxY, newY));

      this.panelElement.style.left = constrainedX + 'px';
      this.panelElement.style.top = constrainedY + 'px';
      this.panelElement.style.transform = 'none';
    };

    const handlePanelDragEnd = () => {
      this.panelDragState.isDragging = false;
      document.removeEventListener('mousemove', handlePanelDragMove);
      document.removeEventListener('mouseup', handlePanelDragEnd);
    };

    document.addEventListener('mousemove', handlePanelDragMove);
    document.addEventListener('mouseup', handlePanelDragEnd);

    event.preventDefault();
  }
  private createViewports(): void {
    if (!this.panelElement) return;

    const viewportsContainer = this.panelElement.querySelector('.rp-viewports');
    if (!viewportsContainer) return;

    this.viewports.clear();
    viewportsContainer.innerHTML = '';

    this.config.breakpoints.forEach((width, index) => {
      const viewportInfo = this.getViewportInfo(width, index);
      const viewportElement = this.createViewportElement(viewportInfo);

      viewportsContainer.appendChild(viewportElement);

      const iframe = viewportElement.querySelector<HTMLIFrameElement>('iframe');
      if (iframe) {
        this.viewports.set(width, iframe);
      }
    });

    // Setup live sync if enabled
    if (this.config.liveSync) {
      this.setupLiveSync();
    }
  }

  private createFullscreenView(viewport: ViewportInfo): void {
    if (!this.panelElement) return;

    const viewportsContainer = this.panelElement.querySelector('.rp-viewports');
    if (!viewportsContainer) return;

    this.viewports.clear();
    viewportsContainer.innerHTML = '';

    // Create back button
    const backButton = document.createElement('button');
    backButton.className = 'rp-back-btn';
    backButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Back to Dashboard</span>
    `;
    backButton.addEventListener('click', () => this.exitFullscreen());

    // Create fullscreen viewport
    const fullscreenContainer = document.createElement('div');
    fullscreenContainer.className = 'rp-fullscreen-viewport';

    const frame = document.createElement('iframe');
    frame.src = window.location.href + '?rp-hide-trigger=true';
    frame.style.width = `${viewport.width}px`;
    frame.style.height = `${viewport.height}px`;
    frame.style.border = 'none';
    frame.style.borderRadius = '8px';

    fullscreenContainer.appendChild(frame);
    viewportsContainer.appendChild(backButton);
    viewportsContainer.appendChild(fullscreenContainer);

    this.viewports.set(viewport.width, frame);
  }

  private getViewportInfo(width: number, index: number): ViewportInfo {
    const containerWidth = 280; // Available width in panel
    const scale = Math.min(1, containerWidth / width);

    let label = `${width}px`;
    if (this.config.labels && this.config.labels[index]) {
      label = this.config.labels[index];
    } else if (this.config.showLabels) {
      label = this.getBreakpointLabel(width);
    }

    return {
      width,
      height: Math.round(200 / scale), // Maintain aspect ratio
      label,
      scale
    };
  }

  private getBreakpointLabel(width: number): string {
    if (width <= 320) return 'Mobile Portrait';
    if (width <= 480) return 'Mobile Landscape';
    if (width <= 768) return 'Tablet';
    if (width <= 1024) return 'Small Laptop';
    return 'Desktop';
  }
  private createViewportElement(viewport: ViewportInfo): HTMLElement {
    const container = document.createElement('div');
    container.className = 'rp-viewport';
    container.style.width = `${Math.round(viewport.width * viewport.scale)}px`;
    container.style.height = `${Math.round(viewport.height * viewport.scale)}px`;

    const label = document.createElement('div');
    label.className = 'rp-viewport-label';
    label.textContent = viewport.label;
    label.style.cursor = 'pointer';
    label.title = 'Click to view fullscreen';

    // Add click handler to enter fullscreen
    label.addEventListener('click', () => {
      this.enterFullscreen(viewport);
    });

    const frame = document.createElement('iframe');
    frame.src = window.location.href + '?rp-hide-trigger=true';
    frame.style.width = `${viewport.width}px`;
    frame.style.height = `${viewport.height}px`;
    frame.style.transform = `scale(${viewport.scale})`;
    frame.style.transformOrigin = 'top left';

    container.appendChild(label);
    container.appendChild(frame);

    return container;
  }

  private setupLiveSync(): void {
    // Sync scroll and form inputs across viewports
    this.viewports.forEach(iframe => {
      iframe.addEventListener('load', () => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) return;

          // Sync scroll
          doc.addEventListener('scroll', throttle(() => {
            this.syncScrollPosition(doc);
          }, 50));          // Sync form inputs
          doc.addEventListener('input', (event) => {
            if (event.target instanceof HTMLInputElement ||
              event.target instanceof HTMLTextAreaElement) {
              this.syncFormInput(event.target);
            }
          });
        } catch {
          // Ignore cross-origin errors
        }
      });
    });
  }

  private syncScrollPosition(sourceDoc: Document): void {
    const scrollTop = sourceDoc.documentElement.scrollTop ?? sourceDoc.body.scrollTop;
    const scrollLeft = sourceDoc.documentElement.scrollLeft ?? sourceDoc.body.scrollLeft;

    this.viewports.forEach(iframe => {
      try {
        const doc = iframe.contentDocument;
        if (doc && doc !== sourceDoc) {
          doc.documentElement.scrollTop = scrollTop;
          doc.body.scrollTop = scrollTop;
          doc.documentElement.scrollLeft = scrollLeft;
          doc.body.scrollLeft = scrollLeft;
        }
      } catch {
        // Ignore cross-origin errors
      }
    });
  }

  private syncFormInput(sourceElement: HTMLInputElement | HTMLTextAreaElement): void {
    const selector = this.getElementSelector(sourceElement);
    const value = sourceElement.value;

    this.viewports.forEach(iframe => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        const targetElement = doc.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
        if (targetElement && targetElement !== sourceElement) {
          targetElement.value = value;
        }
      } catch {
        // Ignore cross-origin errors
      }
    });
  }

  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    let selector = element.tagName.toLowerCase();
    if (element.className) {
      selector += `.${element.className.split(' ').join('.')}`;
    }

    return selector;
  }

  private updateViewports(): void {
    if (!this.state.isOpen) return;

    this.viewports.forEach((iframe, width) => {
      const index = Array.from(this.config.breakpoints).indexOf(width);
      const viewportInfo = this.getViewportInfo(width, index);
      iframe.style.transform = `scale(${viewportInfo.scale})`;
    });
  }

  private syncViewports(): void {
    this.viewports.forEach(iframe => {
      try {
        iframe.contentWindow?.location.reload();
      } catch {
        // Ignore cross-origin errors
      }
    });
  }   private destroyPanel(): void {
    this.panelElement?.remove();
    this.panelElement = null;
    this.viewports.clear();
  }
}
