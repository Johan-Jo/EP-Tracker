/**
 * Translation API Integration
 * EPIC 28: Backend Services - Translation
 */

import OpenAI from 'openai';
import { getConstructionGlossary } from './glossary';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranslateOptions {
  sourceLanguage?: string;
  targetLanguage?: string;
  glossary?: string;
}

/**
 * Translate text using GPT-4o
 */
export async function translateText(
  text: string,
  options: TranslateOptions = {}
): Promise<{ translatedText: string; confidence: number }> {
  const {
    sourceLanguage = 'unknown',
    targetLanguage = 'sv',
    glossary,
  } = options;
  
  const constructionGlossary = glossary || getConstructionGlossary();
  
  const prompt = `Translate the following ${sourceLanguage !== 'unknown' ? sourceLanguage : ''} construction diary text to Swedish (${targetLanguage}).

Use this construction glossary for accurate terminology:
${constructionGlossary}

Keep the tone professional and construction-specific. Preserve measurements and numbers exactly.

Text to translate:
${text}

Output ONLY the translated text, nothing else.`;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in construction industry terminology. Translate accurately and maintain technical precision.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });
    
    const translatedText = response.choices[0]?.message?.content?.trim() || text;
    
    // Simple confidence based on finish reason
    const confidence = response.choices[0]?.finish_reason === 'stop' ? 0.95 : 0.7;
    
    return {
      translatedText,
      confidence,
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(
      `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
