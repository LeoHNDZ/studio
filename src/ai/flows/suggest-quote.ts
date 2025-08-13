// This file holds the Genkit flow for suggesting quotes based on a topic.

'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting quotes based on a given topic.
 *
 * - `suggestQuote` - An exported function that takes a topic as input and returns a suggested quote.
 * - `SuggestQuoteInput` - The input type for the `suggestQuote` function, which is a string representing the topic.
 * - `SuggestQuoteOutput` - The output type for the `suggestQuote` function, which is a string representing the suggested quote.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestQuoteInputSchema = z.string().describe('The topic for which to suggest a quote.');
export type SuggestQuoteInput = z.infer<typeof SuggestQuoteInputSchema>;

const SuggestQuoteOutputSchema = z.string().describe('A suggested quote based on the given topic.');
export type SuggestQuoteOutput = z.infer<typeof SuggestQuoteOutputSchema>;

export async function suggestQuote(topic: SuggestQuoteInput): Promise<SuggestQuoteOutput> {
  return suggestQuoteFlow(topic);
}

const prompt = ai.definePrompt({
  name: 'suggestQuotePrompt',
  input: {schema: SuggestQuoteInputSchema},
  output: {schema: SuggestQuoteOutputSchema},
  prompt: `You are an AI that suggests quotes based on a given topic.

  Topic: {{{topic}}}

  Suggest a quote relevant to the topic. The quote should be concise and inspiring.`,
});

const suggestQuoteFlow = ai.defineFlow(
  {
    name: 'suggestQuoteFlow',
    inputSchema: SuggestQuoteInputSchema,
    outputSchema: SuggestQuoteOutputSchema,
  },
  async topic => {
    const {output} = await prompt(topic);
    return output!;
  }
);
