import { NextResponse, type NextRequest } from "next/server";

// El middleware no puede leer localStorage (solo cookies).
// Usamos una cookie liviana que el AuthContext mantiene en sync.
const PROTECTED = [
  { prefix: "/vendedor", roles: ["VENDEDOR", "ADMIN"] },
  { prefix: "/admin",    roles: ["ADMIN"] },
  { prefix: "/comprador",roles: ["COMPRADOR", "ADMIN"] },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = PROTECTED.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  // Cookie "nexcom_rol" seteada por el AuthContext al hacer login
  const rol = request.cookies.get("nexcom_rol")?.value;

  if (!rol || !rule.roles.includes(rol)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/vendedor/:path*", "/admin/:path*", "/comprador/:path*"],
};
