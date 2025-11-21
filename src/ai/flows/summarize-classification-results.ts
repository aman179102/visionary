'use server';

/**
 * @fileOverview Summarizes classification results, highlighting frequent classes and confidence scores.
 *
 * - summarizeClassificationResults - Summarizes classification results.
 * - SummarizeClassificationResultsInput - Input type for the function.
 * - SummarizeClassificationResultsOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeClassificationResultsInputSchema = z.array(
  z.object({
    className: z.string().describe('The predicted class name.'),
    confidence: z.number().describe('The confidence score (0-1) for the predicted class.'),
  })
).describe('An array of classification results.');

export type SummarizeClassificationResultsInput = z.infer<typeof SummarizeClassificationResultsInputSchema>;

const SummarizeClassificationResultsOutputSchema = z.object({
  summary: z.string().describe('A summary of the classification results, including the most frequent classes and overall confidence scores.'),
});

export type SummarizeClassificationResultsOutput = z.infer<typeof SummarizeClassificationResultsOutputSchema>;

export async function summarizeClassificationResults(input: SummarizeClassificationResultsInput): Promise<SummarizeClassificationResultsOutput> {
  return summarizeClassificationResultsFlow(input);
}

const summarizeClassificationResultsPrompt = ai.definePrompt({
  name: 'summarizeClassificationResultsPrompt',
  input: {schema: SummarizeClassificationResultsInputSchema},
  output: {schema: SummarizeClassificationResultsOutputSchema},
  prompt: `You are an AI assistant that summarizes image classification results. Given a list of classification results, you should identify the most frequently identified classes and the overall confidence scores.

Classification Results:
{{#each this}}
- Class: {{className}}, Confidence: {{confidence}}
{{/each}}

Provide a concise summary of the results, highlighting the most frequent classes and overall confidence.`,
});

const summarizeClassificationResultsFlow = ai.defineFlow(
  {
    name: 'summarizeClassificationResultsFlow',
    inputSchema: SummarizeClassificationResultsInputSchema,
    outputSchema: SummarizeClassificationResultsOutputSchema,
  },
  async input => {
    const {output} = await summarizeClassificationResultsPrompt(input);
    return output!;
  }
);
