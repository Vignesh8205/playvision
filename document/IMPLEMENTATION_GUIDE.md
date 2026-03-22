# PlayVision Reporter - Complete Implementation Guide

**Start Date:** When you're ready to begin  
**Estimated Duration:** 5-7 days with AI assistance  
**AI Integration:** Hugging Face Transformers (offline, free)

---

## 📋 Pre-Development Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn package manager
- [ ] TypeScript knowledge (basic)
- [ ] Git for version control
- [ ] Code editor (VS Code recommended)
- [ ] A sample Playwright project for testing

---

## 🚀 Phase 1: Project Setup (Day 1 - Morning)

### Step 1.1: Initialize Project

```bash
# Navigate to project directory
cd c:\Users\Admin\Desktop\playvision

# Initialize npm project
npm init -y

# Install TypeScript and build tools
npm install -D typescript @types/node ts-node
npm install -D @playwright/test

# Initialize TypeScript
npx tsc --init
```

### Step 1.2: Configure TypeScript

Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.3: Create Folder Structure

```bash
# Create directory structure
mkdir -p src/core
mkdir -p src/collector
mkdir -p src/html
mkdir -p src/ai
mkdir -p src/schema
mkdir -p src/utils
mkdir -p ui
mkdir -p test-project
```

### Step 1.4: Update package.json

```json
{
  "name": "playvision-reporter",
  "version": "1.0.0",
  "description": "AI-powered HTML reporter for Playwright",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "npm run build && cd test-project && npx playwright test"
  },
  "keywords": ["playwright", "reporter", "testing", "ai", "html-report"],
  "author": "Your Name",
  "license": "MIT"
}
```

**✅ Checkpoint:** Run `npm run build` - should compile without errors.

---

## 📐 Phase 2: Define Schemas & Types (Day 1 - Afternoon)

### Step 2.1: Create Type Definitions

Create `src/schema/types.ts`:

```typescript
export interface PlayVisionConfig {
  outputFolder: string;
  screenshots: boolean;
  videos: 'on' | 'off' | 'retain-on-failure';
  aiAnalysis: boolean;
  aiMode?: 'basic' | 'smart' | 'premium';
  exportPdf?: boolean;
  exportExcel?: boolean;
}

export interface TestResult {
  testId: string;
  title: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky';
  startTime: number;
  endTime: number;
  duration: number;
  retries: number;
  steps: TestStep[];
  attachments: Attachment[];
  error?: ErrorDetails;
}

export interface TestStep {
  name: string;
  category: string;
  startTime: number;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
}

export interface Attachment {
  name: string;
  type: 'screenshot' | 'video' | 'trace';
  path: string;
  contentType: string;
}

export interface ErrorDetails {
  message: string;
  stack: string;
  aiAnalysis?: AIAnalysis;
}

export interface AIAnalysis {
  category: string;
  confidence: number;
  rootCause: string;
  suggestion: string;
  fixExample?: string;
}

export interface ReportMetadata {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  workers: number;
  startTime: number;
  endTime: number;
}
```

**✅ Checkpoint:** TypeScript should compile without errors.

---

## 🔧 Phase 3: Build Core Reporter Engine (Day 2-3)

### Step 3.1: Create Reporter Class

Create `src/core/reporter.ts`:

