/**
 * SafeHTML Component - XSS-Safe HTML Renderer
 * 
 * 🔒 SECURITY: Use this component instead of raw dangerouslySetInnerHTML
 * for rendering any HTML that may contain user-generated content.
 * 
 * @example
 * // Instead of:
 * <div dangerouslySetInnerHTML={{ __html: userContent }} />
 * 
 * // Use:
 * <SafeHTML html={userContent} className="my-class" />
 */
import sanitizeHtml from 'sanitize-html';

// 🔒 sanitize-html 安全配置
const DEFAULT_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 
    'code', 'pre', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'hr', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    '*': ['class', 'id'],
  },
  disallowedTagsMode: 'discard',
};

const STRICT_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
  allowedAttributes: { '*': ['class'] },
  disallowedTagsMode: 'discard',
};

interface SafeHTMLProps {
  /** Raw HTML string to sanitize and render */
  html: string;
  /** Optional CSS class name */
  className?: string;
  /** Optional: Use stricter config (text only - no links) */
  strictMode?: boolean;
}

/**
 * Safely render HTML content with XSS protection
 */
export function SafeHTML({ html, className, strictMode = false }: SafeHTMLProps) {
  const config = strictMode ? STRICT_CONFIG : DEFAULT_CONFIG;
  const sanitizedHtml = sanitizeHtml(html || '', config);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
}

/**
 * Sanitize HTML string without rendering (for API responses or storage)
 */
export function sanitizeHtmlString(html: string, strictMode = false): string {
  const config = strictMode ? STRICT_CONFIG : DEFAULT_CONFIG;
  return sanitizeHtml(html || '', config);
}

export default SafeHTML;

