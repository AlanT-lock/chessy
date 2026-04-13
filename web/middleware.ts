import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { searchParams, origin, pathname } = new URL(request.url)
  const code = searchParams.get('code')

  // If an auth code lands on the root page, redirect to the callback handler
  if (pathname === '/' && code) {
    const callbackUrl = new URL('/api/auth/callback', origin)
    callbackUrl.searchParams.set('code', code)
    return NextResponse.redirect(callbackUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
