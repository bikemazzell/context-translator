import type { DisplayMode } from './types';

interface InlineTranslation {
  element: HTMLDivElement;
  text: string;
  rect: DOMRect;
}

export class TranslationDisplay {
  private popup: HTMLDivElement | null = null;
  private inlineTranslations: InlineTranslation[] = [];

  show(text: string, x: number, y: number, cached: boolean, mode: DisplayMode = 'tooltip', _targetElement?: Element, wordRange?: Range): void {
    if (mode === 'inline' && wordRange) {
      this.showInline(text, cached, wordRange);
    } else {
      this.showTooltip(text, x, y, cached);
    }
  }

  private showTooltip(text: string, x: number, y: number, cached: boolean): void {
    this.remove();

    this.popup = document.createElement('div');
    this.popup.id = 'ct-translation-popup';

    this.popup.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y + 20}px;
      z-index: 2147483645;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
      animation: ct-popup-in 0.2s ease-out;
    `;

    const translationText = document.createElement('div');
    translationText.textContent = text;
    translationText.style.cssText = 'color: #333; margin-bottom: 4px;';

    this.popup.appendChild(translationText);

    if (cached) {
      const cachedBadge = document.createElement('div');
      cachedBadge.textContent = '(cached)';
      cachedBadge.style.cssText = 'font-size: 11px; color: #888; font-style: italic;';
      this.popup.appendChild(cachedBadge);
    }

    document.body.appendChild(this.popup);

    this.adjustPosition();

    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('scroll', this.handleScroll, true);
  }

  private showInline(text: string, cached: boolean, wordRange: Range): void {
    const rect = wordRange.getBoundingClientRect();

    const existing = this.findInlineByPosition(rect);
    if (existing) {
      this.removeInlineTranslation(existing);
      return;
    }

    const inline = document.createElement('div');
    inline.className = 'ct-inline-translation';
    inline.style.cssText = `
      position: absolute;
      left: ${rect.left + window.scrollX}px;
      top: ${rect.top + window.scrollY - 30}px;
      background: #e8f4f8;
      border-left: 3px solid #0288d1;
      padding: 4px 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #01579b;
      cursor: pointer;
      border-radius: 3px;
      animation: ct-inline-in 0.2s ease-out;
      z-index: 2147483646;
      white-space: nowrap;
    `;

    const translationText = document.createElement('span');
    translationText.textContent = text;
    translationText.style.cssText = 'font-weight: 500;';

    inline.appendChild(translationText);

    if (cached) {
      const cachedBadge = document.createElement('span');
      cachedBadge.textContent = ' (cached)';
      cachedBadge.style.cssText = 'font-size: 11px; color: #0277bd; font-style: italic; margin-left: 4px;';
      inline.appendChild(cachedBadge);
    }

    const inlineData: InlineTranslation = {
      element: inline,
      text,
      rect: rect,
    };

    inline.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.removeInlineTranslation(inlineData);
    });

    document.body.appendChild(inline);
    this.inlineTranslations.push(inlineData);
  }

  private findInlineByPosition(rect: DOMRect): InlineTranslation | null {
    const threshold = 5;
    return this.inlineTranslations.find(t =>
      Math.abs(t.rect.left - rect.left) < threshold &&
      Math.abs(t.rect.top - rect.top) < threshold
    ) || null;
  }

  private removeInlineTranslation(inlineData: InlineTranslation): void {
    if (inlineData.element.parentElement) {
      inlineData.element.parentElement.removeChild(inlineData.element);
    }
    const index = this.inlineTranslations.indexOf(inlineData);
    if (index > -1) {
      this.inlineTranslations.splice(index, 1);
    }
  }

  isInlineShown(wordRange: Range): boolean {
    const rect = wordRange.getBoundingClientRect();
    return this.findInlineByPosition(rect) !== null;
  }

  private adjustPosition(): void {
    if (!this.popup) return;

    const rect = this.popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      const left = viewportWidth - rect.width - 10;
      this.popup.style.left = `${left}px`;
    }

    if (rect.bottom > viewportHeight) {
      const currentTop = parseInt(this.popup.style.top, 10);
      this.popup.style.top = `${currentTop - rect.height - 40}px`;
    }

    if (rect.left < 0) {
      this.popup.style.left = '10px';
    }

    if (rect.top < 0) {
      this.popup.style.top = '10px';
    }
  }

  private handleOutsideClick = (event: MouseEvent): void => {
    if (this.popup && !this.popup.contains(event.target as Node)) {
      this.remove();
    }
  };

  private handleScroll = (): void => {
    this.remove();
  };

  remove(): void {
    if (this.popup && document.body.contains(this.popup)) {
      document.body.removeChild(this.popup);
    }
    this.popup = null;

    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('scroll', this.handleScroll, true);
  }

  injectStyles(): void {
    if (document.getElementById('ct-popup-styles')) return;

    const style = document.createElement('style');
    style.id = 'ct-popup-styles';
    style.textContent = `
      @keyframes ct-popup-in {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes ct-inline-in {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .ct-inline-translation:hover {
        background: #b3e5fc !important;
      }
    `;
    document.head.appendChild(style);
  }
}