```typescript
import { Reporter, TestCase, TestResult as PWTestResult, FullConfig, Suite } from '@playwright/test/reporter';
import { PlayVisionConfig, TestResult, ReportMetadata } from '../schema/types';
import { EventCollector } from '../collector/event-collector';
import { AssetCollector } from '../collector/asset-collector';
import { DataSerializer } from './serializer';
import { HTMLRenderer } from '../html/renderer';

import { ExportManager } from './export-manager';

export class PlayVisionReporter implements Reporter {
  private config: PlayVisionConfig;
  private eventCollector: EventCollector;
  private assetCollector: AssetCollector;
  private serializer: DataSerializer;
  private htmlRenderer: HTMLRenderer;
  private exportManager: ExportManager;
  private metadata: ReportMetadata;

  constructor(options: Partial<PlayVisionConfig> = {}) {
    this.config = {
      outputFolder: options.outputFolder || 'playvision-report',
      screenshots: options.screenshots ?? true,
      videos: options.videos || 'retain-on-failure',
      aiAnalysis: options.aiAnalysis ?? true,
      aiMode: options.aiMode || 'smart',
      exportPdf: options.exportPdf ?? false,
      exportExcel: options.exportExcel ?? false
    };

    this.eventCollector = new EventCollector(this.config.aiMode as any, this.config.aiAnalysis);
    this.assetCollector = new AssetCollector(this.config.outputFolder);
    this.serializer = new DataSerializer(this.config.outputFolder);
    this.htmlRenderer = new HTMLRenderer(this.config.outputFolder);
    this.exportManager = new ExportManager(this.config.outputFolder, this.config);
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      duration: 0,
      workers: 0,
      startTime: 0,
      endTime: 0
    };
  }

  onBegin(config: FullConfig, suite: Suite) {
    console.log('🎬 PlayVision Reporter started');
    this.metadata.startTime = Date.now();
    this.metadata.workers = config.workers;
    this.assetCollector.initialize();
  }

  onTestBegin(test: TestCase) {
    this.eventCollector.startTest(test);
  }

  onTestEnd(test: TestCase, result: PWTestResult) {
    this.eventCollector.endTest(test, result);
    this.updateMetadata(result);
    
    // Collect assets for failed tests
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.assetCollector.collectAssets(test, result);
    }
  }

  async onEnd() {
    this.metadata.endTime = Date.now();
    this.metadata.duration = this.metadata.endTime - this.metadata.startTime;

    console.log('📊 Generating PlayVision Report...');

    // Get all test results
    const results = this.eventCollector.getResults();

    // Serialize to JSON
    await this.serializer.writeResults(results, this.metadata);

    // Generate HTML
    await this.htmlRenderer.generate(results, this.metadata);

    // Export to other formats
    await this.exportManager.export(results, this.metadata);

    console.log(`✅ Report generated: ${this.config.outputFolder}/index.html`);
  }

  private updateMetadata(result: PWTestResult) {
    this.metadata.totalTests++;
    
    if (result.status === 'passed') this.metadata.passed++;
    else if (result.status === 'failed') this.metadata.failed++;
    else if (result.status === 'skipped') this.metadata.skipped++;
    
    if (result.retry > 0 && result.status === 'passed') {
      this.metadata.flaky++;
    }
  }
}

export default PlayVisionReporter;
```

### Step 3.2: Create Event Collector

Create `src/collector/event-collector.ts`:

```typescript
import { TestCase, TestResult as PWTestResult } from '@playwright/test/reporter';
import { TestResult, TestStep } from '../schema/types';
import { AIErrorAnalyzer } from '../ai/analyzer';

export class EventCollector {
  private results: Map<string, TestResult> = new Map();
  private aiAnalyzer: AIErrorAnalyzer;

  constructor() {
    this.aiAnalyzer = new AIErrorAnalyzer();
  }

  startTest(test: TestCase) {
    const testId = this.getTestId(test);
    
    this.results.set(testId, {
      testId,
      title: test.title,
      suite: test.parent.title,
      status: 'passed',
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      retries: 0,
      steps: [],
      attachments: []
    });
  }

  async endTest(test: TestCase, result: PWTestResult) {
    const testId = this.getTestId(test);
    const testResult = this.results.get(testId);
    
    if (!testResult) return;

    testResult.endTime = Date.now();
    testResult.duration = result.duration;
    testResult.status = result.status as any;
    testResult.retries = result.retry;

    // Collect steps
    testResult.steps = this.extractSteps(result);

    // Analyze errors with AI
    if (result.error) {
      const aiAnalysis = await this.aiAnalyzer.analyze(result.error);
      
      testResult.error = {
        message: result.error.message || '',
        stack: result.error.stack || '',
        aiAnalysis
      };
    }
  }

  getResults(): TestResult[] {
    return Array.from(this.results.values());
  }

  private getTestId(test: TestCase): string {
    return `${test.parent.title}-${test.title}`.replace(/\s+/g, '-');
  }

  private extractSteps(result: PWTestResult): TestStep[] {
    const steps: TestStep[] = [];
    
    result.steps.forEach(step => {
      steps.push({
        name: step.title,
        category: step.category,
        startTime: step.startTime.getTime(),
        duration: step.duration,
        status: step.error ? 'failed' : 'passed',
        error: step.error?.message
      });
    });

    return steps;
  }
}
```

