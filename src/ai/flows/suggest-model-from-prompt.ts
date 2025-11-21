// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Suggests a suitable pre-trained TensorFlow.js model based on a prompt describing an image classification task.
 *
 * - suggestModel - A function that takes a prompt and suggests a TensorFlow.js model.
 * - SuggestModelInput - The input type for the suggestModel function.
 * - SuggestModelOutput - The return type for the suggestModel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestModelInputSchema = z.object({
  prompt: z
    .string()
    .describe(
      'A description of the image classification task (e.g., "Classify different types of birds").'
    ),
});
export type SuggestModelInput = z.infer<typeof SuggestModelInputSchema>;

const SuggestModelOutputSchema = z.object({
  suggestedModel: z
    .string()
    .describe('The name of the suggested TensorFlow.js model.'),
  reason: z
    .string()
    .describe('The reason why this model is suitable for the task.'),
});
export type SuggestModelOutput = z.infer<typeof SuggestModelOutputSchema>;

export async function suggestModel(input: SuggestModelInput): Promise<SuggestModelOutput> {
  return suggestModelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestModelPrompt',
  input: {schema: SuggestModelInputSchema},
  output: {schema: SuggestModelOutputSchema},
  prompt: `You are an AI model expert. Given the following image classification task description, suggest a suitable pre-trained TensorFlow.js model and explain why it is suitable.\n\nTask Description: {{{prompt}}}`,
});

const suggestModelFlow = ai.defineFlow(
  {
    name: 'suggestModelFlow',
    inputSchema: SuggestModelInputSchema,
    outputSchema: SuggestModelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
