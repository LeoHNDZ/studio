import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint is deprecated. The autocomplete system now uses local compositions
  // instead of GitHub issues for phrase suggestions.
  return NextResponse.json({
    deprecated: true,
    message: "The /api/tickets endpoint is deprecated. Autocomplete now uses local compositions stored in localStorage. Please use the new composition repository system.",
    timestamp: new Date().toISOString()
  });
}
