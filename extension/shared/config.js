/**
 * Configuration constants for Context Translator
 * Used by both background and content scripts
 *
 * @module shared/config
 */

export const CONFIG = {
  // LLM Server Configuration
  llm: {
    defaultEndpoint: 'http://localhost:1234/v1/chat/completions',
    defaultModel: 'local-model',
    timeout: 30000, // 30 seconds
    maxRetries: 2,
    retryDelay: 1000, // 1 second
    maxTokens: 100,
    temperature: 0.1, // Low temperature for consistent translations
    maxTextLength: 5000,
    maxContextLength: 2000
  },

  // Translation Settings
  translation: {
    maxTextLength: 500,
    contextWindowChars: 200,
    defaultSourceLang: 'German',
    defaultTargetLang: 'English'
  },

  // Cache Settings
  cache: {
    dbName: 'ContextTranslatorCache',
    dbVersion: 1,
    storeName: 'translations',
    ttlDays: 30,
    maxEntries: 10000
  },

  // UI Settings
  ui: {
    toastDuration: 3000,
    tooltipDelay: 100,
    animationDuration: 200,
    maxMergeWords: 20
  },

  // Default User Settings
  defaults: {
    sourceLang: 'German',
    targetLang: 'English',
    contextMode: false,
    contextWindowChars: 200,
    displayMode: 'inline', // 'inline' or 'tooltip'
    darkMode: 'auto', // 'auto', 'light', or 'dark'
    useCache: true,
    useRateLimit: false, // Disable by default for local LLM instances
    enabled: false,
    llmEndpoint: 'http://localhost:1234/v1/chat/completions',
    llmModel: 'local-model',
    llmHost: 'localhost',
    llmPort: 1234,
    translationBgColor: '#333333',
    translationTextColor: '#ffffff',
    translationBgOpacity: 0.9 // 0.0 to 1.0
  }
};

// Supported Languages
export const SUPPORTED_LANGUAGES = [
  'English',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Portuguese',
  'Dutch',
  'Russian',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Turkish',
  'Polish',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Czech',
  'Hungarian'
];

// System Prompt for LLM
export const SYSTEM_PROMPT = `You are a translator. Your task is to translate the specified text from one language to another.
Rules:
- Translate ONLY the text explicitly marked for translation
- Use the context (if provided) to determine the correct meaning, but do not translate the context
- Provide ONLY the translation, without explanations, notes, or additional commentary
- Do not include the original text in your response
- If multiple meanings are possible, choose the one that best fits the context`;
