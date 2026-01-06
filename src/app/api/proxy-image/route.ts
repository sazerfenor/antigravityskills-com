
import { NextRequest, NextResponse } from 'next/server';

// Note: Edge runtime removed - OpenNext/Cloudflare handles runtime automatically

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const suggestedFilename = req.nextUrl.searchParams.get('filename');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Security check: Ensure the URL corresponds to our expected domains
  // This prevents the proxy from being used as an open relay
  // TODO: 替换为你自己的域名
  const ALLOWED_DOMAINS = ['your-domain.com', 'r2.your-domain.com'];
  try {
    const parsedUrl = new URL(url);
    if (!ALLOWED_DOMAINS.some(domain => parsedUrl.hostname.endsWith(domain))) {
       // In development, we might allow localhost or other domains, but for now strict check
       // return NextResponse.json({ error: 'Forbidden domain' }, { status: 403 });
       // Logic: for flexibility let's just log a warning but proceed for now if needed, 
       // OR stick to the plan. Let's start with strict check to be safe.
       if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Forbidden domain' }, { status: 403 });
       }
    }
  } catch (e) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const imageResponse = await fetch(url);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageResponse.statusText}` },
        { status: imageResponse.status }
      );
    }

    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
    const body = imageResponse.body;

    // Determine filename for Content-Disposition header
    // Priority: 1. suggestedFilename from query, 2. filename from URL path
    let filename = suggestedFilename;
    if (!filename) {
      try {
        const urlPath = new URL(url).pathname;
        const pathFilename = urlPath.split('/').pop();
        if (pathFilename && pathFilename.includes('.')) {
          filename = pathFilename;
        }
      } catch {
        // Fallback: use a generic name with extension from content type
        const ext = contentType.split('/')[1] || 'png';
        filename = `image-${Date.now()}.${ext}`;
      }
    }

    // Create a new response with the image body and headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Access-Control-Allow-Origin', '*'); // Allow client to access this
    
    // Add Content-Disposition header to ensure browser uses the correct filename
    if (filename) {
      // Sanitize filename for HTTP header
      const sanitizedFilename = filename.replace(/[^\w\-_.]/g, '');
      headers.set('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    }

    return new NextResponse(body, {
      status: 200,
      headers,
    });

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
