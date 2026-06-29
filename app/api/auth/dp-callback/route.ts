import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/data-portability'

export const runtime = 'nodejs'

/**
 * GET /api/auth/dp-callback
 * Google redirects here after user approves DPAPI scopes
 * We exchange the code for tokens, then redirect to import page
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state') || '/'

  if (error) {
    return NextResponse.redirect(
      new URL(`/import?error=${encodeURIComponent(error)}`, req.url)
    )
  }
  if (!code) {
    return NextResponse.redirect(new URL('/import?error=no_code', req.url))
  }

  try {
    const { accessToken, refreshToken } = await exchangeCodeForTokens(
      code,
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      `${process.env.NEXTAUTH_URL}/api/auth/dp-callback`
    )

    // Store token in a short-lived httpOnly cookie, redirect to import page
    // The import page reads this token, calls /api/portability, then clears it
    const res = NextResponse.redirect(
      new URL('/import?mode=portability&auto=1', req.url)
    )
    res.cookies.set('dp_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 hour — token lifetime
      sameSite: 'lax',
      path: '/',
    })
    return res
  } catch (err: any) {
    console.error('DP callback error:', err)
    return NextResponse.redirect(
      new URL(`/import?error=${encodeURIComponent(err.message)}`, req.url)
    )
  }
}