**✅ Checkpoint:** Code should compile. We'll implement AI analyzer next.

---

## 🤖 Phase 4: Implement AI Error Analyzer (Day 3)

### Step 4.1: Install Hugging Face Transformers

```bash
npm install @huggingface/transformers
```

### Step 4.2: Create AI Analyzer

Create `src/ai/analyzer.ts`:

```typescript
import { pipeline, ZeroShotClassificationPipeline } from '@huggingface/transformers';
import { AIAnalysis } from '../schema/types';

export class AIErrorAnalyzer {
  private classifier: ZeroShotClassificationPipeline | null = null;
  private initialized = false;

  private readonly ERROR_CATEGORIES = [
    'Locator Not Found',
    'Timeout Error',
    'Assertion Failure',
    'Network Error',
    'Visibility Issue',
    'Unknown Error'
  ];

  private readonly SUGGESTIONS: Record<string, string> = {
    'Locator Not Found': 'Check if the selector is correct. Consider using getByRole(), getByTestId(), or getByText() for more reliable locators.',
    'Timeout Error': 'Increase the timeout value or add explicit wait conditions using waitFor() before interactions.',
    'Assertion Failure': 'Review the expected vs actual values. Ensure the assertion logic matches the test requirements.',
    'Network Error': 'Check network connectivity, API endpoints, or mock network requests in tests.',
    'Visibility Issue': 'Element may be hidden or obscured. Use waitForSelector() with visible: true or check CSS properties.',
    'Unknown Error': 'Review the error stack trace for more details. Consider adding debug logs.'
  };

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🤖 Initializing AI Error Analyzer...');
      this.classifier = await pipeline(
        'zero-shot-classification',
        'Xenova/distilbert-base-uncased-mnli'
      );
      this.initialized = true;
      console.log('✅ AI Analyzer ready');
    } catch (error) {
      console.warn('⚠️  AI Analyzer failed to initialize, falling back to rule-based');
      this.initialized = false;
    }
  }

  async analyze(error: Error): Promise<AIAnalysis> {
    const errorMessage = error.message || error.toString();

    // Try AI classification first
    if (this.classifier) {
      try {
        const result = await this.classifier(errorMessage, this.ERROR_CATEGORIES);
        const category = result.labels[0];
        const confidence = result.scores[0];

        return {
          category,
          confidence,
          rootCause: this.extractRootCause(errorMessage, category),
          suggestion: this.SUGGESTIONS[category] || this.SUGGESTIONS['Unknown Error'],
          fixExample: this.getFixExample(category)
        };
      } catch (err) {
        console.warn('AI classification failed, using rule-based fallback');
      }
    }

    // Fallback to rule-based classification
    return this.ruleBasedAnalysis(errorMessage);
  }

  private ruleBasedAnalysis(errorMessage: string): AIAnalysis {
    const patterns: Record<string, RegExp> = {
      'Locator Not Found': /locator.*not found|element.*not found|selector.*not found/i,
      'Timeout Error': /timeout.*exceeded|waiting.*timed out|timeout of \d+ms exceeded/i,
      'Assertion Failure': /expect.*to.*but.*received|assertion.*failed/i,
      'Network Error': /net::ERR|fetch failed|ECONNREFUSED|network error/i,
      'Visibility Issue': /not visible|hidden|obscured|element is not visible/i
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(errorMessage)) {
        return {
          category,
          confidence: 0.9,
          rootCause: this.extractRootCause(errorMessage, category),
          suggestion: this.SUGGESTIONS[category],
          fixExample: this.getFixExample(category)
        };
      }
    }

    return {
      category: 'Unknown Error',
      confidence: 0.5,
      rootCause: 'Unable to classify error automatically',
      suggestion: this.SUGGESTIONS['Unknown Error']
    };
  }

  private extractRootCause(errorMessage: string, category: string): string {
    // Extract selector from locator errors
    const selectorMatch = errorMessage.match(/selector\s+["']([^"']+)["']/i);
    if (selectorMatch && category === 'Locator Not Found') {
      return `Selector "${selectorMatch[1]}" could not be found in the DOM`;
    }

    // Extract timeout duration
    const timeoutMatch = errorMessage.match(/timeout of (\d+)ms/i);
    if (timeoutMatch && category === 'Timeout Error') {
      return `Operation exceeded timeout of ${timeoutMatch[1]}ms`;
    }

    return errorMessage.split('\n')[0]; // First line as root cause
  }

  private getFixExample(category: string): string | undefined {
    const examples: Record<string, string> = {
      'Locator Not Found': `await page.getByRole('button', { name: 'Submit' }).click();`,
      'Timeout Error': `await page.waitForSelector('.element', { timeout: 10000 });`,
      'Visibility Issue': `await page.locator('.element').waitFor({ state: 'visible' });`
    };

    return examples[category];
  }
}
```

