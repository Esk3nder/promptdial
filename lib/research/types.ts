// Types for the Research module (used for Deep Dial feature)

export interface ScrapedData {
  title: string;
  description: string;
  keywords: string[];
  mainContent: string;
  mainProducts?: string[];
  competitors?: string[];
  ogImage?: string;
  favicon?: string;
}

export interface Company {
  id: string;
  url: string;
  name: string;
  description: string;
  industry: string;
  logo?: string;
  favicon?: string;
  scraped: boolean;
  scrapedData?: ScrapedData;
}

export interface ResearchResult {
  company: Company;
  enrichedData?: {
    competitors?: string[];
    marketInsights?: string[];
    keywords?: string[];
  };
  timestamp: string;
}
