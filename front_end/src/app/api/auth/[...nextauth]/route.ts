// This is a minimal Next-Auth configuration file to prevent client-side errors
// We're not actually using Next-Auth for authentication in this application

import { NextResponse } from 'next/server';

// Return a simple JSON response for any Next-Auth API requests
export async function GET() {
  return NextResponse.json({ 
    message: "Auth API not configured. Using custom authentication." 
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: "Auth API not configured. Using custom authentication." 
  });
}
