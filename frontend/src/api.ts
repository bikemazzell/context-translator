import {
  TranslationRequest,
  TranslationResponse,
  ErrorResponse,
  LanguageListResponse,
} from './types';

export class TranslationAPI {
  constructor(private baseUrl: string) {}

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const response = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.details || error.error || 'Translation failed');
    }

    return response.json();
  }

  async getLanguages(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/languages`);

    if (!response.ok) {
      throw new Error('Failed to fetch languages');
    }

    const data: LanguageListResponse = await response.json();
    return data.languages;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}