**✅ Checkpoint:** AI analyzer is ready. Test it with sample errors.

---

## 📦 Phase 5: Asset & Data Management (Day 4)

### Step 5.1: Create Asset Collector

Create `src/collector/asset-collector.ts`:

```typescript
import { TestCase, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

export class AssetCollector {
  private outputFolder: string;
  private assetsFolder: string;

  constructor(outputFolder: string) {
    this.outputFolder = outputFolder;
    this.assetsFolder = path.join(outputFolder, 'assets');
  }

  initialize() {
    // Create output directories
    fs.mkdirSync(this.assetsFolder, { recursive: true });
    fs.mkdirSync(path.join(this.assetsFolder, 'screenshots'), { recursive: true });
    fs.mkdirSync(path.join(this.assetsFolder, 'videos'), { recursive: true });
    fs.mkdirSync(path.join(this.assetsFolder, 'traces'), { recursive: true });
  }

  collectAssets(test: TestCase, result: TestResult) {
    const attachments = result.attachments;

    attachments.forEach((attachment, index) => {
      if (!attachment.path) return;

      const ext = path.extname(attachment.path);
      const testId = this.sanitizeFilename(test.title);
      
      let targetFolder = '';
      if (attachment.contentType.includes('image')) {
        targetFolder = 'screenshots';
      } else if (attachment.contentType.includes('video')) {
        targetFolder = 'videos';
      } else if (attachment.name === 'trace') {
        targetFolder = 'traces';
      }

      if (targetFolder) {
        const targetPath = path.join(
          this.assetsFolder,
          targetFolder,
          `${testId}-${index}${ext}`
        );

        try {
          fs.copyFileSync(attachment.path, targetPath);
        } catch (error) {
          console.warn(`Failed to copy asset: ${attachment.path}`);
        }
      }
    });
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }
}
```

### Step 5.2: Create Data Serializer

Create `src/core/serializer.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { TestResult, ReportMetadata } from '../schema/types';

export class DataSerializer {
  private outputFolder: string;

  constructor(outputFolder: string) {
    this.outputFolder = outputFolder;
  }

  async writeResults(results: TestResult[], metadata: ReportMetadata) {
    const dataFolder = path.join(this.outputFolder, 'data');
    fs.mkdirSync(dataFolder, { recursive: true });

    // Write results
    const resultsPath = path.join(dataFolder, 'results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Write metadata
    const metadataPath = path.join(this.outputFolder, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`📝 Saved ${results.length} test results`);
  }
}
```

**✅ Checkpoint:** Data serialization working correctly.

---

## 🎨 Phase 6: HTML Report UI (Day 5-6)

### Step 6.1: Create HTML Renderer

