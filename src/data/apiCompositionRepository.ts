// API composition repository stub for future server/API implementation

import type { Composition, CompositionRepository, SaveCompositionInput, PhraseSuggestion } from './types';

export class ApiCompositionRepository implements CompositionRepository {
  private baseUrl: string;

  constructor(baseUrl = '/api/compositions') {
    this.baseUrl = baseUrl;
  }

  async list(limit?: number): Promise<Composition[]> {
    throw new Error('API composition repository not implemented yet');
  }

  async get(id: string): Promise<Composition | null> {
    throw new Error('API composition repository not implemented yet');
  }

  async save(input: SaveCompositionInput): Promise<Composition> {
    throw new Error('API composition repository not implemented yet');
  }

  async delete(id: string): Promise<void> {
    throw new Error('API composition repository not implemented yet');
  }

  async suggestPhrases(opts?: {
    limit?: number;
    prefix?: string;
    maxNGram?: number;
    minChars?: number;
  }): Promise<PhraseSuggestion[]> {
    throw new Error('API composition repository not implemented yet');
  }

  subscribe?(listener: (compositions: Composition[]) => void): () => void {
    // For future implementation - would likely use WebSocket or Server-Sent Events
    console.warn('API composition repository subscription not implemented yet');
    return () => {};
  }
}