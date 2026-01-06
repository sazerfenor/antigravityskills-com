/**
 * Smart SEO Keyword Extractor
 * Reusable AI-powered keyword and prompt analysis service
 * Can be used for: SEO slug generation, prompt optimization, metadata extraction
 */

// TODO: 根据你的平台名称自定义此提示词
const SMART_SEO_EXTRACTION_PROMPT = `
# Role
You are an expert AI SEO Specialist for an AI Art platform. Your goal is to analyze raw image prompts and generate metadata that captures the specific "User Search Intent".

# Task
Analyze the provided [User Prompt]. Extract the core essence to create a Searchable Title and a Keyword List.

# Analysis Rules
1. **Identify the Format (Crucial):** Is this a "Photobook Layout", "Comic Strip", "3D Figurine Mockup", "Quote Card", "Icon", or just a "Portrait"? This is the most important keyword.
2. **Handle Variables:** If you see code like \`{argument name="author" default="Steve Jobs"}\`, IGNORE the code syntax but EXTRACT the meaningful content (e.g., "Steve Jobs", "Quote").
3. **Specific Style over Generic:** 
   - BAD: "drawing", "art", "colorful"
   - GOOD: "ink wash painting", "thick-pencil doodle", "fujifilm pro 400h", "chiaroscuro lighting"
4. **Subject & Context:** Who is the main subject and where are they?
5. **Long-tail Logic:** Combine words to form search phrases users actually type (e.g., "Japanese photobook layout" is better than just "Japanese" and "book").

# Output Format (JSON)
Return a single valid JSON object with no markdown formatting:
{
  "page_title": "A human-readable, click-worthy title (5-8 words). e.g., 'Japanese 9-Grid Photobook Layout Generator'",
  "seo_slug_keywords": "A comma-separated list of 4-6 hyphenated long-tail keywords for the URL. e.g., 'japanese-photobook-layout, 9-grid-portrait-template, fujifilm-film-style'",
  "category": "One of: [Photography, Illustration, Design/Mockup, Anime/Comic, Abstract]"
}

# User Prompt to Analyze:
{prompt}
`;

export interface SEOKeywordsResult {
  page_title: string;
  seo_slug_keywords: string;
  category: string;
}

/**
 * Extract SEO keywords using simple text analysis (always available fallback)
 * @param prompt - The AI image generation prompt
 * @returns Comma-separated hyphenated keywords for URL slug
 */
export async function extractSEOKeywords(prompt: string): Promise<string> {
  const cleanPrompt = prompt.slice(0, 1000);
  
  try {
    // TODO: Implement AI extraction via API call or admin-configured service
    // For now, use simple extraction as fallback
    console.log('[extractSEOKeywords] Using simple extraction (AI not yet configured)');
    const { extractKeywordsSimple } = await import('./simple-keyword-extractor');
    return extractKeywordsSimple(cleanPrompt);
    
  } catch (error) {
    console.error('[extractSEOKeywords] Extraction failed:', error);
    const { extractKeywordsSimple } = await import('./simple-keyword-extractor');
    return extractKeywordsSimple(prompt);
  }
}

/**
 * Extract full SEO metadata (for future use)
 * @param prompt - The AI image generation prompt
 * @returns Full SEO metadata object
 */
export async function extractSEOMetadata(prompt: string): Promise<SEOKeywordsResult> {
  const cleanPrompt = prompt.slice(0, 1000);
  
  try {
    const { extractKeywordsSimple } = await import('./simple-keyword-extractor');
    const keywords = extractKeywordsSimple(cleanPrompt);
    
    return {
      page_title: 'AI Generated Image',
      seo_slug_keywords: keywords,
      category: 'Abstract',
    };
  } catch (error) {
    console.error('[extractSEOMetadata] Extraction failed:', error);
    const { extractKeywordsSimple } = await import('./simple-keyword-extractor');
    const keywords = extractKeywordsSimple(prompt);
    
    return {
      page_title: 'AI Generated Image',
      seo_slug_keywords: keywords,
      category: 'Abstract',
    };
  }
}
