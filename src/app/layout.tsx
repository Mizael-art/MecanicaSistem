import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/contexts/ThemeContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Mecânica Pai e Filho',
  description: 'Sistema de gestão para oficina mecânica',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              fontFamily: 'var(--font-inter)',
              fontSize: '13px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: 'var(--card-bg)' } },
            error: { iconTheme: { primary: '#ef4444', secondary: 'var(--card-bg)' } },
          }}
        />
        </ThemeProvider>
      </body>
    </html>
  )
}
