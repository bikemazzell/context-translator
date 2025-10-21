import { Settings, DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'context-translator-settings';

export class SettingsManager {
  private settings: Settings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): Settings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('[ContextTranslator] Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  public saveSettings(settings: Partial<Settings>): void {
    this.settings = { ...this.settings, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[ContextTranslator] Failed to save settings:', error);
    }
  }

  public getSettings(): Settings {
    return { ...this.settings };
  }

  public getSetting<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key];
  }

  public setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value;
    this.saveSettings(this.settings);
  }

  public resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[ContextTranslator] Failed to reset settings:', error);
    }
  }
}
