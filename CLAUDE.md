# Pulse App — Project Context

Stack: Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Supabase, Gemini API, Zustand, Recharts, shadcn/ui
Design: Dark mode only. Graphite backgrounds (#0a0a0b, #111113, #16161a). Violet accent (#7c3aed). See globals.css for all tokens.
Components: Reusable UI lives in /components/ui/. Always use existing components before creating new ones.
Auth: Supabase Google OAuth. useUser() hook in /hooks/useUser.ts.
Data: All DB calls go through /lib/supabase/. Use optimistic updates.
AI: Gemini API key in NEXT_PUBLIC_GEMINI_API_KEY. Prompts live in /lib/ai/.
Style rules: Framer Motion for all animations. No inline styles — use Tailwind + CSS vars. Skeleton loaders on all data fetches.