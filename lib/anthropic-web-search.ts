import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { AIResponse } from './types';

interface WebSearchResult {
  url: string;
  title: string;
  cited_text?: string;
}

interface AnalysisResult {
  response: string;
  brandMentioned: boolean;
  brandPosition?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  webSearchResults?: WebSearchResult[];
}

/**
 * Analyze brand visibility using Anthropic's native web search capability
 */
export async function analyzeWithAnthropicWebSearch(
  prompt: string,
  brandName: string,
  competitors: string[],
  anthropicApiKey: string
): Promise<AIResponse | null> {
  if (!anthropicApiKey) {
    console.warn('Anthropic API key not configured');
    return null;
  }

  const anthropic = createAnthropic({
    apiKey: anthropicApiKey,
  });

  try {
    // Create the analysis prompt
    const fullPrompt = `${prompt}

Please search for current, factual information to answer this question. Focus on recent data and real user opinions about ${brandName} and its competitors: ${competitors.join(', ')}.

After searching, analyze your response and determine:
1. Is ${brandName} mentioned? (even if not ranked)
2. What position/rank does ${brandName} have (if any)?
3. What is the sentiment towards ${brandName}?
4. Which competitors are mentioned and their positions?`;

    // Call Anthropic with the AI SDK
    // Note: Web search tools are not directly available through the AI SDK
    // We'll use standard generation for now
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-latest'),
      maxTokens: 1024,
      prompt: fullPrompt,
    });

    // Extract the response text
    const responseText = result.text;
    const webSearchResults: WebSearchResult[] = [];

    // Analyze the response to extract structured data
    const analysis = await analyzeResponseContent(
      responseText,
      brandName,
      competitors,
      anthropic
    );

    return {
      provider: 'Anthropic',
      prompt,
      response: responseText,
      brandMentioned: analysis.brandMentioned,
      brandPosition: analysis.brandPosition,
      competitors: analysis.competitorsMentioned,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Error with Anthropic web search:', error);
    throw error;
  }
}

/**
 * Analyze the response content to extract structured information
 */
async function analyzeResponseContent(
  responseText: string,
  brandName: string,
  competitors: string[],
  anthropic: any
): Promise<{
  brandMentioned: boolean;
  brandPosition?: number;
  competitorsMentioned: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}> {
  try {
    // Use Claude to analyze its own response
    const analysisResult = await generateText({
      model: anthropic('claude-3-5-haiku-latest'),
      maxTokens: 500,
      prompt: `Analyze this AI response about ${brandName}:

"${responseText}"

Extract the following information in JSON format:
{
  "brandMentioned": boolean (is ${brandName} mentioned anywhere?),
  "brandPosition": number or null (what rank/position if mentioned),
  "competitorsMentioned": array of competitor names mentioned from: ${competitors.join(', ')},
  "sentiment": "positive" | "neutral" | "negative" (sentiment towards ${brandName}),
  "confidence": number between 0 and 1
}

Only respond with valid JSON, no other text.`,
    });

    const analysisText = analysisResult.text;
    const analysis = JSON.parse(analysisText);

    return {
      brandMentioned: analysis.brandMentioned || false,
      brandPosition: analysis.brandPosition || undefined,
      competitorsMentioned: analysis.competitorsMentioned || [],
      sentiment: analysis.sentiment || 'neutral',
      confidence: analysis.confidence || 0.5,
    };

  } catch (error) {
    console.error('Error analyzing response:', error);
    
    // Fallback to basic text analysis
    const textLower = responseText.toLowerCase();
    const brandLower = brandName.toLowerCase();
    
    return {
      brandMentioned: textLower.includes(brandLower),
      brandPosition: undefined,
      competitorsMentioned: competitors.filter(c => 
        textLower.includes(c.toLowerCase())
      ),
      sentiment: 'neutral',
      confidence: 0.3,
    };
  }
}

/**
 * Check if Anthropic web search is available
 */
export function isAnthropicWebSearchAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}