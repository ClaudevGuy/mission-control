import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect all dashboard routes and API routes (except auth and register)
  matcher: [
    "/(dashboard)(.*)",
    "/overview/:path*",
    "/agents/:path*",
    "/codebase/:path*",
    "/deployments/:path*",
    "/infrastructure/:path*",
    "/costs/:path*",
    "/analytics/:path*",
    "/logs/:path*",
    "/team/:path*",
    "/integrations/:path*",
    "/incidents/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/api/agents/:path*",
    "/api/deployments/:path*",
    "/api/infrastructure/:path*",
    "/api/costs/:path*",
    "/api/analytics/:path*",
    "/api/logs/:path*",
    "/api/team/:path*",
    "/api/integrations/:path*",
    "/api/incidents/:path*",
    "/api/settings/:path*",
    "/api/projects/:path*",
    "/api/notifications/:path*",
  ],
};
