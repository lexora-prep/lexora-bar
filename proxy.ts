import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function proxy(req: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname

  const publicRoutes = ["/", "/login", "/register", "/landing.html"]
  const isPublicRoute = publicRoutes.includes(pathname)

  if (!user && !isPublicRoute) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/landing.html",
    "/dashboard/:path*",
    "/rule-training/:path*",
    "/mbe/:path*",
    "/flashcards/:path*",
    "/weak-areas/:path*",
    "/rule-bank/:path*",
    "/analytics/:path*",
    "/review/:path*",
    "/settings/:path*",
  ],
}