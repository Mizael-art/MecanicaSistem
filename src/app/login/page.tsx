'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [usuario, setUsuario]     = useState('')
  const [senha, setSenha]         = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro]           = useState('')
  const [loading, setLoading]     = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    })
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setErro('Usuário ou senha incorretos.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-body)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Wrench size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mecânica Pai e Filho</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sistema de Gestão</p>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="text-base font-semibold text-center" style={{ color: 'var(--text-secondary)' }}>Entrar no sistema</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Usuário</label>
              <input className="input-field" placeholder="Digite seu usuário"
                value={usuario} onChange={e => setUsuario(e.target.value)}
                autoComplete="username" autoFocus />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input type={showSenha ? 'text' : 'password'} className="input-field pr-10"
                  placeholder="Digite sua senha"
                  value={senha} onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showSenha ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            {erro && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                {erro}
              </div>
            )}
            <button type="submit" disabled={loading || !usuario || !senha} className="btn-primary w-full py-3">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Entrando...</>
                : <><LogIn size={16}/> Entrar</>}
            </button>
          </form>
        </div>
        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>Acesso restrito — uso interno</p>
      </div>
    </div>
  )
}
