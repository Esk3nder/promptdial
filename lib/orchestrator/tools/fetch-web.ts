import { ToolResponse } from '../types';

export async function fetchWebTool(
  url: string,
  timeout: number = 5000
): Promise<ToolResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Use existing Firecrawl integration if available, otherwise fallback to fetch
    const response = await fetchWithFirecrawl(url, controller.signal);
    
    clearTimeout(timeoutId);

    if (response.success) {
      return {
        ok: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        ok: false,
        error: response.error || 'Failed to fetch content',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return {
        ok: false,
        error: `Request timeout after ${timeout}ms`,
        timestamp: new Date().toISOString()
      };
    }

    return {
      ok: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };
  }
}

async function fetchWithFirecrawl(
  url: string,
  signal: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // First, try using the Firecrawl API if configured
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    
    if (firecrawlKey) {
      const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          waitFor: 2000,
        }),
        signal
      });

      if (firecrawlResponse.ok) {
        const data = await firecrawlResponse.json();
        return {
          success: true,
          data: {
            url,
            title: data.metadata?.title,
            description: data.metadata?.description,
            content: data.markdown || data.content,
            html: data.html,
            metadata: data.metadata,
            fetchedAt: new Date().toISOString()
          }
        };
      }
    }

    // Fallback to regular fetch
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PromptDial/1.0 (Orchestrator)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const contentType = response.headers.get('content-type');
    let content;

    if (contentType?.includes('application/json')) {
      content = await response.json();
    } else {
      content = await response.text();
      // Basic HTML to text conversion
      content = stripHtml(content);
    }

    return {
      success: true,
      data: {
        url,
        content,
        contentType,
        fetchedAt: new Date().toISOString()
      }
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

function stripHtml(html: string): string {
  // Basic HTML stripping - in production, use a proper HTML parser
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000); // Limit content length
}