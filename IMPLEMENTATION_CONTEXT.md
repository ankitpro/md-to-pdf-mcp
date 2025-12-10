# Implementation Context: Custom CSS Feature + Publishing

## 📋 Task Summary
Add custom CSS styling feature to `md-to-pdf-mcp` to achieve complete feature parity with `2b3pro/markdown2pdf-mcp`, then publish version 1.2.0 to Git and npm.

## 🎯 Background
We compared `md-to-pdf-mcp` with `2b3pro/markdown2pdf-mcp` and found that the only missing feature is **Custom CSS Styling**. All other features are already implemented:
- ✅ Syntax highlighting for code blocks
- ✅ Mermaid diagram rendering
- ✅ Optional page numbers
- ✅ Watermarking (configurable scope)
- ✅ Headers and footers
- ✅ Code themes (light/dark)
- ❌ Custom CSS styling (MISSING - needs to be added)

---

## 🔧 Implementation Steps

### Step 1: Update `src/index.ts`

#### Change 1.1: Bump version (line ~51)
**Find:**
```typescript
const server = new Server(
  {
    name: "md-to-pdf-mcp",
    version: "1.1.0",
  },
```

**Replace with:**
```typescript
const server = new Server(
  {
    name: "md-to-pdf-mcp",
    version: "1.2.0",
  },
```

#### Change 1.2: Add customCss to inputSchema (line ~126, after codeTheme property)
**Find:**
```typescript
            codeTheme: {
              type: "string",
              enum: ["light", "dark"],
              description:
                "Color theme for code blocks and Mermaid diagrams. Defaults to 'light'",
            },
          },
          required: ["markdown"],
```

**Replace with:**
```typescript
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
          },
          required: ["markdown"],
```

#### Change 1.3: Add customCss to args type (line ~155)
**Find:**
```typescript
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
  };
```

**Replace with:**
```typescript
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
  };
```

#### Change 1.4: Pass customCss to converter (line ~234)
**Find:**
```typescript
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
    });
```

**Replace with:**
```typescript
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
    });
```

---

### Step 2: Update `src/converter.ts`

#### Change 2.1: Add customCss to ConvertOptions interface (line ~25)
**Find:**
```typescript
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
}
```

**Replace with:**
```typescript
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
```

#### Change 2.2: Add customCss to destructuring (line ~106)
**Find:**
```typescript
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
  } = options;
```

**Replace with:**
```typescript
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
```

#### Change 2.3: Pass customCss to generateHtmlDocument (line ~145)
**Find:**
```typescript
    // Generate full HTML document
    const fullHtml = generateHtmlDocument(htmlContent, {
      watermark,
      watermarkScope,
      codeTheme,
      includeMermaid: containsMermaid,
    });
```

**Replace with:**
```typescript
    // Generate full HTML document
    const fullHtml = generateHtmlDocument(htmlContent, {
      watermark,
      watermarkScope,
      codeTheme,
      includeMermaid: containsMermaid,
      customCss,
    });
```

#### Change 2.4: Update generateHtmlDocument function signature (line ~294)
**Find:**
```typescript
function generateHtmlDocument(
  content: string,
  options: {
    watermark?: string;
    watermarkScope?: "all-pages" | "first-page";
    codeTheme?: "light" | "dark";
    includeMermaid?: boolean;
  }
): string {
```

**Replace with:**
```typescript
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
```

#### Change 2.5: Add customCss to options destructuring (line ~303)
**Find:**
```typescript
  const {
    watermark,
    watermarkScope = "all-pages",
    codeTheme = "light",
    includeMermaid = false,
  } = options;
```

**Replace with:**
```typescript
  const {
    watermark,
    watermarkScope = "all-pages",
    codeTheme = "light",
    includeMermaid = false,
    customCss,
  } = options;
```

#### Change 2.6: Inject customCss into HTML (line ~358, after styles)
**Find:**
```typescript
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
  ${mermaidStyles ? `<style>${mermaidStyles}</style>` : ""}
  ${watermarkScope === "first-page" ? `
