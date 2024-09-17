import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoutes = createRouteMatcher([
  "/",
  "/sign-in",
  "/sign-up",
  "/home",
]);

const isPublicApiRoutes = createRouteMatcher(["/api/videos"]);

export default clerkMiddleware((auth, req) => {
  const { userId } = auth();
  const currentUrl = new URL(req.url);
  const isAccessingDashboard = currentUrl.pathname === "/home";
  const isApiRequest = currentUrl.pathname.startsWith("/api");

  //if user is logged in and try to access path other than dashboard from isPublicRoutes
  if (userId && isPublicRoutes(req) && !isAccessingDashboard) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  //if user is not logged in
  if (!userId) {
    // If user is not logged in and trying to access a protected
    if (!isPublicRoutes(req) && !isPublicApiRoutes(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
    // If the request is For a protected API and the user is not logged in
    if (isApiRequest && !isPublicApiRoutes(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
