/**
 * Markdown to PDF Converter
 * Uses Puppeteer for high-quality PDF generation
 * Supports Mermaid diagrams, syntax highlighting, and more
 */

import puppeteer, { Browser, PaperFormat } from "puppeteer";
import { Marked } from "marked";
import hljs from "highlight.js";
import { getStyles, getMermaidStyles } from "./styles.js";
import * as fs from "fs";
import * as path from "path";

export interface ConvertOptions {
  markdown: string;
  outputPath: string;
  paperFormat?: PaperFormat;
  paperOrientation?: "portrait" | "landscape";
  margin?: string;
  watermark?: string;
  watermarkScope?: "all-pages" | "first-page";
  showPageNumbers?: boolean;
  headerText?: string;
  footerText?: string;
  codeTheme?: "light" | "dark";
  customCss?: string;
}

export interface ConvertResult {
  success: boolean;
  outputPath: string;
  pageCount?: number;
  contentSize?: number;
  lineCount?: number;
  processingTimeMs?: number;
  hasMermaidDiagrams?: boolean;
  error?: string;
}

// Configure marked with syntax highlighting
const marked = new Marked({
  gfm: true,
  breaks: false,
});

// Custom renderer for syntax highlighting and Mermaid diagrams
marked.use({
  renderer: {
    code(token) {
      const text = token.text;
      const lang = token.lang?.toLowerCase();

      // Handle Mermaid diagrams - render as special div for client-side processing
      if (lang === "mermaid") {
        // Escape HTML in mermaid code to prevent XSS
        const escapedText = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
        return `<div class="mermaid">${escapedText}</div>`;
      }

      // Regular code blocks with syntax highlighting
      const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(text, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    },
    // Support for task lists
    listitem(token) {
      if (token.task) {
        const checkbox = token.checked
          ? '<input type="checkbox" checked disabled>'
          : '<input type="checkbox" disabled>';
        return `<li class="task-list-item">${checkbox} ${token.text}</li>\n`;
      }
      return `<li>${token.text}</li>\n`;
    },
  },
});

/**
 * Check if markdown contains mermaid diagrams
 */
function hasMermaidDiagrams(markdown: string): boolean {
  return /```mermaid/i.test(markdown);
}

/**
 * Convert Markdown content to PDF
 */
export async function convertMarkdownToPdf(
  options: ConvertOptions
): Promise<ConvertResult> {
  const {
    markdown,
    outputPath,
    paperFormat = "letter",
    paperOrientation = "portrait",
    margin = "2cm",
    watermark,
    watermarkScope = "all-pages",
    showPageNumbers = false,
    headerText,
    footerText,
    codeTheme = "light",
    customCss,
  } = options;

  let browser: Browser | null = null;
  const startTime = Date.now();

  try {
    // Validate input
    if (!markdown || markdown.trim().length === 0) {
      return {
        success: false,
        outputPath,
        error: "Markdown content is empty",
      };
    }

    // Check file size (10MB limit)
    const contentSize = Buffer.byteLength(markdown, "utf8");
    if (contentSize > 10 * 1024 * 1024) {
      return {
        success: false,
        outputPath,
        error: "Markdown content exceeds 10MB limit",
      };
    }

    const lineCount = markdown.split("\n").length;
    const containsMermaid = hasMermaidDiagrams(markdown);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Convert markdown to HTML
    const htmlContent = await marked.parse(markdown);

    // Generate full HTML document
    const fullHtml = generateHtmlDocument(htmlContent, {
      watermark,
      watermarkScope,
      codeTheme,
      includeMermaid: containsMermaid,
      customCss,
    });

    // Calculate timeout based on content size (dynamic scaling)
    // Base: 30s, scale with lines (up to 5 min for very large files)
    const baseTimeout = 30000;
    const additionalTimeout = Math.min(lineCount * 10, 270000);
    // Add extra time for mermaid rendering
    const mermaidTimeout = containsMermaid ? 30000 : 0;
    const timeout = baseTimeout + additionalTimeout + mermaidTimeout;

    // Launch browser with enhanced memory settings (4GB)
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
        // 4GB memory limit for large documents
        "--max-old-space-size=4096",
        "--js-flags=--max-old-space-size=4096",
        // Additional stability flags
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--no-first-run",
      ],
    });

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2,
    });

    // Set content with extended timeout for large files
    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout,
    });

    // Wait for fonts to load
    await page.evaluateHandle("document.fonts.ready");

    // If content has mermaid diagrams, wait for them to render
    if (containsMermaid) {
      try {
        // Wait for mermaid to initialize and render
        await page.waitForFunction(
          () => {
            const mermaidDivs = document.querySelectorAll(".mermaid");
            if (mermaidDivs.length === 0) return true;
            // Check if all mermaid divs have been processed (contain SVG)
            return Array.from(mermaidDivs).every(
              (div) => div.querySelector("svg") !== null || div.classList.contains("mermaid-error")
            );
          },
          { timeout: 30000 }
        );
      } catch {
        // Mermaid rendering timeout - continue anyway, errors will show in PDF
        console.error("Mermaid rendering timed out, continuing with available content");
      }
    }

    // Build footer template
    let footerTemplate = "";
    if (showPageNumbers || footerText) {
      footerTemplate = `
        <div style="font-size: 9px; width: 100%; padding: 0 20px; display: flex; justify-content: space-between; color: #666; font-family: 'IBM Plex Serif', serif;">
          <span>${footerText || ""}</span>
          ${showPageNumbers ? '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>' : ""}
        </div>
      `;
    }

    // Build header template
    let headerTemplate = "";
    if (headerText) {
      headerTemplate = `
        <div style="font-size: 9px; width: 100%; padding: 0 20px; text-align: center; color: #666; font-family: 'IBM Plex Serif', serif;">
          ${headerText}
        </div>
      `;
    }

    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: paperFormat,
      landscape: paperOrientation === "landscape",
      margin: {
        top: margin,
        right: margin,
        bottom: margin,
        left: margin,
      },
      printBackground: true,
      displayHeaderFooter: !!(showPageNumbers || headerText || footerText),
      headerTemplate: headerTemplate || "<span></span>",
      footerTemplate: footerTemplate || "<span></span>",
      timeout,
    });

    // Get page count (re-read the PDF to count pages)
    const pdfBuffer = fs.readFileSync(outputPath);
    const pageCount = countPdfPages(pdfBuffer);

    const processingTimeMs = Date.now() - startTime;

    return {
      success: true,
      outputPath,
      pageCount,
      contentSize,
      lineCount,
      processingTimeMs,
      hasMermaidDiagrams: containsMermaid,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      outputPath,
      error: errorMessage,
      processingTimeMs: Date.now() - startTime,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate complete HTML document with styles
 */
function generateHtmlDocument(
  content: string,
  options: {
    watermark?: string;
    watermarkScope?: "all-pages" | "first-page";
    codeTheme?: "light" | "dark";
    includeMermaid?: boolean;
    customCss?: string;
  }
): string {
  const {
    watermark,
    watermarkScope = "all-pages",
    codeTheme = "light",
    includeMermaid = false,
    customCss,
  } = options;

  const styles = getStyles({ codeTheme });
  const mermaidStyles = includeMermaid ? getMermaidStyles() : "";

  let watermarkHtml = "";
  if (watermark) {
    const sanitizedWatermark = watermark.substring(0, 15).toUpperCase();
    watermarkHtml = `<div class="watermark${watermarkScope === "first-page" ? " first-page-only" : ""}">${sanitizedWatermark}</div>`;
  }

  // Mermaid script for diagram rendering
  const mermaidScript = includeMermaid
    ? `
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        mermaid.initialize({
          startOnLoad: true,
          theme: '${codeTheme === "dark" ? "dark" : "default"}',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: {
            useMaxWidth: true,
            wrap: true
          },
          gantt: {
            useMaxWidth: true
          }
        });
        
        // Handle mermaid errors gracefully
        mermaid.parseError = function(err, hash) {
          console.error('Mermaid parse error:', err);
        };
      });
    </script>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
  ${mermaidStyles ? `<style>${mermaidStyles}</style>` : ""}
  ${customCss ? `<style>/* Custom User CSS */\n${customCss}</style>` : ""}
  ${watermarkScope === "first-page" ? `
  <style>
    .watermark.first-page-only {
      position: absolute;
      top: 30%;
    }
    @media print {
      .watermark.first-page-only {
        position: absolute;
      }
    }
  </style>
  ` : ""}
  ${mermaidScript}
</head>
<body>
  ${watermarkHtml}
  <div class="content">
    ${content}
  </div>
</body>
</html>
`;
}

/**
 * Count pages in a PDF buffer (simple heuristic)
 */
function countPdfPages(buffer: Buffer): number {
  const str = buffer.toString("binary");
  const matches = str.match(/\/Type[\s]*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

/**
 * Generate unique filename if file exists
 */
export function getUniqueFilename(filepath: string): string {
  if (!fs.existsSync(filepath)) {
    return filepath;
  }

  const dir = path.dirname(filepath);
  const ext = path.extname(filepath);
  const base = path.basename(filepath, ext);

  let counter = 1;
  let newPath = filepath;

  while (fs.existsSync(newPath)) {
    newPath = path.join(dir, `${base}-${counter}${ext}`);
    counter++;
  }

  return newPath;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

export default convertMarkdownToPdf;
