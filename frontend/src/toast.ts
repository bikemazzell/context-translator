import { ToastOptions } from './types';

export class ToastManager {
  private container: HTMLDivElement | null = null;

  private ensureContainer(): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'ct-toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(options: ToastOptions): void {
    const container = this.ensureContainer();
    const toast = document.createElement('div');
    const duration = options.duration || 3000;

    const bgColors = {
      info: '#2196F3',
      success: '#4CAF50',
      error: '#f44336',
    };

    toast.style.cssText = `
      background: ${bgColors[options.type]};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      pointer-events: auto;
      animation: ct-toast-in 0.3s ease-out;
      max-width: 300px;
      word-wrap: break-word;
    `;

    toast.textContent = options.message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'ct-toast-out 0.3s ease-out';
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  success(message: string, duration?: number): void {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number): void {
    this.show({ message, type: 'error', duration });
  }

  info(message: string, duration?: number): void {
    this.show({ message, type: 'info', duration });
  }

  injectStyles(): void {
    if (document.getElementById('ct-toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'ct-toast-styles';
    style.textContent = `
      @keyframes ct-toast-in {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes ct-toast-out {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
