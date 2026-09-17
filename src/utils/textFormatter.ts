/**
 * Markdown text formatting utilities
 * Removes markdown syntax while preserving content readability
 */

/**
 * Sanitize markdown formatting from text
 * - Removes ** bold markers but keeps content
 * - Converts ### headers to plain text
 * - Converts • bullets to plain text bullets
 * - Removes excess spacing/newlines
 * - Preserves readability
 */
export function sanitizeMarkdown(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // Remove markdown bold markers (**text** -> text)
  sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '$1');

  // Remove markdown italic markers (*text* -> text)
  sanitized = sanitized.replace(/\*(.*?)\*/g, '$1');

  // Remove markdown code markers (`code` -> code)
  sanitized = sanitized.replace(/`([^`]+)`/g, '$1');

  // Convert ### headers to plain text (remove leading ###)
  sanitized = sanitized.replace(/^###\s+/gm, '');

  // Convert #### headers to plain text
  sanitized = sanitized.replace(/^####\s+/gm, '');

  // Convert ## headers to plain text
  sanitized = sanitized.replace(/^##\s+/gm, '');

  // Convert # headers to plain text
  sanitized = sanitized.replace(/^#\s+/gm, '');

  // Keep bullet points but clean them up (• and - and * bullets)
  // Already in plain text format, just ensure consistency
  sanitized = sanitized.replace(/^[\s]*[-*]\s+/gm, '• ');

  // Remove markdown link syntax [text](url) -> text
  sanitized = sanitized.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // Remove blockquote markers (> text -> text)
  sanitized = sanitized.replace(/^>\s+/gm, '');

  // Remove horizontal rules (---, ***, ___)
  sanitized = sanitized.replace(/^[-*_]{3,}$/gm, '');

  // Remove extra blank lines (more than 2 consecutive newlines)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Remove leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Convert HTML entities back to normal characters
 * Used when LLM output contains escaped HTML
 */
export function unescapeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&nbsp;': ' ',
  };

  return text.replace(/&[a-z]+;/gi, (match) => map[match] || match);
}

/**
 * Extract main text content from LLM response
 * Useful when LLM includes extra metadata or formatting
 */
export function extractMainContent(text: string): string {
  // Remove code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, '');

  // Remove inline code references that are just notation
  cleaned = cleaned.replace(/`[A-Z_]+`/g, (match) => match.slice(1, -1));

  // Remove multiple markdown formatting layers
  cleaned = sanitizeMarkdown(cleaned);

  return cleaned.trim();
}

/**
 * Format text for console/log output
 * Removes all markdown and special formatting
 */
export function stripAllFormatting(text: string): string {
  let stripped = text;

  // Remove all markdown markers
  stripped = stripped.replace(/[*_`#\[\]()]/g, '');

  // Remove arrow operators and special symbols used in markdown
  stripped = stripped.replace(/[-→←↑↓]/g, '');

  // Normalize whitespace
  stripped = stripped.replace(/\s+/g, ' ').trim();

  return stripped;
}

/**
 * Split text into paragraphs, preserving logical sections
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Limit text to a maximum number of characters with ellipsis
 */
export function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Count words in text (useful for token estimation)
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
