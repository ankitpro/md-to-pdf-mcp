/**
 * CSS Styles for PDF generation
 * Modern, clean styling for rendered Markdown documents
 */

export const getStyles = (options: {
  fontFamily?: string;
  fontSize?: string;
  codeTheme?: "light" | "dark";
}): string => {
  const {
    fontFamily = "'IBM Plex Serif', 'Crimson Pro', Georgia, serif",
    fontSize = "11pt",
    codeTheme = "light",
  } = options;

  const codeBackground = codeTheme === "dark" ? "#1e1e1e" : "#f6f8fa";
  const codeColor = codeTheme === "dark" ? "#d4d4d4" : "#24292e";

  return `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;600&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap');

* {
  box-sizing: border-box;
}

html {
  font-size: ${fontSize};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  font-family: ${fontFamily};
  line-height: 1.7;
  color: #1a1a1a;
  max-width: 100%;
  margin: 0;
  padding: 0;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: 'IBM Plex Serif', 'Crimson Pro', Georgia, serif;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.8em;
  margin-bottom: 0.6em;
  color: #0f0f0f;
  page-break-after: avoid;
}

h1 {
  font-size: 2.2rem;
  font-weight: 700;
  border-bottom: 2px solid #e74c3c;
  padding-bottom: 0.4em;
  margin-top: 0;
}

h2 {
  font-size: 1.65rem;
  font-weight: 600;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 0.3em;
}

h3 {
  font-size: 1.35rem;
}

h4 {
  font-size: 1.15rem;
}

h5, h6 {
  font-size: 1rem;
  color: #444;
}

/* Paragraphs */
p {
  margin: 0 0 1.2em 0;
  orphans: 3;
  widows: 3;
}

/* Links */
a {
  color: #2563eb;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

a:hover {
  border-bottom-color: #2563eb;
}

/* Lists */
ul, ol {
  margin: 0 0 1.2em 0;
  padding-left: 1.8em;
}

ul ul, ol ol, ul ol, ol ul {
  margin-bottom: 0;
}

li {
  margin-bottom: 0.4em;
}

li > p {
  margin-bottom: 0.4em;
}

/* Task Lists */
ul.task-list {
  list-style: none;
  padding-left: 0;
}

ul.task-list li {
  position: relative;
  padding-left: 1.8em;
}

ul.task-list input[type="checkbox"] {
  position: absolute;
  left: 0;
  top: 0.35em;
  width: 1em;
  height: 1em;
}

/* Code */
code {
  font-family: 'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.88em;
  background: ${codeBackground};
  color: ${codeColor};
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

pre {
  font-family: 'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  background: ${codeBackground};
  color: ${codeColor};
  padding: 1.2em 1.4em;
  border-radius: 8px;
  overflow-x: auto;
  line-height: 1.5;
  margin: 0 0 1.4em 0;
  border: 1px solid ${codeTheme === "dark" ? "#333" : "#e1e4e8"};
}

pre code {
  background: transparent;
  padding: 0;
  font-size: inherit;
  color: inherit;
  border-radius: 0;
}

/* Blockquotes */
blockquote {
  margin: 0 0 1.4em 0;
  padding: 0.8em 1.2em;
  border-left: 4px solid #e74c3c;
  background: #fdf6f5;
  color: #444;
  font-style: italic;
}

blockquote p:last-child {
  margin-bottom: 0;
}

blockquote blockquote {
  margin-top: 0.8em;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1.4em 0;
  font-size: 0.95em;
  page-break-inside: avoid;
}

th, td {
  padding: 0.7em 1em;
  text-align: left;
  border: 1px solid #ddd;
}

th {
  background: #f8f9fa;
  font-weight: 600;
  color: #1a1a1a;
}

tr:nth-child(even) {
  background: #fafbfc;
}

/* Horizontal Rule */
hr {
  border: none;
  height: 2px;
  background: linear-gradient(to right, #e74c3c, #f39c12, #27ae60);
  margin: 2em 0;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.4em auto;
  border-radius: 6px;
}

/* Definition Lists */
dl {
  margin: 0 0 1.2em 0;
}

dt {
  font-weight: 600;
  margin-top: 0.8em;
}

dd {
  margin-left: 1.4em;
  margin-bottom: 0.4em;
}

/* Highlighting */
mark {
  background: #fff3cd;
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

/* Superscript/Subscript */
sup, sub {
  font-size: 0.75em;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sup {
  top: -0.5em;
}

sub {
  bottom: -0.25em;
}

/* Keyboard */
kbd {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85em;
  padding: 0.15em 0.5em;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}

/* Abbreviation */
abbr[title] {
  text-decoration: underline dotted;
  cursor: help;
}

/* Print Optimizations */
@media print {
  body {
    font-size: 11pt;
  }
  
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
  }
  
  pre, blockquote, table, figure {
    page-break-inside: avoid;
  }
  
  a {
    color: #2563eb;
  }
}

/* Syntax Highlighting - GitHub Style */
.hljs-comment,
.hljs-quote {
  color: #6a737d;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-addition {
  color: #d73a49;
}

.hljs-number,
.hljs-string,
.hljs-meta .hljs-meta-string,
.hljs-literal,
.hljs-doctag,
.hljs-regexp {
  color: #032f62;
}

.hljs-title,
.hljs-section,
.hljs-name,
.hljs-selector-id,
.hljs-selector-class {
  color: #6f42c1;
}

.hljs-attribute,
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-class .hljs-title,
.hljs-type {
  color: #005cc5;
}

.hljs-symbol,
.hljs-bullet,
.hljs-subst,
.hljs-meta,
.hljs-meta .hljs-keyword,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-link {
  color: #e36209;
}

.hljs-built_in,
.hljs-deletion {
  color: #22863a;
}

.hljs-formula {
  background: #f0fff4;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}

/* Watermark */
.watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 6rem;
  font-weight: 700;
  color: rgba(231, 76, 60, 0.08);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  font-family: 'IBM Plex Serif', serif;
}
`;
};

