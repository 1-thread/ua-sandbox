# UA 360 IP Generator

A Next.js application that generates a complete IP ecosystem from a short text idea, including:
- A 3-panel comic
- A 3D board game
- A 3D toy model viewer

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your API keys:
- `OPENAI_API_KEY` - For GPT and DALL·E
- `MESHY_API_KEY` - For 3D model generation
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side database writes
- `SUPABASE_ANON_KEY` - Optional, for client-side access

3. Set up Supabase database:
Run the SQL migration in `supabase/migrations/001_create_ip_sessions.sql` in your Supabase SQL editor.

**Note:** The Meshy.ai API implementation in `lib/meshy.ts` is based on a standard REST API pattern. You may need to adjust the endpoint URLs, request/response formats, or authentication method based on Meshy's actual API documentation. Check their documentation at https://docs.meshy.ai/ for the most up-to-date API structure.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

Deploy to Vercel:
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel project settings
3. Deploy

## Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components
- `/lib` - Utility functions and API clients
- `/supabase` - Database migrations

