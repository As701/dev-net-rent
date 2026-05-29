import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // console.log("Middleware token:", req.nextauth.token);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth",
    },
  }
);

// Список защищенных путей
export const config = {
  matcher: [
    "/profile/:path*",
    "/admin/:path*",
    "/messages/:path*",
    "/create/:path*",
  ],
};
