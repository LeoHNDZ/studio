// Core data types for the composition repository system

export interface Composition {
  id: string;
  name: string;
  texts: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontFamily: string;
    width?: number;
    height?: number;
  }>;
  backgroundImageUrl?: string;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: number;
  updatedAt: number;
}

export interface PhraseSuggestion {
  value: string;
  score: number;
  source: 'local' | 'composition';
  originId?: string;
  frequency: number;
  lastUsed: number;
}

export interface SaveCompositionInput {
  name: string;
  texts: Composition['texts'];
  backgroundImageUrl?: string;
  canvasWidth: number;
  canvasHeight: number;
}

export interface CompositionRepository {
  list(limit?: number): Promise<Composition[]>;
  get(id: string): Promise<Composition | null>;
  save(input: SaveCompositionInput): Promise<Composition>;
  delete(id: string): Promise<void>;
  suggestPhrases(opts?: {
    limit?: number;
    prefix?: string;
    maxNGram?: number;
    minChars?: number;
  }): Promise<PhraseSuggestion[]>;
  subscribe?(listener: (compositions: Composition[]) => void): () => void;
}