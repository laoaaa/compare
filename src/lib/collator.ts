import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';
import type { CollationResult, DiffSegment, DiffType, SentenceResult } from './types';

// Initialize DMP
const dmp = new diff_match_patch();

// Text segmentation (Simple regex based splitting for Chinese/English)
export function segmentText(text: string): string[] {
  // Split by common sentence terminators, keeping the delimiter
  // 。！？.!?\n
  // Using a lookbehind logic or capture group to keep delimiter
  return text.split(/([。！？.!?\n]+)/).reduce((acc, curr, i) => {
    if (i % 2 === 0) {
      if (curr.trim().length > 0) acc.push(curr);
    } else {
      if (acc.length > 0) acc[acc.length - 1] += curr;
    }
    return acc;
  }, [] as string[]);
}

// Levenshtein distance for similarity ratio
function getSimilarity(s1: string, s2: string): number {
  const diffs = dmp.diff_main(s1, s2);
  dmp.diff_cleanupSemantic(diffs);
  const levenshtein = dmp.diff_levenshtein(diffs);
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  return 1.0 - levenshtein / maxLength;
}

// Core Collation Logic
export function collateTexts(baseText: string, compareText: string): CollationResult {
  const baseSentences = segmentText(baseText);
  const compareSentences = segmentText(compareText);
  const results: SentenceResult[] = [];
  
  let compareCursor = 0;
  const LOOKAHEAD_LIMIT = 5; // Look ahead 5 sentences
  
  const stats = {
    totalSentences: baseSentences.length,
    matchCount: 0,
    missingCount: 0,
    extraCount: 0,
    errorCounts: {
      'equal': 0,
      'delete': 0, // 脱
      'insert': 0, // 衍
      'substitute': 0, // 讹
      'reorder': 0, // 倒
      'disorder': 0, // 错乱
      'missing_sentence': 0,
      'extra_sentence': 0
    }
  };

  const usedCompareIndices = new Set<number>();

  for (let i = 0; i < baseSentences.length; i++) {
    const baseS = baseSentences[i];
    let bestMatchIndex = -1;
    let bestSimilarity = 0.4; // Threshold

    // Strategy 1: Look ahead
    for (let j = 0; j < LOOKAHEAD_LIMIT; j++) {
      const idx = compareCursor + j;
      if (idx >= compareSentences.length) break;
      if (usedCompareIndices.has(idx)) continue;

      const sim = getSimilarity(baseS, compareSentences[idx]);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatchIndex = idx;
      }
      // Exact match shortcut
      if (sim === 1.0) break;
    }

    // Strategy 2: Global scan (Loop) if not found nearby
    // Only if local scan failed completely
    if (bestMatchIndex === -1) {
       for (let k = 0; k < compareSentences.length; k++) {
         if (usedCompareIndices.has(k)) continue;
         // Optimization: Don't check too far if we have a huge text? 
         // For now, check all, but performance might suffer on massive texts.
         const sim = getSimilarity(baseS, compareSentences[k]);
         if (sim > 0.7) { // Higher threshold for random jump
           bestSimilarity = sim;
           bestMatchIndex = k;
           break; // Take first good match
         }
       }
    }

    if (bestMatchIndex !== -1) {
      // MATCH FOUND
      usedCompareIndices.add(bestMatchIndex);
      compareCursor = bestMatchIndex + 1; // Advance cursor
      
      const compareS = compareSentences[bestMatchIndex];
      const diffs = analyzeSentenceDiffs(baseS, compareS);
      
      // Update stats
      diffs.forEach(d => {
        if (d.type !== 'equal') stats.errorCounts[d.type]++;
      });
      stats.matchCount++;

      results.push({
        baseSentence: baseS,
        compareSentence: compareS,
        baseIndex: i,
        compareIndex: bestMatchIndex,
        diffs: diffs,
        status: 'match',
        similarity: bestSimilarity
      });

    } else {
      // NO MATCH -> 脱句 (Missing Sentence in Compare Text)
      // Or simply "Text 1 has it, Text 2 doesn't"
      stats.missingCount++;
      stats.errorCounts.missing_sentence++;
      results.push({
        baseSentence: baseS,
        compareSentence: "",
        baseIndex: i,
        compareIndex: -1,
        diffs: [{ type: 'missing_sentence', text: baseS, pos: 0 }],
        status: 'missing',
        similarity: 0
      });
    }
  }

  // Check for Extra Sentences in Compare Text (衍句)
  for (let k = 0; k < compareSentences.length; k++) {
    if (!usedCompareIndices.has(k)) {
      stats.extraCount++;
      stats.errorCounts.extra_sentence++;
      // We need to insert this into results? 
      // It's hard to place it correctly without a more complex alignment algorithm (like Needleman-Wunsch on sentences).
      // For now, we append them or try to insert them based on index?
      // Appending is safest for this simple logic.
      results.push({
        baseSentence: "",
        compareSentence: compareSentences[k],
        baseIndex: -1, // No base
        compareIndex: k,
        diffs: [{ type: 'extra_sentence', text: compareSentences[k], pos: 0 }],
        status: 'extra',
        similarity: 0
      });
    }
  }

  // Sort results by approximate position to keep flow?
  // If we append extras at end, it looks weird. 
  // Ideally we sort by compareIndex for extras, but baseIndex for others.
  // Let's rely on base order, and put extras where they fit best?
  // A simple sort:
  results.sort((a, b) => {
    // If both have baseIndex, sort by baseIndex
    if (a.baseIndex !== -1 && b.baseIndex !== -1) return a.baseIndex - b.baseIndex;
    // If one is extra (baseIndex -1)
    if (a.baseIndex === -1 && b.baseIndex !== -1) return a.compareIndex - b.compareIndex; // Rough guess
    if (a.baseIndex !== -1 && b.baseIndex === -1) return a.baseIndex - b.baseIndex;
    return a.compareIndex - b.compareIndex;
  });

  return { results, stats };
}

function analyzeSentenceDiffs(base: string, compare: string): DiffSegment[] {
  const diffs = dmp.diff_main(base, compare);
  dmp.diff_cleanupSemantic(diffs);

  const segments: DiffSegment[] = [];
  let pos = 0;

  for (let i = 0; i < diffs.length; i++) {
    const [op, text] = diffs[i];
    
    // Check for Substitution (訛): Delete followed by Insert
    if (op === DIFF_DELETE && i + 1 < diffs.length && diffs[i+1][0] === DIFF_INSERT) {
       const nextText = diffs[i+1][1];
       segments.push({
         type: 'substitute', // 訛
         text: nextText,
         originalText: text,
         pos: pos
       });
       i++; // Skip next
       pos += text.length;
       continue;
    }

    // Check for Disorder/Inversion (Need more complex lookahead? Keep it simple for now)
    // We treat Delete as 脱, Insert as 衍
    
    if (op === DIFF_EQUAL) {
      segments.push({ type: 'equal', text, pos });
      pos += text.length;
    } else if (op === DIFF_DELETE) {
      segments.push({ type: 'delete', text, pos }); // 脱
      pos += text.length;
    } else if (op === DIFF_INSERT) {
      segments.push({ type: 'insert', text, pos }); // 衍
      // Pos doesn't advance on base text for insert
    }
  }
  
  return segments;
}
