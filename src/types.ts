export interface SimulatedContentSection {
  heading: string;
  content: string;
}

export interface SimulatedLink {
  text: string;
  url: string;
  category?: string;
}

export interface SimulatedImage {
  url: string;
  caption: string;
}

export interface SimulatedPageMetadata {
  author?: string;
  publishDate?: string;
  readingTime: string;
  siteName: string;
  siteIcon: string;
  language: string;
}

export interface SimulatedPageAnalysis {
  summary: string;
  keyTakeaways: string[];
  credibilityScore: number;
  sentiment: string;
  biasReport: string;
}

export interface SimulatedPage {
  url: string;
  title: string;
  description: string;
  headline: string;
  sections: SimulatedContentSection[];
  links: SimulatedLink[];
  images?: SimulatedImage[];
  metadata: SimulatedPageMetadata;
  suggestedQuestions: string[];
  analysis: SimulatedPageAnalysis;
}

export interface OrganicSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResultsPage {
  query: string;
  quickAnswer?: string;
  results: OrganicSearchResult[];
  relatedSearches: string[];
}

export type TabType = 'home' | 'search' | 'page';

export interface Tab {
  id: string;
  title: string;
  url: string;
  type: TabType;
  history: { url: string; type: TabType; title: string }[];
  forwardHistory: { url: string; type: TabType; title: string }[];
  pageContent: SimulatedPage | null;
  searchContent: SearchResultsPage | null;
  isLoading: boolean;
  error: string | null;
  chatHistory: { role: 'user' | 'model'; text: string }[];
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  siteName: string;
  siteIcon?: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  timestamp: string;
  type: TabType;
}
