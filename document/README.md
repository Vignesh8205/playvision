# PlayVision Reporter

AI-Powered Playwright Test Reporter with intelligent error analysis.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key (Optional)

For AI-powered error analysis with OpenAI fallback:

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
OPENAI_API_KEY=your-api-key-here
```

### 3. Build
```bash
npm run build
```

### 4. Run Tests
```bash
cd test-project
npm test
```

## 📊 Features

- ✅ **Beautiful HTML Reports** - Modern, responsive UI with dark mode
- 🤖 **AI Error Analysis** - Automatic error categorization and suggestions
- 🔄 **Intelligent Fallback** - Ollama → OpenAI API → Heuristic Pattern Matcher
- 📄 **Executive PDF Summary** - Professional PDF reports for stakeholders
- 📊 **Excel Failure Data** - Detailed failure analysis in spreadsheet format
- 📸 **Rich Attachments** - Screenshots (with base64 embedding for PDFs), videos, and traces
- 🎨 **Professional Design** - Compact, clean typography
- ⚡ **Fast & Reliable** - Optimized performance with background AI tasks

## 🛠️ Configuration

### AI Modes

Configure in `playwright.config.ts`:

- `'premium'` - Ollama with OpenAI fallback (recommended)
- `'smart'` - HuggingFace API
- `'basic'` - Fast rule-based analysis

### Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_API_URL=https://api.apifree.ai/v1/chat/completions
OPENAI_MODEL=openai/gpt-5.2
```

## 📖 Documentation

- [OpenAI Integration Guide](./documents/OPENAI_INTEGRATION.md)
- [Phase Documentation](./documents/PHASE_README.md)

## 🔒 Security

The `.env` file is gitignored to protect your API keys. Never commit sensitive credentials to version control.

## 📝 License

MIT
