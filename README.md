# 🚀 PlayVision Reporter

**Intelligent, AI-Powered Playwright Test Reporter**

PlayVision is a modern, high-performance Playwright reporter that goes beyond simple logs. It leverages local and cloud LLMs to analyze test failures, providing root cause analysis and actionable fix suggestions directly in a premium, React-based HTML report.

---

## ✨ Key Features

- 🤖 **AI Forensics** - Automatic error categorization and root cause analysis using Ollama (Local) or OpenAI.
- 📄 **Source Traceability** - Test cards show the exact file and line number where the test is defined.
- 🔗 **VS Code Integration** - Open any test file at the exact line of failure directly from the report via `vscode://` deep links.
- 📊 **Executive Summary** - Export professional PDF reports and detailed Excel failure data.
- ⚡ **Native Performance** - Optimized React SPA shell with data injection for instant report loading.
- 📸 **Rich Evidence** - Seamlessly embeds screenshots (base64 for PDF support), videos, and trace files.
- 🔍 **Advanced Filtering** - Search by test title, suite, spec file name, or directory path.

---

## 🛠️ Quick Start

### 1. Installation

```bash
# Install dependencies
npm install
```

### 2. Configuration (`playwright.config.ts`)

Add PlayVision to your Playwright configuration:

```typescript
import { PlayVisionConfig } from 'playvision-reporter';

const config: PlaywrightTestConfig = {
  reporter: [
    ['playvision-reporter', {
      outputFolder: 'playvision-report',
      aiAnalysis: true,
      aiMode: 'premium', // 'premium' (Local LLM + Cloud Fallback), 'smart', or 'basic'
      exportPdf: true,
      exportExcel: true
    } as PlayVisionConfig]
  ],
};
```

### 3. Build & Run

```bash
# Build the reporter
npm run build

# Run tests in your test project
cd test-project
npm test
```

---

## 🏗️ Architecture

PlayVision is built with **separation of concerns** at its core:

- **`Collector`**: Manages test execution events and asset gathering.
- **`AI Engine`**: Orchestrates failure analysis across multiple providers (Ollama, OpenAI, Heuristics).
- **`Report UI`**: A modern React-based dashboard injected with test data for maximum speed.
- **`Export Manager`**: Handles post-processing for PDF and Excel generation.

---

## 📖 Deep Dives

For more detailed information, check the documentation in the `document/` folder:

- [Architecture & Design Principles](document/ARCHITECTURE.md)
- [Configuration Guide](document/CONFIG_GUIDE.md)
- [OpenAI Integration](document/OPENAI_INTEGRATION.md)
- [Extensibility Guide](document/EXTENSIBILITY.md)

---

## 🔒 Security & Environment

Create a `.env` file in the root to configure your AI providers:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o
```
*Note: The `.env` file is gitignored to protect your credentials.*

---

## 📝 License

MIT © [Vignesh8205](https://github.com/Vignesh8205)
