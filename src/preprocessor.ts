/**
 * Markdown Preprocessor
 * Validates and fixes common markdown formatting issues before conversion
 */

export interface PreprocessResult {
  markdown: string;
  fixes: string[];
  warnings: string[];
}

/**
 * Preprocess markdown to fix common formatting issues
 */
export function preprocessMarkdown(markdown: string): PreprocessResult {
  const fixes: string[] = [];
  const warnings: string[] = [];
  let processed = markdown;

  // Fix 0: Handle escaped asterisks that should be formatting
  // Remove backslash escapes from formatting markers if they appear to be bold/italic intent
  const escapedBoldPattern = /\\?\*\\?\*\s*([^*]+?)\s*\\?\*\\?\*/g;
  processed = processed.replace(escapedBoldPattern, (match, content) => {
    // Check if this looks like it should be bold (has escaped asterisks)
    if (match.includes('\\*')) {
      fixes.push(`Fixed escaped bold markers: "${match}" → "**${content.trim()}**"`);
      return `**${content.trim()}**`;
    }
    return match;
  });

  // Fix 1: Normalize bold formatting (**text** or __text__)
  // But preserve intentional bold markers that should remain as text (like **A:** in Q&A)
  // Remove spaces immediately after opening markers and before closing markers
  const originalBold = processed;
  
  // First, fix bold URLs by removing the bold markers
  // URLs should not be bold, especially in headings
  processed = processed.replace(/\*\*(https?:\/\/[^\*\s]+)\*\*/g, '$1');
  
  // Track if we fixed any bold URLs
  if (processed !== originalBold) {
    fixes.push('Removed bold formatting from URLs');
  }
  
  // Then protect URLs from further processing
  const urlPattern = /(https?:\/\/[^\s*]+)/g;
  const protectedUrls: string[] = [];
  let urlIndex = 0;
  processed = processed.replace(urlPattern, (match) => {
    protectedUrls.push(match);
    return `__URL_PLACEHOLDER_${urlIndex++}__`;
  });
  
  // Disabled: These aggressive patterns were causing cross-line matching issues
  // The marked.js parser handles most bold formatting correctly
  // Only specific patterns (like CAUTION) are handled in Fix 11 below
  
  // Restore protected URLs
  processed = processed.replace(/__URL_PLACEHOLDER_(\d+)__/g, (match, index) => {
    return protectedUrls[parseInt(index)];
  });

  // Fix 2: Normalize italic formatting (*text* or _text_)
  // Only match within single line
  processed = processed.replace(/(?<!\*)\* +([^*\n]+?) +\*(?!\*)/g, (match, content) => {
    fixes.push(`Fixed italic formatting with spaces: "${content}"`);
    return `*${content.trim()}*`;
  });
  processed = processed.replace(/(?<!\*)\* +([^*\n]+?)\*(?!\*)/g, (match, content) => {
    fixes.push(`Fixed italic formatting with leading space: "${content}"`);
    return `*${content.trim()}*`;
  });
  processed = processed.replace(/(?<!\*)\*([^*\n]+?) +\*(?!\*)/g, (match, content) => {
    fixes.push(`Fixed italic formatting with trailing space: "${content}"`);
    return `*${content.trim()}*`;
  });

  // Fix 3: Normalize strikethrough formatting (~~text~~)
  // Only match within single line
  processed = processed.replace(/~~ +([^~\n]+?) +~~/g, (match, content) => {
    fixes.push(`Fixed strikethrough formatting with spaces: "${content}"`);
    return `~~${content.trim()}~~`;
  });

  // Fix 4: Normalize inline code formatting (`text`)
  // Only fix if there are spaces AND the content is not intentionally spaced
  processed = processed.replace(/`\s+([^`]+?)\s+`/g, (match, content) => {
    // Check if the content has intentional spacing (e.g., command with args)
    if (content.trim().includes(' ')) {
      return match; // Keep as is if content has spaces
    }
    fixes.push(`Fixed inline code formatting with extra spaces: "${match}"`);
    return `\`${content.trim()}\``;
  });

  // Fix 5: Ensure proper spacing around headers and fix nested headers
  const lines = processed.split('\n');
  const fixedLines: string[] = [];
  let lastHeaderLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if it's a header
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+.+/);
    if (headerMatch) {
      const currentLevel = headerMatch[1].length;
      
      // Ensure there's blank line before header (unless it's the first line)
      if (i > 0 && fixedLines[fixedLines.length - 1].trim() !== '') {
        fixedLines.push('');
        if (!fixes.some(f => f.includes('Added blank line before header'))) {
          fixes.push(`Added blank line before header`);
        }
      }
      
      // Check for improper heading hierarchy (e.g., h1 → h3 without h2)
      if (lastHeaderLevel > 0 && currentLevel > lastHeaderLevel + 1) {
        // Fix by adjusting the level to be one level deeper than previous
        const fixedLevel = lastHeaderLevel + 1;
        const fixedLine = '#'.repeat(fixedLevel) + trimmedLine.substring(currentLevel);
        fixes.push(`Fixed heading hierarchy: h${currentLevel} after h${lastHeaderLevel} → h${fixedLevel}`);
        fixedLines.push(fixedLine);
        lastHeaderLevel = fixedLevel;
      } else {
        fixedLines.push(line);
        lastHeaderLevel = currentLevel;
      }
    } else {
      fixedLines.push(line);
      // Don't reset lastHeaderLevel to preserve hierarchy context
    }
  }
  
  processed = fixedLines.join('\n');

  // Fix 6: Remove excessive blank lines (more than 2 consecutive)
  const originalLineCount = processed.split('\n').length;
  processed = processed.replace(/\n{4,}/g, '\n\n\n');
  if (processed.split('\n').length !== originalLineCount) {
    fixes.push('Removed excessive blank lines (reduced to max 2 consecutive)');
  }

  // Fix 7: Handle literal asterisks in text (outside code blocks)
  // This catches patterns like "**text**" that appear in normal text but aren't being rendered
  // Split by code blocks to avoid modifying code
  const codeBlockPattern = /```[\s\S]*?```|`[^`]+`/g;
  const codeBlocks: string[] = [];
  let codeBlockIndex = 0;
  
  // Temporarily replace code blocks with placeholders
  const withoutCodeBlocks = processed.replace(codeBlockPattern, (match) => {
    codeBlocks.push(match);
    return `__CODEBLOCK_${codeBlockIndex++}__`;
  });
  
  // Now fix any remaining literal asterisks patterns that should be formatting
  // This handles cases where markdown isn't being parsed correctly
  let fixedText = withoutCodeBlocks;
  
  // Check for patterns that look like they should be bold but might not be rendering
  // Only if they're not already HTML tags
  const literalBoldPattern = /(?<!<[^>]*)(\*\*[A-Za-z][^*\n]{1,50}?\*\*)(?![^<]*>)/g;
  fixedText = fixedText.replace(literalBoldPattern, (match) => {
    // Check if this is already being processed by markdown (has proper spacing)
    if (/^\*\*[^\s*].*[^\s*]\*\*$/.test(match)) {
      // It's properly formatted, leave it alone
      return match;
    }
    return match;
  });
  
  // Restore code blocks
  processed = fixedText.replace(/__CODEBLOCK_(\d+)__/g, (match, index) => {
    return codeBlocks[parseInt(index)];
  });

  // Fix 8: Ensure code blocks have proper spacing
  processed = processed.replace(/([^\n])\n```/g, (match, before) => {
    if (!fixes.includes('Added blank line before code block')) {
      fixes.push('Added blank line before code block');
    }
    return `${before}\n\n\`\`\``;
  });
  processed = processed.replace(/```\n([^\n])/g, (match, after) => {
    if (!fixes.includes('Added blank line after code block')) {
      fixes.push('Added blank line after code block');
    }
    return `\`\`\`\n\n${after}`;
  });

  // Fix 9: Fix missing spaces between words (common OCR/paste issue)
  // Look for patterns like "areofficial" or "testedand"
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2'); // camelCase to separate words
  
  // Fix common concatenated words - be more aggressive
  const commonConcatenations: Array<[RegExp, string]> = [
    // "are tested" variations
    [/\bare(tested|verified|official)/gi, 'are $1'],
    // "tested and" variations  
    [/\b(tested|verified)and\b/gi, '$1 and'],
    // "Most are" variations
    [/\bMost\s*are(official|tested)/gi, 'Most are $1'],
    // "reports Internal" - add proper spacing and line break
    [/\breports\s*(Internal|External)/gi, 'reports\n\n$1'],
    // "systems.---" - add proper spacing
    [/systems\.\s*---/g, 'systems.\n\n---'],
    // Generic word concatenation patterns (lowercase followed by capital)
    [/\b([a-z]{3,})([A-Z][a-z]{2,})/g, '$1 $2'],
  ];
  
  commonConcatenations.forEach(([pattern, replacement]) => {
    const before = processed;
    processed = processed.replace(pattern, replacement);
    if (before !== processed) {
      fixes.push(`Fixed concatenated words: ${pattern.toString()}`);
    }
  });
  
  // Fix 10: Normalize list formatting
  // Ensure proper spacing in unordered lists
  processed = processed.replace(/^([*+-])\s{2,}/gm, '$1 ');
  
  // Fix 11: Ensure proper line breaks for warnings and notices
  // Fix patterns like "- **⚠️ CAUTION:** text" in bullet lists
  // Handle both cases: with closing ** and without (unbalanced)
  
  // Case 1: Properly closed bold "- **⚠️ CAUTION:** text"  
  processed = processed.replace(/^(\s*[-*+]\s+)\*\*(⚠️|⚡|✅|❌|🔒|💡|📊|🎯)\s*([A-Z]+(?:\s+[A-Z]+)*):\*\*\s+(.+)$/gm, 
    '$1**$2 $3:**\n  $4');
  
  // Case 2: Unclosed bold "- **⚠️ CAUTION: text" - add closing ** and split
  processed = processed.replace(/^(\s*[-*+]\s+)\*\*(⚠️|⚡|✅|❌|🔒|💡|📊|🎯)\s*([A-Z]+(?:\s+[A-Z]+)*):(?!\*)\s+(.+)$/gm, 
    '$1**$2 $3:**\n  $4');
  
  // Fix patterns like "Remember:" at start of line to be bold if not already
  // Match "Remember: " but not "**Remember:**" (already bold)
  processed = processed.replace(/^(?!\*\*)(Remember|Note|Important|Warning|Caution):\s+/gm, '**$1:** ');
  
  // Warnings: Detect potential issues that can't be auto-fixed
  
  // Warn about unclosed bold markers
  const boldOpeners = (processed.match(/\*\*/g) || []).length;
  if (boldOpeners % 2 !== 0) {
    warnings.push('⚠️  Unbalanced bold markers (**) detected. Please check your markdown.');
  }
  
  // Warn about unclosed italic markers
  const italicOpeners = (processed.match(/(?<!\*)\*(?!\*)/g) || []).length;
  if (italicOpeners % 2 !== 0) {
    warnings.push('⚠️  Unbalanced italic markers (*) detected. Please check your markdown.');
  }
  
  // Warn about unclosed code markers
  const codeOpeners = (processed.match(/`/g) || []).length;
  if (codeOpeners % 2 !== 0) {
    warnings.push('⚠️  Unbalanced inline code markers (`) detected. Please check your markdown.');
  }

  // Warn about potential escaped markers that might be intended
  if (processed.includes('\\*\\*') || processed.includes('\\*')) {
    warnings.push('ℹ️  Escaped formatting markers detected. If you want actual formatting, remove the backslashes.');
  }

  return {
    markdown: processed,
    fixes,
    warnings,
  };
}

/**
 * Validate markdown for common issues
 */
export function validateMarkdown(markdown: string): string[] {
  const issues: string[] = [];
  
  // Check for extremely long lines (potential formatting issue)
  const lines = markdown.split('\n');
  lines.forEach((line, index) => {
    if (line.length > 500 && !line.startsWith('```')) {
      issues.push(`Line ${index + 1} is very long (${line.length} chars). Consider adding line breaks.`);
    }
  });
  
  // Check for nested formatting (can cause rendering issues)
  if (/\*\*[^*]*\*[^*]*\*[^*]*\*\*/.test(markdown)) {
    issues.push('Nested bold and italic formatting detected. This may render unexpectedly.');
  }
  
  return issues;
}

export default preprocessMarkdown;

