interface CaretPosition {
  readonly offsetNode: Node;
  readonly offset: number;
}

declare global {
  interface Document {
    caretPositionFromPoint(x: number, y: number): CaretPosition | null;
  }
}

export interface TranslationRequest {
  text: string;
  source_lang: string;
  target_lang: string;
  context?: string;
}

export interface TranslationResponse {
  translation: string;
  cached: boolean;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

export interface LanguageListResponse {
  languages: string[];
}

export type DisplayMode = 'tooltip' | 'inline';

export interface Settings {
  apiEndpoint: string;
  sourceLang: string;
  targetLang: string;
  contextMode: boolean;
  contextWindowChars: number;
  displayMode: DisplayMode;
}

export interface ToastOptions {
  message: string;
  type: 'info' | 'success' | 'error';
  duration?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  apiEndpoint: 'https://localhost:8080',
  sourceLang: 'German',
  targetLang: 'English',
  contextMode: false,
  contextWindowChars: 200,
  displayMode: 'tooltip',
};
