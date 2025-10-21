import { SettingsManager } from './settings';
import { TranslationAPI } from './api';
import { Toolbar } from './toolbar';
import { ToastManager } from './toast';
import { ContextExtractor } from './context';
import { TranslationDisplay } from './display';
import { Settings } from './types';

class ContextTranslator {
  private settingsManager: SettingsManager;
  private api: TranslationAPI;
  private toolbar: Toolbar | null = null;
  private toast: ToastManager;
  private contextExtractor: ContextExtractor;
  private display: TranslationDisplay;
  private isActive = false;
  private languages: string[] = [];

  constructor() {
    this.settingsManager = new SettingsManager();
    const settings = this.settingsManager.getSettings();
    this.api = new TranslationAPI(settings.apiEndpoint);
    this.toast = new ToastManager();
    this.contextExtractor = new ContextExtractor();
    this.display = new TranslationDisplay();
  }

  async initialize(): Promise<void> {
    try {
      this.toast.injectStyles();
      this.display.injectStyles();

      const isHealthy = await this.api.checkHealth();
      if (!isHealthy) {
        this.toast.error('Backend server not responding. Please check if it is running.');
        return;
      }

      this.languages = await this.api.getLanguages();

      if (this.languages.length === 0) {
        this.toast.error('No languages available from backend');
        return;
      }

      this.createToolbar();
      this.attachClickHandler();
      this.isActive = true;

      this.toast.success('Context Translator activated');
    } catch (error) {
      console.error('[ContextTranslator] Initialization failed:', error);
      this.toast.error('Failed to initialize translator');
    }
  }

  private createToolbar(): void {
    const settings = this.settingsManager.getSettings();
    this.toolbar = new Toolbar(settings, this.languages);

    this.toolbar.setCallbacks({
      onClose: () => {
        this.shutdown();
      },
      onSettingsChange: (newSettings: Partial<Settings>) => {
        this.settingsManager.saveSettings(newSettings);
        if (newSettings.apiEndpoint) {
          this.api.setBaseUrl(newSettings.apiEndpoint);
        }
      },
    });

    const toolbarElement = this.toolbar.create();
    document.body.appendChild(toolbarElement);
  }

  private attachClickHandler(): void {
    document.addEventListener('click', this.handleClick, true);
  }

  private detachClickHandler(): void {
    document.removeEventListener('click', this.handleClick, true);
  }

  private handleClick = async (event: MouseEvent): Promise<void> => {
    if (!this.isActive) return;

    const target = event.target as HTMLElement;

    if (target.closest('#ct-toolbar') || target.closest('#ct-translation-popup') || target.closest('.ct-inline-translation')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 0) {
      const range = selection?.getRangeAt(0);
      if (range) {
        await this.translate(selectedText, range.startContainer, event.clientX, event.clientY, range);
        return;
      }
    }

    const result = this.contextExtractor.getTextAtPoint(event.clientX, event.clientY);

    if (!result || !result.text) {
      this.toast.info('No text found at click position');
      return;
    }

    await this.translate(result.text, result.node, event.clientX, event.clientY, result.range);
  };

  private async translate(
    text: string,
    node: Node,
    x: number,
    y: number,
    wordRange?: Range,
  ): Promise<void> {
    const settings = this.settingsManager.getSettings();

    if (text.length > 500) {
      this.toast.error('Text too long (max 500 characters)');
      return;
    }

    const targetElement = node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

    if (settings.displayMode === 'inline' && targetElement && wordRange && this.display.isInlineShown(wordRange)) {
      this.display.show('', x, y, false, 'inline', targetElement, wordRange);
      return;
    }

    let context: string | undefined;
    if (settings.contextMode) {
      context = this.contextExtractor.extractContext(node, settings.contextWindowChars);
    }

    try {
      if (settings.displayMode !== 'inline' || !wordRange || !this.display.isInlineShown(wordRange)) {
        this.toast.info('Translating...');
      }

      const response = await this.api.translate({
        text,
        source_lang: settings.sourceLang,
        target_lang: settings.targetLang,
        context,
      });

      this.display.show(
        response.translation,
        x,
        y,
        response.cached,
        settings.displayMode,
        targetElement || undefined,
        wordRange
      );
    } catch (error) {
      console.error('[ContextTranslator] Translation failed:', error);
      const message = error instanceof Error ? error.message : 'Translation failed';
      this.toast.error(message);
    }
  }

  shutdown(): void {
    this.isActive = false;
    this.detachClickHandler();

    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }

    this.display.remove();
    this.toast.info('Context Translator deactivated');
  }
}

if (typeof window !== 'undefined') {
  const existingTranslator = (window as any).contextTranslator;
  if (existingTranslator) {
    console.log('[ContextTranslator] Already running, shutting down previous instance');
    existingTranslator.shutdown();
  }

  const translator = new ContextTranslator();
  (window as any).contextTranslator = translator;

  translator.initialize().catch((error) => {
    console.error('[ContextTranslator] Failed to start:', error);
  });
}

export { ContextTranslator };
