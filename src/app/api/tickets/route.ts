import { NextResponse } from 'next/server';

const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
let cached: { ts: number; data: any } | null = null;

export async function GET() {
  // Return cached if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const token = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN;
  const owner = process.env.NEXT_PUBLIC_REPO_OWNER;
  const repo = process.env.NEXT_PUBLIC_REPO_NAME;

  if (!token || !owner || !repo) {
    // No token or repo info: return empty array to keep client-side behavior safe
    cached = { ts: Date.now(), data: [] };
    return NextResponse.json([]);
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=50`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'studio-autocomplete',
      },
    });

    if (!res.ok) {
      console.error('GitHub issues fetch failed', await res.text());
      cached = { ts: Date.now(), data: [] };
      return NextResponse.json([]);
    }

    const issues = await res.json();
    const mapped = (issues || []).map((i: any) => ({
      id: i.number?.toString?.() || i.id,
      title: i.title,
      body: i.body || '',
      updated_at: i.updated_at,
    }));

    cached = { ts: Date.now(), data: mapped };
    return NextResponse.json(mapped);
  } catch (err) {
    console.error('Error fetching GitHub issues', err);
    cached = { ts: Date.now(), data: [] };
    return NextResponse.json([]);
  }
}