Create `src/html/renderer.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { TestResult, ReportMetadata } from '../schema/types';

export class HTMLRenderer {
  private outputFolder: string;

  constructor(outputFolder: string) {
    this.outputFolder = outputFolder;
  }

  async generate(results: TestResult[], metadata: ReportMetadata) {
    const htmlContent = this.generateHTML(results, metadata);
    const cssContent = this.generateCSS();
    const jsContent = this.generateJS();

    // Write files
    fs.writeFileSync(path.join(this.outputFolder, 'index.html'), htmlContent);
    fs.writeFileSync(path.join(this.outputFolder, 'styles.css'), cssContent);
    fs.writeFileSync(path.join(this.outputFolder, 'viewer.js'), jsContent);

    console.log('🎨 HTML report generated');
  }

  private generateHTML(results: TestResult[], metadata: ReportMetadata): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlayVision Report</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🎭 PlayVision Reporter</h1>
      <p class="subtitle">AI-Powered Test Results</p>
    </header>

    <div class="dashboard">
      <div class="stat-card passed">
        <div class="stat-value">${metadata.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-value">${metadata.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card skipped">
        <div class="stat-value">${metadata.skipped}</div>
        <div class="stat-label">Skipped</div>
      </div>
      <div class="stat-card flaky">
        <div class="stat-value">${metadata.flaky}</div>
        <div class="stat-label">Flaky</div>
      </div>
      <div class="stat-card duration">
        <div class="stat-value">${(metadata.duration / 1000).toFixed(1)}s</div>
        <div class="stat-label">Duration</div>
      </div>
    </div>

    <div class="filters">
      <input type="text" id="search" placeholder="Search tests..." />
      <select id="statusFilter">
        <option value="all">All Status</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
        <option value="skipped">Skipped</option>
      </select>
    </div>

    <div id="testList"></div>
  </div>

  <script>
    window.testResults = ${JSON.stringify(results)};
    window.metadata = ${JSON.stringify(metadata)};
  </script>
  <script src="viewer.js"></script>
</body>
</html>`;
  }

  private generateCSS(): string {
    return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

header {
  text-align: center;
  margin-bottom: 40px;
}

h1 {
  font-size: 3em;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 1.2em;
}

.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  color: white;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card.passed { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
.stat-card.failed { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); }
.stat-card.skipped { background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%); }
.stat-card.flaky { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-card.duration { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.stat-value {
  font-size: 2.5em;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.9;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

#search, #statusFilter {
  padding: 12px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s;
}

#search {
  flex: 1;
}

#search:focus, #statusFilter:focus {
  outline: none;
  border-color: #667eea;
}

