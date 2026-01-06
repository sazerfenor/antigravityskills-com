/**
 * Simple Keyword Extractor (Fallback)
 * Text-based keyword extraction without AI
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'with', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may',
  'might', 'must', 'can', 'of', 'from', 'by', 'about', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'this', 'that', 'these', 'those', 'very', 'really', 'just', 'only',
  'ultra', 'highly', 'extremely',
]);

const KEYWORD_WEIGHTS: Record<string, number> = {
  // High-weight words (visual subjects)
  woman: 10, man: 10, girl: 10, boy: 10, portrait: 10, face: 10,
  landscape: 10, cityscape: 10, character: 10, person: 10,
  
  // Medium-weight words (styles)
  realistic: 5, cyberpunk: 5, fantasy: 5, anime: 5, comic: 5,
  watercolor: 5, painting: 5, illustration: 5, photo: 5,
  cinematic: 5, dramatic: 5, minimalist: 5,
  
  // Subject descriptors
  chinese: 8, japanese: 8, korean: 8, american: 8, european: 8,
  young: 3, old: 3, beautiful: 2, handsome: 2,
  
  // Visual elements
  dress: 6, hair: 6, eyes: 6, light: 6, lighting: 6,
  background: 5, color: 4, style: 3,
  
  // Technical/quality terms (lower weight, often redundant)
  resolution: 1, quality: 1, masterpiece: 1, stunning: 1,
  amazing: 1, gorgeous: 1,
};

/**
 * Extract keywords using simple text analysis
 * @param prompt - The AI image generation prompt
 * @returns Comma-separated keywords
 */
export function extractKeywordsSimple(prompt: string): string {
  // 1. Tokenize
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  
  // 2. Calculate word frequency
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    const count = wordFreq.get(word) || 0;
    wordFreq.set(word, count + 1);
  });
  
  // 3. Score words (frequency * weight)
  const scoredWords = Array.from(wordFreq.entries())
    .map(([word, freq]) => ({
      word,
      score: freq * (KEYWORD_WEIGHTS[word] || 1),
    }))
    .sort((a, b) => b.score - a.score);
  
  // 4. Take top 5-7 keywords
  const topKeywords = scoredWords
    .slice(0, 7)
    .map(item => item.word)
    .join(', ');
  
  return topKeywords;
}

/**
 * Extract keywords as array
 * @param prompt - The AI image generation prompt
 * @returns Array of keywords
 */
export function extractKeywordsArray(prompt: string): string[] {
  const keywords = extractKeywordsSimple(prompt);
  return keywords.split(', ').filter(Boolean);
}
