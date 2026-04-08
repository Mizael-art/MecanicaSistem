'use client'
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        marginBottom: 24, padding: '8px 20px', cursor: 'pointer',
        background: '#111', color: '#fff', border: 'none', borderRadius: 4,
        fontSize: 14, fontFamily: 'inherit'
      }}
    >
      🖨️ Imprimir
    </button>
  )
}
