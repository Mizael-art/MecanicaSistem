import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TOKEN = 'mecanica-auth-ok'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value

  // Rotas públicas — login e API de auth passam sempre
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    // Se já logado e foi para /login, redireciona pro dashboard
    if (pathname === '/login' && token === TOKEN) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Tudo mais exige autenticação
  if (token !== TOKEN) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
