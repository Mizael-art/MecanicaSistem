'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCurrency, formatDate, formatCNPJ, formatPlaca } from '@/lib/supabase'
import { OrdemItem } from '@/types'

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { background: #f5f5f5; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #fff; color: #111;
    padding: 36px 40px; max-width: 740px;
    margin: 24px auto; border: 1px solid #e5e7eb;
    border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  }
  .hd { text-align: center; border-bottom: 2px solid #111; padding-bottom: 18px; margin-bottom: 22px; }
  .hd-empresa { font-size: 20px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
  .hd-sub { font-size: 11px; color: #777; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .hd-num { font-size: 30px; font-weight: 900; margin: 14px 0 4px; letter-spacing: -1px; }
  .hd-date { font-size: 12px; color: #666; }
  .badge { display: inline-block; margin-top: 12px; padding: 4px 16px; border: 2px solid; font-weight: 900; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; border-radius: 2px; }
  .sec { margin-bottom: 22px; }
  .sec-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #888; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 28px; }
  .info-item label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #999; display: block; margin-bottom: 2px; }
  .info-item span { font-size: 13px; font-weight: 700; color: #111; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #f9fafb; }
  th { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #666; padding: 7px 6px; border-bottom: 2px solid #e5e7eb; text-align: left; }
  th.r, td.r { text-align: right; }
  td { padding: 8px 6px; border-bottom: 1px solid #f3f4f6; color: #222; }
  tr:last-child td { border-bottom: none; }
  .total-wrap { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .total-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #555; }
  .total-value { font-size: 22px; font-weight: 900; color: #111; }
  .obs { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; font-size: 13px; color: #444; line-height: 1.5; }
  .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 52px; }
  .sig-line { border-top: 1px solid #aaa; padding-top: 8px; text-align: center; font-size: 11px; color: #888; }
  .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #bbb; border-top: 1px solid #f0f0f0; padding-top: 14px; }
  @media print {
    html { background: #fff; }
    body { margin: 0; padding: 20px; border: none; box-shadow: none; border-radius: 0; }
    .no-print { display: none !important; }
  }
`

export default function PrintPage({ params }: { params: { id: string } }) {
  const [os, setOs]         = useState<any>(null)
  const [itens, setItens]   = useState<OrdemItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('ordens_servico').select('*, clientes(*), caminhoes(*)').eq('id', params.id).single(),
      supabase.from('ordem_itens').select('*').eq('ordem_id', params.id).order('categoria'),
    ]).then(([osRes, itensRes]) => {
      setOs(osRes.data)
      setItens(itensRes.data || [])
      setLoading(false)
    })
  }, [params.id])

  if (loading) return (
    <html lang="pt-BR">
      <head><title>Carregando...</title><style>{css}</style></head>
      <body><div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Carregando OS...</div></body>
    </html>
  )

  if (!os) return (
    <html lang="pt-BR">
      <head><title>OS não encontrada</title><style>{css}</style></head>
      <body style={{ fontFamily: 'sans-serif', padding: 32, color: '#333' }}>
        <p>OS não encontrada.</p>
        <a href="/dashboard/ordens" style={{ color: 'var(--brand-600)' }}>← Voltar para Ordens</a>
      </body>
    </html>
  )

  const cliente  = os.clientes
  const caminhao = os.caminhoes
  const servicos = itens.filter(i => i.categoria === 'servico')
  const pecas    = itens.filter(i => i.categoria === 'peca')

  const statusLabel: Record<string, string> = { pago: 'PAGO', pendente: 'PENDENTE', atrasado: 'EM ATRASO' }
  const statusColor: Record<string, string> = { pago: '#16a34a', pendente: '#d97706', atrasado: '#dc2626' }
  const cor = statusColor[os.status_pagamento] || '#555'

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>OS #{String(os.numero).padStart(4, '0')} — Mecânica Pai e Filho</title>
        <style>{css}</style>
      </head>
      <body>
        <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
          <button onClick={() => window.print()}
            style={{ padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>
            🖨️ Imprimir
          </button>
          <a href={`/dashboard/ordens/${os.id}`}
            style={{ padding: '8px 16px', background: '#f3f4f6', color: '#333', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ← Voltar
          </a>
        </div>

        <div className="hd">
          <div className="hd-empresa">🔧 Mecânica Pai e Filho</div>
          <div className="hd-sub">Ordem de Serviço</div>
          <div className="hd-num">OS #{String(os.numero).padStart(4, '0')}</div>
          <div className="hd-date">Emitida em {formatDate(os.data_abertura)}</div>
          <div><span className="badge" style={{ borderColor: cor, color: cor }}>{statusLabel[os.status_pagamento] || os.status_pagamento.toUpperCase()}</span></div>
        </div>

        <div className="sec">
          <div className="sec-title">Dados do Cliente e Veículo</div>
          <div className="info-grid">
            {os.descricao_avulsa ? (
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <label>Descrição do Serviço</label>
                <span>{os.descricao_avulsa}</span>
              </div>
            ) : (
              <>
                <div className="info-item">
                  <label>Cliente / Empresa</label>
                  <span>{cliente?.nome || '—'}</span>
                </div>
                {cliente?.cnpj && <div className="info-item"><label>CNPJ</label><span>{formatCNPJ(cliente.cnpj)}</span></div>}
                {cliente?.telefone && <div className="info-item"><label>Telefone</label><span>{cliente.telefone}</span></div>}
                {cliente?.email && <div className="info-item"><label>E-mail</label><span>{cliente.email}</span></div>}
              </>
            )}
            {caminhao && (
              <>
                <div className="info-item">
                  <label>Placa</label>
                  <span style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 2 }}>{formatPlaca(caminhao.placa)}</span>
                </div>
                <div className="info-item">
                  <label>Veículo</label>
                  <span>{caminhao.marca} {caminhao.modelo}{caminhao.ano ? ` / ${caminhao.ano}` : ''}</span>
                </div>
              </>
            )}
            {os.data_vencimento && (
              <div className="info-item">
                <label>Vencimento</label>
                <span style={{ color: os.status_pagamento === 'atrasado' ? '#dc2626' : '#111' }}>{formatDate(os.data_vencimento)}</span>
              </div>
            )}
            {os.data_pagamento && (
              <div className="info-item">
                <label>Pago em</label>
                <span style={{ color: '#16a34a' }}>{formatDate(os.data_pagamento)}</span>
              </div>
            )}
          </div>
        </div>

        {os.valor_manual && itens.length === 0 && (
          <div className="sec">
            <div className="sec-title">Serviço</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ color: '#444' }}>Valor do serviço</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(os.valor_manual)}</span>
            </div>
          </div>
        )}

        {servicos.length > 0 && (
          <div className="sec">
            <div className="sec-title">Mão de Obra / Serviços</div>
            <table>
              <thead><tr><th>Descrição</th><th className="r" style={{ width: 60 }}>Qtd</th><th className="r" style={{ width: 90 }}>Unit.</th><th className="r" style={{ width: 100 }}>Subtotal</th></tr></thead>
              <tbody>
                {servicos.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.descricao}</td>
                    <td className="r">{item.quantidade}</td>
                    <td className="r">{formatCurrency(item.preco_unitario)}</td>
                    <td className="r" style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pecas.length > 0 && (
          <div className="sec">
            <div className="sec-title">Peças / Materiais</div>
            <table>
              <thead><tr><th>Descrição</th><th className="r" style={{ width: 60 }}>Qtd</th><th className="r" style={{ width: 90 }}>Unit.</th><th className="r" style={{ width: 100 }}>Subtotal</th></tr></thead>
              <tbody>
                {pecas.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.descricao}</td>
                    <td className="r">{item.quantidade}</td>
                    <td className="r">{formatCurrency(item.preco_unitario)}</td>
                    <td className="r" style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="sec">
          <div className="total-wrap">
            <span className="total-label">Total Geral</span>
            <span className="total-value">{formatCurrency(os.valor_total)}</span>
          </div>
        </div>

        {os.observacoes && (
          <div className="sec">
            <div className="sec-title">Observações</div>
            <div className="obs">{os.observacoes}</div>
          </div>
        )}

        <div className="sigs">
          <div className="sig-line">Assinatura do Cliente</div>
          <div className="sig-line">Mecânica Pai e Filho</div>
        </div>

        <div className="footer">
          <p>Mecânica Pai e Filho — Sistema de Gestão</p>
          <p style={{ marginTop: 3 }}>Este documento não possui valor fiscal</p>
        </div>
      </body>
    </html>
  )
}
