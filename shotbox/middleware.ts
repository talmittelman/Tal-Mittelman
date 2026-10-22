import { NextRequest, NextResponse } from "next/server";

// Password gate. If APP_PASSWORD is set, the whole app (including the fal proxy,
// which spends your credits) asks for it. Username can be anything.
// On Vercel the gate fails closed: without APP_PASSWORD the app refuses to run,
// so a deploy with a missing variable can't be used to spend your credits.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    if (process.env.VERCEL) {
      return new NextResponse("APP_PASSWORD is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.", { status: 503 });
    }
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given === password) return NextResponse.next();
  }

  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Shotbox"' },
  });
}

export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
