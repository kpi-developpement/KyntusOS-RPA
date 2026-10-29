import { NextRequest, NextResponse } from 'next/server';

async function handleRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  // L'IP dyal l'PC jdid ghadi njibouh mn les headers
  const targetNode = req.headers.get('x-target-node');
  
  if (!targetNode) {
    return NextResponse.json({ error: "Missing x-target-node header. Dir SYNC 9bel." }, { status: 400 });
  }

  // Kan-jem3ou l'massar (e.g., rpa/play/status)
  const path = (await params).path.join('/');
  
  // L'URL final li ghaymchi l'Java f l'PC jdid
  const fetchUrl = `${targetNode}/api/v1/${path}`;

  try {
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
    };

    // Ila kant POST/PUT/DELETE, kan-hezou l'body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = await req.text();
    }

    // Next.js Backend kay-connecta direct m3a l'PC (Hna makayn la CORS la walo!)
    const response = await fetch(fetchUrl, options);
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Proxy Connection Failed: " + error.message }, { status: 502 });
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;