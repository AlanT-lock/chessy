import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
        },
      }
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Upsert user row (first login creates it)
      await supabase.from('users').upsert({ id: data.user.id }, { onConflict: 'id' })
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
