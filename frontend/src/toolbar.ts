import { Settings } from './types';

export class Toolbar {
  private container: HTMLDivElement | null = null;
  private isMinimized = false;

  private onClose?: () => void;
  private onSettingsChange?: (settings: Partial<Settings>) => void;

  constructor(
    private settings: Settings,
    private languages: string[],
  ) {}

  setCallbacks(callbacks: {
    onClose?: () => void;
    onSettingsChange?: (settings: Partial<Settings>) => void;
  }): void {
    this.onClose = callbacks.onClose;
    this.onSettingsChange = callbacks.onSettingsChange;
  }

  create(): HTMLDivElement {
    if (this.container) {
      return this.container;
    }

    this.container = document.createElement('div');
    this.container.id = 'ct-toolbar';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 2147483647;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      min-width: 280px;
    `;

    this.renderContent();
    return this.container;
  }

  private renderContent(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    const header = this.createHeader();
    this.container.appendChild(header);

    if (!this.isMinimized) {
      const body = this.createBody();
      this.container.appendChild(body);
    }
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-bottom: ${this.isMinimized ? 'none' : '1px solid #eee'};
      background: #f8f9fa;
      border-radius: 8px 8px 0 0;
    `;

    const title = document.createElement('div');
    title.textContent = 'Context Translator';
    title.style.cssText = 'font-weight: 600; color: #333;';

    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 8px;';

    const minimizeBtn = this.createButton(this.isMinimized ? '□' : '−', () => {
      this.isMinimized = !this.isMinimized;
      this.renderContent();
    });

    const closeBtn = this.createButton('×', () => {
      this.remove();
      this.onClose?.();
    });

    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(controls);

    return header;
  }

  private createBody(): HTMLDivElement {
    const body = document.createElement('div');
    body.style.cssText = 'padding: 12px;';

    const apiEndpointRow = this.createInputRow(
      'API Endpoint:',
      'api_endpoint',
      this.settings.apiEndpoint,
    );

    const sourceLangRow = this.createSelectRow(
      'From:',
      'source_lang',
      this.settings.sourceLang,
    );

    const targetLangRow = this.createSelectRow(
      'To:',
      'target_lang',
      this.settings.targetLang,
    );

    const displayModeRow = this.createDisplayModeRow();

    const contextRow = this.createCheckboxRow(
      'Context mode',
      'context_mode',
      this.settings.contextMode,
    );

    const help = document.createElement('div');
    help.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #666;';
    help.textContent = 'Click any word on the page to translate';

    body.appendChild(apiEndpointRow);
    body.appendChild(sourceLangRow);
    body.appendChild(targetLangRow);
    body.appendChild(displayModeRow);
    body.appendChild(contextRow);
    body.appendChild(help);

    return body;
  }

  private createInputRow(label: string, _key: string, value: string): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 10px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'display: block; margin-bottom: 4px; color: #555; font-weight: 500; font-size: 12px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      box-sizing: border-box;
    `;

    input.addEventListener('change', () => {
      this.settings.apiEndpoint = input.value;
      this.onSettingsChange?.({ apiEndpoint: input.value });
    });

    input.addEventListener('blur', () => {
      this.settings.apiEndpoint = input.value;
      this.onSettingsChange?.({ apiEndpoint: input.value });
    });

    row.appendChild(labelEl);
    row.appendChild(input);
    return row;
  }

  private createSelectRow(label: string, key: string, value: string): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 10px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'display: block; margin-bottom: 4px; color: #555; font-weight: 500;';

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      font-size: 13px;
      cursor: pointer;
    `;

    this.languages.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang;
      option.selected = lang === value;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      const settingKey = key === 'source_lang' ? 'sourceLang' : 'targetLang';
      this.settings[settingKey] = select.value;
      this.onSettingsChange?.({ [settingKey]: select.value });
    });

    row.appendChild(labelEl);
    row.appendChild(select);
    return row;
  }

  private createDisplayModeRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 10px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = 'Display:';
    labelEl.style.cssText = 'display: block; margin-bottom: 4px; color: #555; font-weight: 500;';

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      font-size: 13px;
      cursor: pointer;
    `;

    const options = [
      { value: 'tooltip', label: 'Tooltip' },
      { value: 'inline', label: 'Inline' },
    ];

    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === this.settings.displayMode;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      this.settings.displayMode = select.value as 'tooltip' | 'inline';
      this.onSettingsChange?.({ displayMode: this.settings.displayMode });
    });

    row.appendChild(labelEl);
    row.appendChild(select);
    return row;
  }

  private createCheckboxRow(label: string, _key: string, checked: boolean): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; gap: 8px;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.style.cssText = 'cursor: pointer;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'color: #555; font-weight: 500; cursor: pointer;';

    checkbox.addEventListener('change', () => {
      this.settings.contextMode = checkbox.checked;
      this.onSettingsChange?.({ contextMode: checkbox.checked });
    });

    labelEl.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });

    row.appendChild(checkbox);
    row.appendChild(labelEl);
    return row;
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      color: #666;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.color = '#333';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.color = '#666';
    });

    btn.addEventListener('click', onClick);

    return btn;
  }

  show(): void {
    if (this.container && !document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }
  }

  remove(): void {
    if (this.container && document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.renderContent();
  }
}
