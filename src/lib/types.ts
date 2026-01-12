export type DiffType = 'equal' | 'delete' | 'insert' | 'substitute' | 'reorder' | 'disorder' | 'missing_sentence' | 'extra_sentence';

export interface DiffSegment {
  type: DiffType;
  text: string; // The text content
  originalText?: string; // For substitution/corruption, the original text
  pos: number; // Position in original string (for jumping)
}

export interface SentenceResult {
  baseSentence: string;
  compareSentence: string;
  baseIndex: number;
  compareIndex: number;
  diffs: DiffSegment[]; // Detailed character-level diffs
  status: 'match' | 'missing' | 'extra' | 'low_confidence';
  similarity: number;
}

export interface CollationResult {
  results: SentenceResult[];
  stats: {
    totalSentences: number;
    matchCount: number;
    missingCount: number; // 脱句
    extraCount: number; // 衍句
    errorCounts: Record<DiffType, number>;
  };
}
