/**
 * Prompt Enricher for Deep Dial Feature
 *
 * Takes scraped company/context data and enriches prompts
 * with real-world information for better AI responses.
 */

import { Company, ResearchResult } from './types';

export interface EnrichmentContext {
  company?: Company;
  additionalContext?: string[];
  keywords?: string[];
  competitors?: string[];
}

export interface EnrichedPrompt {
  originalPrompt: string;
  enrichedPrompt: string;
  contextUsed: {
    companyName?: string;
    industry?: string;
    keywords?: string[];
    competitors?: string[];
  };
  enrichmentLevel: 'basic' | 'deep';
}

/**
 * Enrich a prompt with company/context data
 */
export function enrichPromptWithContext(
  prompt: string,
  context: EnrichmentContext
): EnrichedPrompt {
  const contextSections: string[] = [];
  const contextUsed: EnrichedPrompt['contextUsed'] = {};

  // Add company context if available
  if (context.company) {
    const { company } = context;
    contextUsed.companyName = company.name;
    contextUsed.industry = company.industry;

    contextSections.push(`## Context: ${company.name}`);
    contextSections.push(`- Industry: ${company.industry}`);
    contextSections.push(`- Description: ${company.description}`);

    if (company.scrapedData) {
      if (company.scrapedData.mainProducts?.length) {
        contextSections.push(`- Main Products/Services: ${company.scrapedData.mainProducts.join(', ')}`);
      }
      if (company.scrapedData.keywords?.length) {
        contextUsed.keywords = company.scrapedData.keywords;
        contextSections.push(`- Key Topics: ${company.scrapedData.keywords.slice(0, 5).join(', ')}`);
      }
      if (company.scrapedData.competitors?.length) {
        contextUsed.competitors = company.scrapedData.competitors;
        contextSections.push(`- Competitors: ${company.scrapedData.competitors.join(', ')}`);
      }
    }
  }

  // Add additional context
  if (context.additionalContext?.length) {
    contextSections.push('\n## Additional Context');
    context.additionalContext.forEach(ctx => {
      contextSections.push(`- ${ctx}`);
    });
  }

  // Add keywords
  if (context.keywords?.length) {
    contextUsed.keywords = [...(contextUsed.keywords || []), ...context.keywords];
    contextSections.push(`\n## Relevant Keywords: ${context.keywords.join(', ')}`);
  }

  // Add competitors
  if (context.competitors?.length) {
    contextUsed.competitors = [...(contextUsed.competitors || []), ...context.competitors];
    contextSections.push(`\n## Market Competitors: ${context.competitors.join(', ')}`);
  }

  // Build enriched prompt
  const enrichedPrompt = contextSections.length > 0
    ? `${contextSections.join('\n')}\n\n---\n\n## User Request\n${prompt}`
    : prompt;

  return {
    originalPrompt: prompt,
    enrichedPrompt,
    contextUsed,
    enrichmentLevel: context.company?.scrapedData ? 'deep' : 'basic',
  };
}

/**
 * Create a context-aware system prompt enhancement
 */
export function createContextualSystemPrompt(context: EnrichmentContext): string {
  if (!context.company) {
    return '';
  }

  const { company } = context;
  const lines: string[] = [
    'You have been provided with specific context about a company/organization.',
    'Use this information to make your responses more relevant and tailored:',
    '',
    `Company: ${company.name}`,
    `Industry: ${company.industry}`,
  ];

  if (company.scrapedData?.mainProducts?.length) {
    lines.push(`Products/Services: ${company.scrapedData.mainProducts.join(', ')}`);
  }

  if (company.scrapedData?.competitors?.length) {
    lines.push(`Key Competitors: ${company.scrapedData.competitors.join(', ')}`);
  }

  lines.push('');
  lines.push('Tailor your response to be relevant to this specific business context.');

  return lines.join('\n');
}

/**
 * Extract relevant context from a URL for prompt enrichment
 */
export async function extractContextFromUrl(
  url: string,
  scrapeFunction: (url: string) => Promise<Company>
): Promise<EnrichmentContext> {
  try {
    const company = await scrapeFunction(url);

    return {
      company,
      keywords: company.scrapedData?.keywords || [],
      competitors: company.scrapedData?.competitors || [],
    };
  } catch (error) {
    console.error('Failed to extract context from URL:', error);
    return {};
  }
}

/**
 * Estimate the value/quality of enrichment
 */
export function assessEnrichmentQuality(context: EnrichmentContext): {
  score: number; // 0-100
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  if (context.company) {
    score += 30;
    factors.push('Company identified');

    if (context.company.scraped) {
      score += 20;
      factors.push('Website scraped successfully');
    }

    if (context.company.scrapedData?.mainProducts?.length) {
      score += 15;
      factors.push('Products/services identified');
    }

    if (context.company.scrapedData?.competitors?.length) {
      score += 15;
      factors.push('Competitors identified');
    }

    if (context.company.scrapedData?.keywords?.length) {
      score += 10;
      factors.push('Keywords extracted');
    }

    if (context.company.industry && context.company.industry !== 'technology') {
      score += 10;
      factors.push('Industry categorized');
    }
  }

  return { score: Math.min(score, 100), factors };
}
