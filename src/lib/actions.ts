'use server';

import { suggestQuote } from '@/ai/flows/suggest-quote';
import { z } from 'zod';

const topicSchema = z.string().min(1, 'Topic cannot be empty.');

export async function getQuoteSuggestion(topic: string) {
  try {
    const validatedTopic = topicSchema.parse(topic);
    const quote = await suggestQuote(validatedTopic);
    return { success: true, quote };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error(error);
    return { success: false, error: 'An unexpected error occurred while fetching the quote.' };
  }
}
