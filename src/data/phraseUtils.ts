// Utilities for phrase extraction and scoring

import type { PhraseSuggestion } from './types';

/**
 * Extract n-grams (1-5 word phrases) from text
 */
export function extractPhrases(
  text: string,
  maxNGram = 5,
  minChars = 2
): Set<string> {
  const phrases = new Set<string>();
  
  if (!text?.trim()) return phrases;
  
  const words = text
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  for (let i = 0; i < words.length; i++) {
    for (let len = 1; len <= Math.min(maxNGram, words.length - i); len++) {
      const ngram = words.slice(i, i + len).join(' ');
      if (ngram.length >= minChars) {
        phrases.add(ngram);
      }
    }
  }
  
  return phrases;
}

/**
 * Calculate exponential decay score based on age
 * Uses half-life of 60 minutes as specified in requirements
 */
export function calculateDecayScore(ageMs: number, halfLifeMs = 60 * 60 * 1000): number {
  return Math.exp(-Math.LN2 * ageMs / halfLifeMs);
}

/**
 * Aggregate phrase scores with frequency and recency decay
 */
export function aggregatePhraseScores(
  phrases: Array<{ phrase: string; timestamp: number }>,
  halfLifeMs = 60 * 60 * 1000
): Map<string, { score: number; frequency: number; lastUsed: number }> {
  const phraseData = new Map<string, { score: number; frequency: number; lastUsed: number }>();
  const now = Date.now();

  phrases.forEach(({ phrase, timestamp }) => {
    const existing = phraseData.get(phrase);
    const ageMs = now - timestamp;
    const decayScore = calculateDecayScore(ageMs, halfLifeMs);
    
    if (existing) {
      phraseData.set(phrase, {
        score: existing.score + decayScore,
        frequency: existing.frequency + 1,
        lastUsed: Math.max(existing.lastUsed, timestamp)
      });
    } else {
      phraseData.set(phrase, {
        score: decayScore,
        frequency: 1,
        lastUsed: timestamp
      });
    }
  });

  return phraseData;
}

/**
 * Filter phrases by prefix (case-insensitive)
 */
export function filterByPrefix(phrases: PhraseSuggestion[], prefix: string): PhraseSuggestion[] {
  if (!prefix?.trim()) return phrases;
  
  const lowerPrefix = prefix.toLowerCase();
  return phrases.filter(p => 
    p.value.toLowerCase().startsWith(lowerPrefix)
  );
}

/**
 * Sort phrases by score (descending), then by length (longer first), then alphabetically
 */
export function sortPhrases(phrases: PhraseSuggestion[]): PhraseSuggestion[] {
  return phrases.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    
    const aWordCount = a.value.split(' ').length;
    const bWordCount = b.value.split(' ').length;
    if (aWordCount !== bWordCount) return bWordCount - aWordCount;
    
    return a.value.localeCompare(b.value);
  });
}