# SplitKar

> Settle smart. Split sharp.

SplitKar is a modern expense splitting and settlement calculator built with Next.js and TypeScript. It helps groups track shared expenses and calculates optimal settlements to minimize the number of transactions needed.

## Features

- **Multiple Input Methods**
  - CSV upload with drag-and-drop support
  - Natural language text parsing
  - Manual transaction entry

- **Flexible Split Options**
  - Equal split among participants
  - Percentage-based splits
  - Fixed amount splits
  - Share-based splits

- **Smart Settlement Algorithm**
  - Optimized to minimize number of transactions
  - Handles rounding corrections automatically
  - Clear visualization of who owes whom

- **Professional Reports**
  - PDF export with transaction summary
  - Balance overview
  - Step-by-step settlement instructions

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 + React 19
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **PDF Generation**: [pdf-lib](https://pdf-lib.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/mohit-bagri/splitkar.git
cd splitkar/my-app

# Install dependencies
npm install

# Set up environment variables (optional)
cp .env.example .env.local
# Edit .env.local if you want to enable LLM parsing features

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### CSV Format

Upload expenses via CSV file:

```csv
paid_by,amount,description
Alice,500,Dinner
Bob,300,Movie tickets
Charlie,150,Drinks
```

With split details:

```csv
paid_by,amount,description,split_type,participants
Alice,500,Dinner,equal,"Alice,Bob,Charlie"
Bob,300,Movie tickets,percentage,"Alice:50,Bob:30,Charlie:20"
```

### Natural Language

Describe expenses in plain English:

```
Alice paid 500 for dinner for Alice, Bob and Charlie.
Bob paid 300 for movie tickets for everyone.
```

### Settlement Calculation

After adding all transactions, click "Calculate Settlement" to see:
- Who owes money
- Who should receive money
- Minimum transactions needed to settle all debts

## Project Structure

```
my-app/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── features/       # Feature components
│   └── ui/            # UI components (shadcn)
├── lib/               # Utility functions
│   ├── parser.ts      # CSV/text parsing
│   ├── settlement.ts  # Settlement algorithm
│   ├── split.ts       # Split calculations
│   └── validation.ts  # Input validation
├── store/             # Zustand stores
├── types/             # TypeScript types
└── public/            # Static assets
```

## API Endpoints

### POST `/api/parse`
Parse CSV or natural language text into transactions.

### POST `/api/settle`
Calculate optimal settlements from transaction data.

### POST `/api/generate-pdf`
Generate a PDF report with transactions and settlements.

## Testing

```bash
npm test
```

## Deployment

The app can be deployed to [Vercel](https://vercel.com) or any platform supporting Next.js:

```bash
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Made in India by [Mohit Bagri](https://github.com/mohit-bagri)
- Built with modern web technologies and best practices

---

Built with precision. Designed for clarity.