.test-item {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 20px;
  margin-bottom: 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.test-item:hover {
  background: #e9ecef;
  transform: translateX(5px);
}

.test-item.failed { border-left-color: #eb3349; }
.test-item.passed { border-left-color: #11998e; }
.test-item.skipped { border-left-color: #95a5a6; }

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.test-title {
  font-size: 1.2em;
  font-weight: 600;
  color: #333;
}

.test-status {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
}

.test-status.passed { background: #38ef7d; color: white; }
.test-status.failed { background: #eb3349; color: white; }
.test-status.skipped { background: #95a5a6; color: white; }

.test-meta {
  color: #666;
  font-size: 0.9em;
}

.ai-suggestion {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
}

.ai-suggestion strong {
  display: block;
  margin-bottom: 8px;
  font-size: 1.1em;
}

.error-details {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 15px;
  margin-top: 10px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  white-space: pre-wrap;
}`;
  }

  private generateJS(): string {
    return `const testResults = window.testResults || [];
const metadata = window.metadata || {};

function renderTests(tests = testResults) {
  const testList = document.getElementById('testList');
  testList.innerHTML = '';

  tests.forEach(test => {
    const testItem = document.createElement('div');
    testItem.className = \`test-item \${test.status}\`;
    
    testItem.innerHTML = \`
      <div class="test-header">
        <div class="test-title">\${test.title}</div>
        <div class="test-status \${test.status}">\${test.status}</div>
      </div>
      <div class="test-meta">
        Suite: \${test.suite} | Duration: \${test.duration}ms | Steps: \${test.steps.length}
      </div>
      \${test.error ? \`
        <div class="error-details">\${test.error.message}</div>
        \${test.error.aiAnalysis ? \`
          <div class="ai-suggestion">
            <strong>🤖 AI Analysis (\${(test.error.aiAnalysis.confidence * 100).toFixed(0)}% confidence)</strong>
            <div><strong>Category:</strong> \${test.error.aiAnalysis.category}</div>
            <div><strong>Root Cause:</strong> \${test.error.aiAnalysis.rootCause}</div>
            <div><strong>Suggestion:</strong> \${test.error.aiAnalysis.suggestion}</div>
            \${test.error.aiAnalysis.fixExample ? \`
              <div style="margin-top: 10px; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 4px;">
                <strong>Fix Example:</strong><br>
                <code>\${test.error.aiAnalysis.fixExample}</code>
              </div>
            \` : ''}
          </div>
        \` : ''}
      \` : ''}
    \`;
    
    testList.appendChild(testItem);
  });
}

// Search functionality
document.getElementById('search').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  
  const filtered = testResults.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm) || 
                         test.suite.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  renderTests(filtered);
});

// Status filter
document.getElementById('statusFilter').addEventListener('change', (e) => {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const statusFilter = e.target.value;
  
  const filtered = testResults.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm) || 
                         test.suite.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  renderTests(filtered);
});

// Initial render
renderTests();`;
  }
}
```

**✅ Checkpoint:** HTML report should render beautifully with AI suggestions.

---

## 🧪 Phase 7: Testing & Integration (Day 7)

### Step 7.1: Create Test Project

Create `test-project/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['../dist/index.js', {
      outputFolder: 'playvision-report',
      screenshots: true,
      videos: 'retain-on-failure',
      aiAnalysis: true,
      aiMode: 'smart'
    }]
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

### Step 7.2: Create Sample Tests

Create `test-project/tests/example.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sample Tests', () => {
  test('should pass', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('should fail - locator not found', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await page.click('#non-existent-button'); // Will fail
  });

  test('should fail - timeout', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await page.waitForSelector('#never-appears', { timeout: 1000 }); // Will timeout
  });

  test('should fail - assertion', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await expect(page).toHaveTitle('Wrong Title'); // Will fail
  });
});
```

### Step 7.3: Create Main Export

Create `src/index.ts`:

```typescript
export { PlayVisionReporter as default } from './core/reporter';
export * from './schema/types';
```

### Step 7.4: Build and Test

```bash
# Build the reporter
npm run build

# Run tests
cd test-project
npm install
npx playwright test

# Open the report
start playvision-report/index.html
```

**✅ Checkpoint:** Report should show AI-analyzed errors with suggestions!

---

## 📦 Phase 8: Package & Publish (Optional)

### Step 8.1: Prepare for NPM

Update `package.json`:

```json
{
  "name": "playvision-reporter",
  "version": "1.0.0",
  "description": "AI-powered HTML reporter for Playwright with intelligent error analysis",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "playwright",
    "reporter",
    "testing",
    "ai",
    "html-report",
    "test-automation"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/playvision-reporter"
  },
  "author": "Your Name",
  "license": "MIT",
  "peerDependencies": {
    "@playwright/test": "^1.40.0"
  },
  "dependencies": {
    "@huggingface/transformers": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 8.2: Create README.md

```markdown
# 🎭 PlayVision Reporter

AI-powered HTML reporter for Playwright with intelligent error analysis.

## Features

- 🤖 AI-powered error classification and fix suggestions
- 📊 Beautiful HTML reports with interactive dashboard
- 🎯 Zero-shot classification using Hugging Face Transformers
- 🚀 Fast, offline, and privacy-focused
- 📸 Screenshot and video capture
- 🔍 Search and filter capabilities

## Installation

\`\`\`bash
npm install playvision-reporter --save-dev
\`\`\`

## Usage

Add to your \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['playvision-reporter', {
      outputFolder: 'playvision-report',
      aiAnalysis: true,
      aiMode: 'smart'
    }]
  ]
});
\`\`\`

## License

MIT
```

### Step 8.3: Publish

```bash
# Login to NPM
npm login

# Publish
npm publish
```

---

## ✅ Final Checklist

- [ ] All TypeScript compiles without errors
- [ ] AI analyzer initializes correctly
- [ ] HTML report renders properly
- [ ] Tests run and generate reports
- [ ] AI suggestions appear for failed tests
- [ ] Screenshots/videos are captured
- [ ] Search and filters work
- [ ] Documentation is complete

---

## 🎯 Success Criteria

Your PlayVision Reporter is complete when:

1. ✅ It generates beautiful HTML reports
2. ✅ AI analysis provides helpful error suggestions
3. ✅ Works with parallel test execution
4. ✅ Handles 300+ tests in under 3 seconds
5. ✅ No external API dependencies
6. ✅ Ready for NPM publication

---

## 📞 Next Steps

**Ready to start?** Just say:
- "Let's begin Phase 1" - I'll set up the project
- "Build the entire tool" - I'll implement everything step-by-step
- "I need help with X" - I'll assist with specific parts

**Good luck! 🚀**
