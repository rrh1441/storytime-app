// src/lib/apiBase.ts
export const API_BASE =
  // set in Vercel → Environment Variables
  (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) ||
  "https://storytime-app.fly.dev";