/**
 * Get Mermaid-specific styles
 */
export const getMermaidStyles = (): string => {
  return `
/* Mermaid Diagram Styles */
.mermaid {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1.5em 0;
  padding: 1em;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #e1e4e8;
  page-break-inside: avoid;
  overflow: visible;
}

.mermaid svg {
  max-width: 100%;
  height: auto;
}

/* Mermaid error styling */
.mermaid-error {
  background: #fff5f5;
  border-color: #fed7d7;
  color: #c53030;
  padding: 1em;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85em;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Flowchart specific */
.mermaid .flowchart-link {
  stroke: #666;
}

.mermaid .node rect,
.mermaid .node circle,
.mermaid .node ellipse,
.mermaid .node polygon,
.mermaid .node path {
  stroke-width: 1.5px;
}

/* Sequence diagram specific */
.mermaid .actor {
  stroke: #666;
  fill: #f4f4f4;
}

.mermaid .actor-line {
  stroke: #666;
}

.mermaid .messageLine0,
.mermaid .messageLine1 {
  stroke: #333;
}

/* Gantt chart specific */
.mermaid .section {
  stroke: none;
}

.mermaid .task {
  stroke-width: 1.5px;
}

/* Pie chart specific */
.mermaid .pieCircle {
  stroke: white;
  stroke-width: 2px;
}

/* Class diagram specific */
.mermaid .classGroup .title {
  font-weight: 600;
}

/* State diagram specific */
.mermaid .stateGroup .state-title {
  font-weight: 600;
}

/* Entity Relationship diagram specific */
.mermaid .er.entityBox {
  fill: #f4f4f4;
  stroke: #666;
}

/* Git graph specific */
.mermaid .commit-label {
  font-size: 0.8em;
}

/* Print optimizations for mermaid */
@media print {
  .mermaid {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .mermaid svg {
    max-width: 100% !important;
  }
}
`;
};

export default getStyles;
