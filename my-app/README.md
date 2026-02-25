# SPLITकर (SplitKar)

A production-ready, full-stack fintech web application for intelligent expense splitting and settlement.

> **Settle smart. Split sharp.**

![Gotham Theme](https://img.shields.io/badge/theme-gotham-dark)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Input Methods
- **CSV Upload**: Drag-and-drop CSV parsing with auto-detected columns
- **Natural Language**: Describe expenses in plain English
- **AI-Powered Parsing**: Optional OpenAI integration for complex descriptions

### Split Types
- Equal split
- Percentage-based
- Fixed amounts
- Share-based

### Settlement Algorithm
- Optimized greedy matching
- Minimizes number of transactions
- Handles rounding corrections

### Export
- PDF report generation with dark theme
- Transaction summary
- Settlement instructions
- Net balances

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS, ShadCN UI |
| Animations | Framer Motion |
| State | Zustand |
| Icons | Lucide React |
| Parsing | PapaParse, Custom rule-based parser |
| PDF | pdf-lib |
| LLM | OpenAI API (optional) |

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/splitkar.git
cd splitkar/my-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY (optional)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | OpenAI API key for AI parsing |

## Usage

### CSV Format

Basic format:
```csv
paid_by,amount,description
Mohit,500,Horse Riding
Pankaj,300,Breakfast
```

Advanced format:
```csv
paid_by,amount,description,split_type,participants
Mohit,500,Horse Riding,equal,"Mohit,Pankaj,Dhruv,Rudra"
Pankaj,300,Breakfast,equal,"Mohit,Pankaj,Dhruv,Rudra"
```

### Natural Language

Simply describe your expenses:
```
Mohit paid 500 for horse riding for Mohit, Pankaj, Dhruv and Rudra.
Pankaj paid 300 for breakfast for everyone.
```

## Architecture

```
my-app/
├── app/
│   ├── api/
│   │   ├── parse/         # CSV & text parsing endpoint
│   │   ├── settle/        # Settlement calculation endpoint
│   │   └── generate-pdf/  # PDF generation endpoint
│   ├── globals.css        # Gotham theme styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   ├── features/          # Feature components
│   │   ├── CSVUploader.tsx
│   │   ├── TextInput.tsx
│   │   ├── TransactionTable.tsx
│   │   ├── SettlementView.tsx
│   │   └── SplitModal.tsx
│   └── ui/               # ShadCN UI components
├── lib/
│   ├── parser.ts         # CSV & NL parsing
│   ├── settlement.ts     # Settlement algorithm
│   ├── split.ts          # Split calculations
│   ├── llm.ts            # OpenAI integration
│   └── validation.ts     # Zod schemas
├── store/
│   ├── transactionStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts
└── __tests__/
    └── settlement.test.ts
```

## API Endpoints

### POST /api/parse
Parse CSV or natural language text.

```json
{
  "type": "csv | text",
  "content": "...",
  "useLLM": false
}
```

### POST /api/settle
Calculate optimal settlements.

```json
{
  "transactions": [...]
}
```

### POST /api/generate-pdf
Generate PDF report.

```json
{
  "title": "SplitKar Report",
  "transactions": [...],
  "balances": [...],
  "settlements": [...]
}
```

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables

Make sure to set `OPENAI_API_KEY` in your Vercel project settings if you want AI parsing.

## Design Philosophy

SplitKar follows a **Gotham Fintech** design language:

- **Dark theme**: Deep charcoal backgrounds (#0f0f0f)
- **Gold accents**: Primary brand color (#F5C518)
- **Clean typography**: Geist font family
- **Subtle animations**: Framer Motion for polish
- **Professional feel**: No cartoonish elements

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

Built with precision. Designed for clarity.
