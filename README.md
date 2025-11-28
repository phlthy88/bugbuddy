# BugBuddy - AI-Powered Code Analysis

BugBuddy is a debugging assistant that analyzes Java code and stack traces to provide insights and fix suggestions.

## Features

- **AI-Powered Analysis**: Uses advanced coding models for intelligent bug analysis
- **Heuristics Fallback**: Works even without API keys using pattern-based analysis
- **Real-time Feedback**: Instant analysis of code and stack traces
- **Multiple Analysis Modes**: NPE detection, concurrency issues, performance problems, and more

## Setup

### Basic Setup (No API Key Required)

The app works out of the box with basic heuristics analysis:

```bash
npm install
npm run dev
```

### Enhanced AI Analysis (Optional)

For advanced AI-powered analysis using the KAT-Coder-Pro model:

1. **Sign up for OpenRouter** (free):
   - Visit: https://openrouter.ai/
   - Create an account

2. **Get your API key**:
   - Go to: https://openrouter.ai/keys
   - Generate a new API key

3. **Configure the environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key:
   VITE_OPENROUTER_API_KEY=your_api_key_here
   ```

4. **Restart the development server**:
   ```bash
   npm run dev
   ```

### OpenRouter Free Tier Limits

- **50 requests per day**
- **20 requests per minute**
- **No credit card required**
- **Access to 25+ free models**

## AI Model: KAT-Coder-Pro V1

When an API key is configured, BugBuddy uses **Kwaipilot KAT-Coder-Pro V1**, a specialized coding model with:

- **73.4% solve rate** on SWE-Bench Verified benchmark
- **Agentic coding capabilities** for complex analysis
- **Multi-stage training** (mid-training, SFT, RFT, RL)
- **256K context window** for large codebases
- **Tool integration support** for enhanced analysis

## Analysis Capabilities

### With AI (API Key Configured)
- Root cause analysis with technical depth
- Code pattern recognition and anti-pattern detection
- Memory/threading issue identification
- Exception handling problem detection
- Performance bottleneck analysis
- Security vulnerability detection

### Without AI (Heuristics Only)
- Basic pattern matching
- Common Java bug detection
- Stack trace parsing
- Standard fix suggestions

## Usage

1. **Paste your Java code** in the code editor
2. **Add your stack trace** in the trace input
3. **Select analysis focus** (auto, NPE, concurrency, etc.)
4. **Click "Analyze"** to get insights and fix suggestions

## Architecture

- **Frontend**: React + TypeScript + Vite
- **AI Service**: OpenRouter API with KAT-Coder-Pro model
- **Fallback**: Pattern-based heuristics analysis
- **UI**: Tailwind CSS with custom components

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Clean build artifacts
npm run clean
```

## Contributing

Contributions are welcome! The app gracefully handles missing API keys, so all features work regardless of AI service availability.