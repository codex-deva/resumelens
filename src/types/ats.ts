export interface AtsAnalysisMeta {
  fileName: string;
  totalPages: number;
  extractedChars: number;
}

export interface AtsAnalysisResult {
  atsScore: number;
  scoreSummary: string;
  matchingSkills: string[];
  missingSkillsAndKeywords: string[];
  actionableSuggestions: string[];
  meta?: AtsAnalysisMeta;
}

export interface DeliverablesPayload {
  appPy: string;
  requirementsTxt: string;
}
