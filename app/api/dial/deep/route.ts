import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { kernelPrompt } from '@/lib/dial/kernel';
import { ResponseValidator } from '@/lib/dial/response-validator';
import {
  scrapeCompanyInfo,
  enrichPromptWithContext,
  createContextualSystemPrompt,
  assessEnrichmentQuality,
} from '@/lib/research';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { dialResults } from '@/lib/db/schema';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

// Deep Dial is a premium feature - costs more credits
const DEEP_DIAL_CREDIT_COST = 5;

export async function POST(req: NextRequest) {
  try {
    // Authentication required for Deep Dial (premium feature)
    const session = await auth.api.getSession({
      headers: await headers(),
    }).catch(() => null);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required for Deep Dial' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await req.json();
    const { userGoal, contextUrl, state = {} } = body;

    if (!userGoal) {
      return NextResponse.json(
        { error: 'userGoal is required' },
        { status: 400 }
      );
    }

    if (!contextUrl) {
      return NextResponse.json(
        { error: 'contextUrl is required for Deep Dial' },
        { status: 400 }
      );
    }

    console.log('\n=== DEEP DIAL DEBUG ===');
    console.log('User ID:', userId);
    console.log('User Goal:', userGoal);
    console.log('Context URL:', contextUrl);

    // Step 1: Scrape the context URL
    console.log('\n=== SCRAPING CONTEXT ===');
    let company;
    let scrapeError = null;

    try {
      company = await scrapeCompanyInfo(contextUrl);
      console.log('Scraped company:', company.name);
      console.log('Industry:', company.industry);
      console.log('Scraped:', company.scraped);
    } catch (err: any) {
      scrapeError = err.message;
      console.error('Scraping failed:', scrapeError);
    }

    // Step 2: Enrich the prompt with context
    const enrichmentContext = company
      ? {
          company,
          keywords: company.scrapedData?.keywords || [],
          competitors: company.scrapedData?.competitors || [],
        }
      : {};

    const enrichedPromptResult = enrichPromptWithContext(userGoal, enrichmentContext);
    const enrichmentQuality = assessEnrichmentQuality(enrichmentContext);

    console.log('\n=== ENRICHMENT ===');
    console.log('Enrichment Level:', enrichedPromptResult.enrichmentLevel);
    console.log('Quality Score:', enrichmentQuality.score);
    console.log('Quality Factors:', enrichmentQuality.factors);

    // Step 3: Create enhanced system prompt
    const contextualSystemPrompt = createContextualSystemPrompt(enrichmentContext);
    const fullSystemPrompt = contextualSystemPrompt
      ? `${contextualSystemPrompt}\n\n---\n\n${kernelPrompt}`
      : kernelPrompt;

    console.log('\n=== RUNNING KERNEL ===');
    console.log('System Prompt Length:', fullSystemPrompt.length, 'chars');

    // Step 4: Generate with enriched context
    const userPrompt = JSON.stringify({
      user_goal: enrichedPromptResult.enrichedPrompt,
      state: {
        ...state,
        deep_dial: true,
        context_source: contextUrl,
        enrichment_level: enrichedPromptResult.enrichmentLevel,
      },
    });

    // Create Anthropic client lazily to avoid build-time API key validation
    const anthropic = createAnthropic();

    const { text, usage } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: fullSystemPrompt,
      prompt: userPrompt,
      maxTokens: 2400, // More tokens for enriched responses
      temperature: 0.7,
    });

    console.log('\n=== LLM RESPONSE ===');
    console.log('Response Length:', text.length, 'chars');
    console.log('Tokens Used:', usage?.totalTokens);

    // Parse and validate response
    let response;

    try {
      response = JSON.parse(text);
      console.log('\n=== DIRECT JSON PARSE SUCCESS ===');
    } catch (parseError) {
      console.log('\n=== DIRECT JSON PARSE FAILED ===');
      response = ResponseValidator.extractJSON(text);

      if (!response) {
        console.error('Could not extract JSON. Using fallback response.');
        response = ResponseValidator.createFallbackResponse(userGoal, text);
      }
    }

    // Validate and fix schema
    const validation = ResponseValidator.validateSchema(response);
    if (!validation.valid) {
      response = ResponseValidator.attemptAutoFix(response, userGoal);
    }

    // Add Deep Dial metadata
    response.metadata = {
      tokensUsed: usage?.totalTokens,
      model: 'claude-sonnet-4-20250514',
      stage: 'deep-dial',
      creditCost: DEEP_DIAL_CREDIT_COST,
    };

    // Add enrichment details
    response.deepDial = {
      contextUrl,
      company: company
        ? {
            name: company.name,
            industry: company.industry,
            scraped: company.scraped,
            favicon: company.favicon,
          }
        : null,
      enrichment: {
        level: enrichedPromptResult.enrichmentLevel,
        qualityScore: enrichmentQuality.score,
        factors: enrichmentQuality.factors,
        contextUsed: enrichedPromptResult.contextUsed,
      },
      scrapeError,
    };

    console.log('\n=== DEEP DIAL COMPLETE ===');
    console.log('Final response includes deepDial metadata');

    // Save to history
    if (response.ok) {
      try {
        // Generate title from first 50 chars of original prompt
        const title = userGoal.length > 50
          ? userGoal.substring(0, 50) + '...'
          : userGoal;

        const [savedResult] = await db.insert(dialResults).values({
          userId,
          title,
          originalPrompt: userGoal,
          synthesizedPrompt: response.synthesized_prompt || null,
          finalAnswer: response.final_answer || null,
          model: 'claude-sonnet-4-20250514',
          isDeepDial: true,
          contextUrl,
          creditsUsed: DEEP_DIAL_CREDIT_COST,
        }).returning();

        // Add history ID to response
        response.historyId = savedResult.id;
        console.log('Saved deep dial result to history:', savedResult.id);
      } catch (saveError) {
        console.error('Failed to save deep dial result to history:', saveError);
        // Don't fail the request if save fails
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Deep Dial error:', error);
    return NextResponse.json(
      {
        error: 'Deep Dial optimization failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
