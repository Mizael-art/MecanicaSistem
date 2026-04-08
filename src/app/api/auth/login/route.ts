import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const USUARIO = 'smaniotto'
const SENHA   = 'smaniotto'
const TOKEN   = 'mecanica-auth-ok'

export async function POST(req: Request) {
  const { usuario, senha } = await req.json()

  if (usuario === USUARIO && senha === SENHA) {
    cookies().set('auth_token', TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 6, // 6 horas
      path: '/',
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
}
