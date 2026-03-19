# PlayVision Reporter - Extensibility Examples

This document shows how easy it is to extend PlayVision Reporter with new features.

## Example 1: Adding a New AI Provider (OpenAI)

### Step 1: Create the Implementation

```typescript
// src/ai/openai-analyzer.ts
import { BaseAIAnalyzer } from './factory';
import { AIAnalysis } from '../schema/types';
import OpenAI from 'openai';

export class OpenAIAnalyzer extends BaseAIAnalyzer {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async analyze(error: Error): Promise<AIAnalysis> {
    const prompt = `Analyze this Playwright test error and categorize it:
    
Error: ${error.message}

Categories: ${this.ERROR_CATEGORIES.join(', ')}

Provide: category, root cause, and fix suggestion.`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    // Parse response and return AIAnalysis
    // ... implementation
  }
}
```

### Step 2: Register It

```typescript
// In your config or initialization
import { AIAnalyzerFactory } from 'playvision-reporter';
import { OpenAIAnalyzer } from './custom/openai-analyzer';

AIAnalyzerFactory.register('openai', () => new OpenAIAnalyzer(process.env.OPENAI_API_KEY));
```

### Step 3: Use It

```typescript
// playwright.config.ts
reporter: [
  ['playvision-reporter', {
    aiMode: 'openai'  // That's it!
  }]
]
```

---

## Example 2: Adding a PDF Report Renderer

### Step 1: Implement the Interface

```typescript
// src/html/pdf-renderer.ts
import { IReportRenderer } from '../core/interfaces';
import { TestResult, ReportMetadata } from '../schema/types';
import PDFDocument from 'pdfkit';

export class PDFRenderer implements IReportRenderer {
  constructor(private outputPath: string) {}

  async generate(results: TestResult[], metadata: ReportMetadata): Promise<void> {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(this.outputPath));
    
    // Add title
    doc.fontSize(20).text('PlayVision Test Report', { align: 'center' });
    
    // Add summary
    doc.fontSize(12).text(`Total Tests: ${metadata.totalTests}`);
    doc.text(`Passed: ${metadata.passed}`);
    doc.text(`Failed: ${metadata.failed}`);
    
    // Add test details
    results.forEach(test => {
      doc.addPage();
      doc.fontSize(16).text(test.title);
      doc.fontSize(10).text(`Status: ${test.status}`);
      // ... more details
    });
    
    doc.end();
  }
}
```

### Step 2: Use It

```typescript
// src/core/reporter.ts
import { PDFRenderer } from '../html/pdf-renderer';

// In onEnd()
const pdfRenderer = new PDFRenderer('report.pdf');
await pdfRenderer.generate(results, metadata);
```

---

## Example 3: Adding Custom Error Categories

### Extend the Base Analyzer

```typescript
// custom/my-analyzer.ts
import { RuleBasedAnalyzer } from 'playvision-reporter';

export class MyCustomAnalyzer extends RuleBasedAnalyzer {
  protected readonly ERROR_CATEGORIES = [
    ...super.ERROR_CATEGORIES,
    'Database Connection Error',
    'Authentication Failure',
    'Rate Limit Exceeded'
  ];

  protected readonly SUGGESTIONS = {
    ...super.SUGGESTIONS,
    'Database Connection Error': 'Check database credentials and connection string',
    'Authentication Failure': 'Verify API keys and authentication tokens',
    'Rate Limit Exceeded': 'Implement retry logic with exponential backoff'
  };

  async analyze(error: Error): Promise<AIAnalysis> {
    const message = error.message;
    
    // Custom patterns
    if (/ECONNREFUSED.*database/i.test(message)) {
      return {
        category: 'Database Connection Error',
        confidence: 0.95,
        rootCause: 'Cannot connect to database',
        suggestion: this.SUGGESTIONS['Database Connection Error']
      };
    }
    
    // Fall back to parent implementation
    return super.analyze(error);
  }
}
```

---

## Example 4: Adding a Slack Notifier

### Create a Plugin

```typescript
// plugins/slack-notifier.ts
import { Reporter } from '@playwright/test/reporter';
import { WebClient } from '@slack/web-api';

export class SlackNotifierPlugin implements Reporter {
  private slack: WebClient;

  constructor(private token: string, private channel: string) {
    this.slack = new WebClient(token);
  }

  async onEnd(result: FullResult) {
    const message = `
🎭 *PlayVision Test Report*
✅ Passed: ${result.passed}
❌ Failed: ${result.failed}
⏱️ Duration: ${result.duration}ms
    `;

    await this.slack.chat.postMessage({
      channel: this.channel,
      text: message
    });
  }
}
```

### Use Multiple Reporters

```typescript
// playwright.config.ts
reporter: [
  ['playvision-reporter', { aiMode: 'smart' }],
  ['./plugins/slack-notifier', {
    token: process.env.SLACK_TOKEN,
    channel: '#test-results'
  }]
]
```

---

## Example 5: Custom HTML Theme

### Create a Theme

```typescript
// themes/dark-theme.ts
export const darkTheme = {
  colors: {
    primary: '#667eea',
    background: '#1a1a2e',
    text: '#eaeaea',
    success: '#38ef7d',
    error: '#eb3349'
  },
  fonts: {
    heading: 'Poppins, sans-serif',
    body: 'Inter, sans-serif'
  }
};
```

### Apply It

```typescript
// src/html/renderer.ts
import { darkTheme } from '../themes/dark-theme';

class HTMLRenderer {
  private generateCSS(theme = darkTheme): string {
    return `
      body {
        background: ${theme.colors.background};
        color: ${theme.colors.text};
        font-family: ${theme.fonts.body};
      }
      h1 {
        color: ${theme.colors.primary};
        font-family: ${theme.fonts.heading};
      }
    `;
  }
}
```

---

## Example 6: Adding Test Retry Comparison

### Extend Event Collector

```typescript
// src/collector/enhanced-event-collector.ts
import { EventCollector } from './event-collector';

export class EnhancedEventCollector extends EventCollector {
  private retryAttempts: Map<string, TestResult[]> = new Map();

  endTest(test: TestCase, result: PWTestResult) {
    super.endTest(test, result);
    
    // Track retry attempts
    if (result.retry > 0) {
      const testId = this.getTestId(test);
      if (!this.retryAttempts.has(testId)) {
        this.retryAttempts.set(testId, []);
      }
      this.retryAttempts.get(testId)!.push(result);
    }
  }

  getRetryComparison(testId: string): TestResult[] {
    return this.retryAttempts.get(testId) || [];
  }
}
```

---

## Key Takeaways

### ✅ Easy to Extend
- Implement an interface
- Register with factory (if needed)
- Use in configuration

### ✅ No Breaking Changes
- New features don't affect existing code
- Backward compatible
- Opt-in functionality

### ✅ Type-Safe
- TypeScript ensures correctness
- Compile-time error checking
- IntelliSense support

### ✅ Testable
- Mock implementations for testing
- Dependency injection
- Isolated components

### ✅ Maintainable
- Clear separation of concerns
- Single responsibility
- Easy to understand and modify

---

## Future Extension Ideas

1. **Visual Regression**: Compare screenshots across runs
2. **Performance Tracking**: Track test execution times over time
3. **Flakiness Detection**: Identify and report flaky tests
4. **Custom Metrics**: Add business-specific metrics
5. **Integration with CI/CD**: GitHub Actions, Jenkins plugins
6. **Real-time Dashboard**: WebSocket-based live updates
7. **Test Analytics**: ML-based test failure prediction
8. **Multi-format Export**: JSON, XML, CSV exports

All of these can be added without modifying the core codebase! 🎉
