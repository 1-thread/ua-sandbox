# UA Dashboard

Universal Asset Dashboard - A Next.js application for managing IPs, functions, tasks, deliverables, assets, and workflows.

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables by copying `.env.example` to `.env.local` and filling in your Supabase credentials:

```bash
cp env.example .env.local
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` - Next.js app router pages and API routes
- `components/` - React components
- `lib/` - Utility libraries (Supabase client, etc.)
- `types/` - TypeScript type definitions
- `public/` - Static assets (images, icons)
- `scripts/` - Node.js scripts for data import and setup
- `supabase/` - Database schema, migrations, and SQL scripts
- `docs/` - Project documentation and guides
- `functions/` - JSON files defining core functions (E1, G1, P1, etc.)
- `workflows/` - Workflow definitions and data

## Documentation

See the [`docs/`](./docs/) folder for detailed documentation:
- Setup guides for workflows, assets, and ontology
- Design documents
- Import and upload instructions

See the [`supabase/`](./supabase/) folder for database documentation:
- Schema setup instructions
- Migration scripts
- Ontology initialization

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI Integration**: OpenAI ChatGPT API

## Deploy on Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Make sure to set your environment variables in Vercel's dashboard.
