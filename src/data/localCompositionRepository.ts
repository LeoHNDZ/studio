// Local composition repository using localStorage

import { nanoid } from 'nanoid';
import type { Composition, CompositionRepository, SaveCompositionInput, PhraseSuggestion } from './types';
import { extractPhrases, aggregatePhraseScores, filterByPrefix, sortPhrases } from './phraseUtils';

const STORAGE_KEY = 'studio_compositions';

export class LocalCompositionRepository implements CompositionRepository {
  private listeners: Array<(compositions: Composition[]) => void> = [];

  private getCompositions(): Composition[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Failed to load compositions from localStorage:', err);
      return [];
    }
  }

  private saveCompositions(compositions: Composition[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compositions));
      this.notifyListeners(compositions);
    } catch (err) {
      console.error('Failed to save compositions to localStorage:', err);
      throw new Error('Failed to save compositions');
    }
  }

  private notifyListeners(compositions: Composition[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(compositions);
      } catch (err) {
        console.error('Listener error:', err);
      }
    });
  }

  async list(limit?: number): Promise<Composition[]> {
    const compositions = this.getCompositions();
    const sorted = compositions.sort((a, b) => b.updatedAt - a.updatedAt);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async get(id: string): Promise<Composition | null> {
    const compositions = this.getCompositions();
    return compositions.find(c => c.id === id) || null;
  }

  async save(input: SaveCompositionInput): Promise<Composition> {
    const compositions = this.getCompositions();
    const now = Date.now();
    
    const composition: Composition = {
      id: nanoid(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    compositions.push(composition);
    this.saveCompositions(compositions);
    
    return composition;
  }

  async delete(id: string): Promise<void> {
    const compositions = this.getCompositions();
    const filtered = compositions.filter(c => c.id !== id);
    this.saveCompositions(filtered);
  }

  async suggestPhrases(opts?: {
    limit?: number;
    prefix?: string;
    maxNGram?: number;
    minChars?: number;
  }): Promise<PhraseSuggestion[]> {
    const {
      limit = 50,
      prefix = '',
      maxNGram = 5,
      minChars = 2
    } = opts || {};

    const compositions = this.getCompositions();
    
    // Extract phrases from all compositions with timestamps
    const allPhrases: Array<{ phrase: string; timestamp: number; compositionId: string }> = [];
    
    compositions.forEach(composition => {
      composition.texts.forEach(text => {
        const phrases = extractPhrases(text.text, maxNGram, minChars);
        phrases.forEach(phrase => {
          allPhrases.push({
            phrase,
            timestamp: composition.updatedAt,
            compositionId: composition.id
          });
        });
      });
    });

    // Aggregate scores with frequency and recency decay
    const aggregated = aggregatePhraseScores(
      allPhrases.map(p => ({ phrase: p.phrase, timestamp: p.timestamp }))
    );

    // Convert to PhraseSuggestion format
    let suggestions: PhraseSuggestion[] = Array.from(aggregated.entries()).map(([phrase, data]) => ({
      value: phrase,
      score: data.score,
      frequency: data.frequency,
      lastUsed: data.lastUsed,
      source: 'composition' as const,
      originId: allPhrases.find(p => p.phrase === phrase)?.compositionId
    }));

    // Filter by prefix if provided
    if (prefix) {
      suggestions = filterByPrefix(suggestions, prefix);
    }

    // Sort by score and limit results
    suggestions = sortPhrases(suggestions).slice(0, limit);

    return suggestions;
  }

  subscribe(listener: (compositions: Composition[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}