# PlayVision Reporter - Architecture & Design Principles

## Core Design Principles

### 1. **Separation of Concerns**
Each module has a single, well-defined responsibility:
- **Reporter Engine**: Orchestrates the reporting flow
- **Event Collector**: Manages test event data
- **Asset Collector**: Handles file operations
- **AI Analyzer**: Performs error analysis
- **HTML Renderer**: Generates output

### 2. **Dependency Injection**
All dependencies are injected through constructors, making testing and swapping implementations easy.

```typescript
// Good: Dependencies injected
class Reporter {
  constructor(
    private eventCollector: IEventCollector,
    private assetCollector: IAssetCollector,
    private aiAnalyzer: IAIAnalyzer
  ) {}
}
```

### 3. **Interface-Based Design**
All major components implement interfaces, allowing easy mocking and alternative implementations.

```typescript
interface IAIAnalyzer {
  analyze(error: Error): Promise<AIAnalysis>;
}

// Can swap implementations easily
class HuggingFaceAnalyzer implements IAIAnalyzer { }
class OpenAIAnalyzer implements IAIAnalyzer { }
class RuleBasedAnalyzer implements IAIAnalyzer { }
```

### 4. **Configuration-Driven**
All behavior is controlled through configuration, not hardcoded values.

```typescript
// Centralized configuration
interface PlayVisionConfig {
  outputFolder: string;
  aiMode: 'basic' | 'smart' | 'premium';
  // Easy to extend
}
```

### 5. **Error Handling**
Graceful degradation - if AI fails, fall back to rule-based analysis.

```typescript
try {
  return await this.aiAnalyzer.analyze(error);
} catch (err) {
  console.warn('AI analysis failed, using fallback');
  return this.fallbackAnalyzer.analyze(error);
}
```

### 6. **Extensibility**
Plugin-like architecture for future features:

```typescript
// Easy to add new renderers
interface IRenderer {
  render(data: TestResult[]): Promise<void>;
}

class HTMLRenderer implements IRenderer { }
class PDFRenderer implements IRenderer { }  // Future
class JSONRenderer implements IRenderer { }  // Future
```

## File Organization

```
src/
├── core/
│   ├── reporter.ts           # Main orchestrator
│   ├── serializer.ts         # Data persistence
│   ├── export-manager.ts     # PDF/Excel exports
│   └── interfaces.ts         # Core interfaces
├── collector/
│   ├── event-collector.ts    # Event management
│   ├── asset-collector.ts    # Asset management
│   └── interfaces.ts         # Collector interfaces
├── ai/
│   ├── factory.ts            # AI analyzer factory
│   ├── base-analyzer.ts      # Common LLM logic & parsing
│   ├── ollama-analyzer.ts    # local LLM implementation
│   ├── openai-analyzer.ts    # OpenAI implementation
│   ├── huggingface-analyzer.ts # HuggingFace implementation
│   ├── rule-based-analyzer.ts # Primitive pattern matching
│   └── interfaces.ts         # AI interfaces
├── html/
│   ├── renderer.ts           # HTML generation
│   └── interfaces.ts         # Renderer interfaces
├── schema/
│   └── types.ts              # Shared types
└── index.ts                  # Main entry point
```

## Key Patterns

### 1. Factory Pattern
```typescript
class AIAnalyzerFactory {
  static async create(mode: AIMode): Promise<IAIAnalyzer> {
    switch(mode) {
      case AIMode.PREMIUM: return new OllamaAnalyzer(); // With OpenAI fallback
      case AIMode.SMART: return new HuggingFaceAnalyzer();
      case AIMode.BASIC: return new RuleBasedAnalyzer();
      default: return new RuleBasedAnalyzer();
    }
  }
}
```

### 2. Strategy Pattern
```typescript
// Different rendering strategies
class ReportRenderer {
  constructor(private strategy: IRenderer) {}
  
  setStrategy(strategy: IRenderer) {
    this.strategy = strategy;
  }
}
```

### 3. Strategy Pattern (Export Management)
Used for generating reports in different formats (PDF, Excel) without cluttering the main reporter logic.

```typescript
class ExportManager {
  async export(results: TestResult[], metadata: ReportMetadata) {
    if (this.config.exportExcel) await this.generateExcel(results);
    if (this.config.exportPdf) await this.generatePdf();
  }
}
```

## Maintainability Features

### 1. **Type Safety**
- Strict TypeScript with no `any` types
- Comprehensive interfaces
- Proper error types

### 2. **Documentation**
- JSDoc comments on all public APIs
- README with examples
- Architecture diagrams

### 3. **Testing**
- Unit tests for each module
- Integration tests for workflows
- Mock implementations for testing

### 4. **Versioning**
- Semantic versioning
- Changelog maintenance
- Breaking change warnings

### 5. **Logging**
- Structured logging with levels
- Debug mode for troubleshooting
- Performance metrics

## Future-Proofing

### Easy to Add:
- ✅ New AI providers (just implement `IAIAnalyzer`)
- ✅ New output formats (just implement `IRenderer`)
- ✅ New asset types (extend `AssetCollector`)
- ✅ Custom themes (template-based HTML)
- ✅ Plugins (event hooks)

### Example: Adding a New AI Provider
```typescript
// 1. Create new implementation
class ClaudeAnalyzer implements IAIAnalyzer {
  async analyze(error: Error): Promise<AIAnalysis> {
    // Implementation
  }
}

// 2. Register in factory
AIAnalyzerFactory.register('claude', ClaudeAnalyzer);

// 3. Use in config
reporter: ['playvision', { aiMode: 'claude' }]
```

## Code Quality Standards

1. **Single Responsibility**: Each class/function does ONE thing
2. **DRY**: No code duplication
3. **KISS**: Keep it simple and straightforward
4. **YAGNI**: Don't add features until needed
5. **Composition over Inheritance**: Prefer interfaces and composition

## Performance Considerations

1. **Lazy Loading**: Load AI models only when needed
2. **Streaming**: Process large test suites in chunks
3. **Caching**: Cache AI analysis for similar errors
4. **Async Operations**: Non-blocking I/O operations
5. **Worker Threads**: Parallel processing for large reports

---

**This architecture ensures:**
- ✅ Easy to understand
- ✅ Easy to test
- ✅ Easy to extend
- ✅ Easy to maintain
- ✅ Easy to upgrade
