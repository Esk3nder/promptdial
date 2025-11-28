/**
 * Research Module for Deep Dial Feature
 *
 * Provides web scraping and search capabilities for enriching prompts
 * with real-world data. Used by the premium "Deep Dial" feature.
 */

export { scrapeCompanyInfo } from './scrape';
export {
  enrichPromptWithContext,
  createContextualSystemPrompt,
  extractContextFromUrl,
  assessEnrichmentQuality,
  type EnrichmentContext,
  type EnrichedPrompt,
} from './enricher';
export type { Company, ScrapedData, ResearchResult } from './types';

// Note: Web search is handled via provider-native capabilities
// - OpenAI: responses API with web_search_preview
// - Google: search grounding
// - Anthropic: base knowledge only
