<div align="center">

# 💰 SplitKar

### Settle smart. Split sharp.

<p align="center">
  <a href="https://split-kar-pro.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/🔗_Live_Demo-split--kar--pro.vercel.app-F5C518?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/shadcn/ui-000000?style=flat-square&logo=shadcnui" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/Zustand-443E38?style=flat-square&logo=zustand" alt="Zustand" />
  <img src="https://img.shields.io/badge/pdf--lib-FF6B6B?style=flat-square&logo=pdf" alt="pdf-lib" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" />
</p>

</div>

---

## ✨ What is SplitKar?

**SplitKar** is a modern, full-stack expense splitting and settlement calculator that helps groups track shared expenses and calculates optimal settlements to minimize the number of transactions needed.

No more awkward "you owe me" conversations—just upload, split and settle!

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 📁 **Multiple Input Methods** | CSV upload with drag-and-drop, natural language text parsing or manual entry |
| ⚖️ **Flexible Split Options** | Equal, percentage-based, fixed amount or share-based splits |
| 🧠 **Smart Settlement Algorithm** | Optimized to minimize transactions, handles rounding automatically |
| 📄 **Professional Reports** | PDF export with transaction summary and step-by-step settlements |
| 🎨 **Beautiful UI** | Dark theme with smooth animations and responsive design |
| 🔒 **Privacy First** | All calculations happen locally—no data leaves your browser |

---

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mohit-bagri/splitkar.git
cd splitkar/my-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Usage

### 📝 CSV Upload

Upload expenses via CSV file with drag-and-drop:

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

### 💬 Natural Language

Describe expenses in plain English:

```
Alice paid 500 for dinner for Alice, Bob and Charlie.
Bob paid 300 for movie tickets for everyone.
```

### 🧮 Settlement Calculation

Click **"Calculate Settlement"** to see:
- Who owes money
- Who should receive money
- Minimum transactions needed to settle all debts

---

## 🧪 Testing

```bash
npm test
```

---

## 🚀 Deployment

Deploy to [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mohit-bagri/splitkar)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made in** 🇮🇳 **by** [Mohit Bagri](https://mohitbagri-portfolio.vercel.app)

</div>