```

**Replace with:**
```typescript
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
  ${mermaidStyles ? `<style>${mermaidStyles}</style>` : ""}
  ${customCss ? `<style>/* Custom User CSS */\n${customCss}</style>` : ""}
  ${watermarkScope === "first-page" ? `
```

---

### Step 3: Update `package.json`

#### Change 3.1: Bump version (line 3)
**Find:**
```json
  "version": "1.1.0",
```

**Replace with:**
```json
  "version": "1.2.0",
```

---

### Step 4: Update `README.md`

#### Change 4.1: Add to features list (after line 64, after Code Themes)
**Find:**
```markdown
- 🌙 **Code Themes** - Light and dark themes for code blocks
- 🚀 **Large File Support** - 4GB memory allocation with dynamic timeouts
```

**Replace with:**
```markdown
- 🌙 **Code Themes** - Light and dark themes for code blocks
- 🎨 **Custom CSS Styling** - Inject your own CSS for complete customization
- 🚀 **Large File Support** - 4GB memory allocation with dynamic timeouts
```

#### Change 4.2: Add to tool reference table (after line 198, after codeTheme row)
**Find:**
```markdown
|| `codeTheme` | string | ❌ | `light` | light or dark code theme |

## ⚙️ Environment Variables
```

**Replace with:**
```markdown
|| `codeTheme` | string | ❌ | `light` | light or dark code theme |
|| `customCss` | string | ❌ | - | Custom CSS to apply to PDF |

## ⚙️ Environment Variables
```

#### Change 4.3: Add usage example (after line 139, after Professional Report section)
**Find:**
```markdown
## Executive Summary
...
```
---

## 📖 Supported Markdown Features
```

**Replace with:**
```markdown
## Executive Summary
...
```

### Custom Styling

```
Generate a PDF with custom CSS styling:

Content:
# Styled Document

Custom CSS:
```css
h1 { color: #2c3e50; border-bottom: 3px solid #3498db; }
p { font-size: 12pt; line-height: 1.8; }
code { background: #fffacd; color: #d63384; }
```
```

---

## 📖 Supported Markdown Features
```

---

## 📦 Build, Commit, and Publish Steps

### Step 5: Build the project
```bash
cd /Users/aagarwal/Documents/Projects/Chamberlain/Github/md-to-pdf-mcp
npm run build
```

### Step 6: Commit to Git
```bash
git add .
git commit -m "feat: add custom CSS styling support for complete feature parity

- Add customCss parameter to tool schema
- Inject custom CSS after default styles in HTML generation
- Update documentation with new feature and usage example
- Bump version to 1.2.0

This completes feature parity with 2b3pro/markdown2pdf-mcp"
```

### Step 7: Push to Git
```bash
git push origin main
```
(Or replace `main` with your default branch name if different)

### Step 8: Publish to npm
```bash
npm publish
```

---

## ✅ Verification Checklist

After implementation, verify:
- [ ] `src/index.ts` version is 1.2.0 (line 51)
- [ ] `package.json` version is 1.2.0 (line 3)
- [ ] `customCss` parameter added to tool schema
- [ ] `customCss` parameter passed through all function calls
- [ ] Custom CSS injected into HTML after default styles
- [ ] README updated with custom CSS feature and example
- [ ] Project builds successfully (`npm run build`)
- [ ] Git commit created with descriptive message
- [ ] Changes pushed to remote repository
- [ ] Package published to npm registry

---

## 🎯 Expected Result

Version 1.2.0 will have:
- ✅ Complete feature parity with `2b3pro/markdown2pdf-mcp`
- ✅ Custom CSS styling support
- ✅ All existing features maintained
- ✅ Backward compatible (customCss is optional)
- ✅ Published to npm and Git

---

## 📝 Notes

- Custom CSS is injected **after** default styles, allowing users to override any default styling
- The feature is **optional** - existing users won't be affected
- Custom CSS should be valid CSS syntax
- No sanitization is applied - users are responsible for CSS content

