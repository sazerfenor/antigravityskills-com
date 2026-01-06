// Server-side Markdown renderer for database posts
// 🚨 SECURITY: XSS Protection via html:false + sanitize-html
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// 🚨 安全配置：禁用原始 HTML 解析
const md = new MarkdownIt({
  html: false,        // 🔒 关键修复：禁止渲染原始 HTML，防止 XSS
  linkify: true,
  breaks: true,
  typographer: true,
});

// Custom renderer for headings with IDs
md.renderer.rules.heading_open = function (tokens, idx) {
  const token = tokens[idx];
  const level = token.markup.length;
  const nextToken = tokens[idx + 1];

  if (nextToken && nextToken.type === 'inline') {
    const headingText = nextToken.content;
    const id = generateHeadingId(headingText);
    return `<h${level} id="${id}">`;
  }

  return `<h${level}>`;
};

// Custom renderer for links with nofollow
md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');

  if (hrefIndex >= 0) {
    const href = token.attrGet('href');
    // Add nofollow to all links
    token.attrSet('rel', 'nofollow noopener noreferrer');
    // Add target="_blank" for external links
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      token.attrSet('target', '_blank');
    }
  }

  return renderer.renderToken(tokens, idx, options);
};

// 🔒 sanitize-html 安全配置：只允许基本标签
const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 
    'code', 'pre', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    '*': ['class', 'id'],
  },
  disallowedTagsMode: 'discard',
};

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Server-side Markdown renderer with XSS protection
 * 
 * Security measures:
 * 1. html: false - Prevents raw HTML injection
 * 2. sanitize-html - Secondary sanitization layer (SSR compatible)
 * 3. Whitelist-only tags and attributes
 */
export function MarkdownContent({ content, className = 'markdown-body' }: MarkdownContentProps) {
  // Step 1: Render Markdown (with html disabled)
  const rawHtml = content ? md.render(content) : '';
  
  // Step 2: Sanitize HTML (double protection against parser vulnerabilities)
  const sanitizedHtml = sanitizeHtml(rawHtml, SANITIZE_CONFIG);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
}


