#!/usr/bin/env node
/**
 * MD to PDF MCP Server
 * 
 * An MCP server for converting Markdown documents to beautifully styled PDF files.
 * Features syntax highlighting, Mermaid diagrams, custom styling, watermarks, and page numbers.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { PaperFormat } from "puppeteer";
import { convertMarkdownToPdf, getUniqueFilename, formatBytes, formatDuration } from "./converter.js";
import * as path from "path";
import * as os from "os";

// Environment configuration
const OUTPUT_DIR = process.env.MD2PDF_OUTPUT_DIR || os.homedir();
const VERBOSE = process.env.MD2PDF_VERBOSE === "true";

function log(message: string): void {
  if (VERBOSE) {
    console.error(`[md-to-pdf-mcp] ${message}`);
  }
}

// Paper formats supported by Puppeteer
const PAPER_FORMATS: PaperFormat[] = [
  "letter",
  "legal",
  "tabloid",
  "ledger",
  "a0",
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
];

// Create MCP server
const server = new Server(
  {
    name: "md-to-pdf-mcp",
    version: "1.3.3",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "convert_markdown_to_pdf",
        description:
          "Convert Markdown content to a beautifully styled PDF document. Supports syntax highlighting for code blocks, Mermaid diagrams (flowcharts, sequence diagrams, etc.), tables, task lists, blockquotes, and more. Output includes page numbers and optional watermarks.",
        inputSchema: {
          type: "object",
          properties: {
            markdown: {
              type: "string",
              description: "The Markdown content to convert to PDF. Supports standard Markdown, GFM tables, task lists, and Mermaid diagrams (```mermaid code blocks).",
            },
            outputFilename: {
              type: "string",
              description:
                "Filename for the output PDF (e.g., 'document.pdf'). Defaults to 'output.pdf'",
            },
            paperFormat: {
              type: "string",
              enum: PAPER_FORMATS,
              description:
                "Paper format for the PDF. Defaults to 'letter'. Options: letter, legal, tabloid, ledger, a0-a6",
            },
            paperOrientation: {
              type: "string",
              enum: ["portrait", "landscape"],
              description: "Page orientation. Defaults to 'portrait'",
            },
            margin: {
              type: "string",
              description:
                "Page margins in CSS units (e.g., '2cm', '1in', '20mm'). Defaults to '2cm'",
            },
            watermark: {
              type: "string",
              description:
                "Optional watermark text to display on pages (max 15 characters, will be uppercased)",
            },
            watermarkScope: {
              type: "string",
              enum: ["all-pages", "first-page"],
              description:
                "Where to display the watermark. Defaults to 'all-pages'",
            },
            showPageNumbers: {
              type: "boolean",
              description:
                "Whether to show page numbers in the footer. Defaults to false",
            },
            headerText: {
              type: "string",
              description: "Optional text to display in the page header",
            },
            footerText: {
              type: "string",
              description:
                "Optional text to display in the footer (left side, opposite page numbers)",
            },
            codeTheme: {
              type: "string",
              enum: ["light", "dark"],
              description:
                "Color theme for code blocks and Mermaid diagrams. Defaults to 'light'",
            },
            customCss: {
              type: "string",
              description:
                "Optional custom CSS to apply to the PDF. Will be injected after default styles, allowing you to override or extend the styling.",
            },
            skipPreprocessing: {
              type: "boolean",
              description:
                "Skip automatic markdown preprocessing and validation. By default, the tool fixes common formatting issues (e.g., spaces in bold/italic markers). Set to true to disable this.",
            },
          },
          required: ["markdown"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "convert_markdown_to_pdf") {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }

  const args = request.params.arguments as {
    markdown: string;
    outputFilename?: string;
    paperFormat?: string;
    paperOrientation?: string;
    margin?: string;
    watermark?: string;
    watermarkScope?: string;
    showPageNumbers?: boolean;
    headerText?: string;
    footerText?: string;
    codeTheme?: string;
    customCss?: string;
    skipPreprocessing?: boolean;
  };

  // Validate required parameters
  if (!args.markdown || typeof args.markdown !== "string") {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing or invalid 'markdown' parameter"
    );
  }

  // Validate paper format
  const paperFormat = (args.paperFormat || "letter") as PaperFormat;
  if (args.paperFormat && !PAPER_FORMATS.includes(paperFormat)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid paper format. Must be one of: ${PAPER_FORMATS.join(", ")}`
    );
  }

  // Validate orientation
  const paperOrientation = args.paperOrientation || "portrait";
  if (!["portrait", "landscape"].includes(paperOrientation)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Invalid paper orientation. Must be 'portrait' or 'landscape'"
    );
  }

  // Validate watermark scope
  const watermarkScope = args.watermarkScope || "all-pages";
  if (!["all-pages", "first-page"].includes(watermarkScope)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Invalid watermark scope. Must be 'all-pages' or 'first-page'"
    );
  }

  // Validate code theme
  const codeTheme = args.codeTheme || "light";
  if (!["light", "dark"].includes(codeTheme)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Invalid code theme. Must be 'light' or 'dark'"
    );
  }

  // Determine output path
  const filename = args.outputFilename || "output.pdf";
  const sanitizedFilename = filename.endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;
  const outputPath = getUniqueFilename(path.join(OUTPUT_DIR, sanitizedFilename));

  // Calculate content stats for progress tracking
  const contentSize = Buffer.byteLength(args.markdown, "utf8");
  const lineCount = args.markdown.split("\n").length;

  log(`Converting markdown to PDF: ${outputPath}`);
  log(`Content size: ${formatBytes(contentSize)}`);
  log(`Line count: ${lineCount}`);

  // Warn about large files
  if (lineCount > 1300) {
    log(`⚠️ Large file detected (${lineCount} lines). Processing may take longer.`);
  }

  try {
    const result = await convertMarkdownToPdf({
      markdown: args.markdown,
      outputPath,
      paperFormat,
      paperOrientation: paperOrientation as "portrait" | "landscape",
      margin: args.margin || "2cm",
      watermark: args.watermark,
      watermarkScope: watermarkScope as "all-pages" | "first-page",
      showPageNumbers: args.showPageNumbers ?? false,
      headerText: args.headerText,
      footerText: args.footerText,
      codeTheme: codeTheme as "light" | "dark",
      customCss: args.customCss,
      skipPreprocessing: args.skipPreprocessing ?? false,
    });

    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to convert markdown to PDF: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    // Build success message with progress info
    const successMessage = [
      `✅ Successfully created PDF`,
      ``,
      `📄 **Output:** ${result.outputPath}`,
      `📊 **Pages:** ${result.pageCount || "Unknown"}`,
      `📐 **Format:** ${paperFormat} (${paperOrientation})`,
    ];

    // Add progress tracking info
    if (result.contentSize) {
      successMessage.push(`📦 **Size:** ${formatBytes(result.contentSize)} (${result.lineCount} lines)`);
    }

    if (result.processingTimeMs) {
      successMessage.push(`⏱️ **Processing Time:** ${formatDuration(result.processingTimeMs)}`);
    }

    if (result.hasMermaidDiagrams) {
      successMessage.push(`📈 **Mermaid Diagrams:** Rendered`);
    }

    if (args.watermark) {
      successMessage.push(
        `💧 **Watermark:** "${args.watermark.substring(0, 15).toUpperCase()}" (${watermarkScope})`
      );
    }

    if (args.showPageNumbers) {
      successMessage.push(`🔢 **Page Numbers:** Enabled`);
    }

    // Add preprocessing results
    if (result.preprocessingFixes && result.preprocessingFixes.length > 0) {
      successMessage.push(``);
      successMessage.push(`🔧 **Markdown Fixes Applied:**`);
      result.preprocessingFixes.forEach(fix => {
        successMessage.push(`   • ${fix}`);
      });
    }

    if (result.preprocessingWarnings && result.preprocessingWarnings.length > 0) {
      successMessage.push(``);
      successMessage.push(`⚠️ **Warnings:**`);
      result.preprocessingWarnings.forEach(warning => {
        successMessage.push(`   • ${warning}`);
      });
    }

    return {
      content: [
        {
          type: "text",
          text: successMessage.join("\n"),
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    log(`Error: ${errorMessage}`);
    return {
      content: [
        {
          type: "text",
          text: `❌ Error converting markdown to PDF: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("MD to PDF MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
