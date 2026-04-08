# 🔧 Mecânica Pai e Filho — Sistema de Gestão

Sistema web completo para gestão de oficina mecânica com foco em caminhões.
Stack: Next.js 14 (App Router) + TypeScript + TailwindCSS + Supabase

---

## 📁 Estrutura de Pastas

```
mecanica-pai-filho/
├── supabase/
│   └── schema.sql              ← SQL completo do banco de dados
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Layout raiz (fonts, toaster)
│   │   ├── globals.css         ← Design system (vars, componentes)
│   │   ├── page.tsx            ← Redireciona para /dashboard
│   │   ├── dashboard/
│   │   │   ├── layout.tsx      ← Layout com sidebar + mobile nav
│   │   │   ├── page.tsx        ← 💰 Painel Financeiro
│   │   │   ├── clientes/
│   │   │   │   ├── page.tsx    ← Lista de clientes
│   │   │   │   └── [id]/page.tsx ← Detalhes do cliente
│   │   │   ├── caminhoes/
│   │   │   │   ├── page.tsx    ← Lista de caminhões
│   │   │   │   └── [id]/page.tsx ← Detalhes e histórico
│   │   │   ├── ordens/
│   │   │   │   ├── page.tsx    ← Lista de OS
│   │   │   │   ├── nova/page.tsx ← Criar nova OS
│   │   │   │   └── [id]/page.tsx ← Detalhes e gestão de pagamento
│   │   │   └── servicos/
│   │   │       └── page.tsx    ← Catálogo de peças e serviços
│   │   └── prints/
│   │       └── [id]/page.tsx   ← Versão impressão estilo nota fiscal
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     ← Sidebar desktop
│   │   │   └── MobileNav.tsx   ← Menu inferior mobile
│   │   └── forms/
│   │       ├── ClienteModal.tsx
│   │       ├── CaminhaoModal.tsx
│   │       ├── ItemServicoModal.tsx
│   │       └── DespesaModal.tsx
│   ├── lib/
│   │   └── supabase.ts         ← Client + helpers (formatação, cores)
│   └── types/
│       └── index.ts            ← Todos os TypeScript types
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## 🚀 Como rodar localmente

### 1. Clone e instale

```bash
git clone <repo>
cd mecanica-pai-filho
npm install
```

### 2. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/schema.sql`
3. Pegue as credenciais em **Settings > API**

### 3. Configure variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 4. Rode

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 🗃️ Banco de Dados — Resumo

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `clientes` | Empresas cadastradas |
| `caminhoes` | Veículos vinculados a clientes |
| `itens_servicos` | Catálogo de peças e serviços |
| `ordens_servico` | Ordens de serviço emitidas |
| `ordem_itens` | Itens de cada OS (calculado automaticamente) |
| `despesas` | Custos operacionais da oficina |

### Relacionamentos

```
clientes (1) ──→ (N) caminhoes
clientes (1) ──→ (N) ordens_servico
caminhoes (1) ──→ (N) ordens_servico
ordens_servico (1) ──→ (N) ordem_itens
itens_servicos (1) ──→ (N) ordem_itens
```

### Automações SQL (Triggers)

- `updated_at` atualizado automaticamente em todas as tabelas
- `valor_total` da OS recalculado automaticamente ao adicionar/remover itens

---

## 📱 Funcionalidades

### ✅ Implementadas

- **Financeiro**: KPIs de caixa, filtros por dia/semana/mês/período, listas por status
- **Clientes**: CRUD completo, busca, histórico de OS, caminhões vinculados
- **Caminhões**: Cadastro com placa, busca rápida, histórico de serviços
- **Peças & Serviços**: Catálogo com categorias, preços padrão, ativar/desativar
- **Ordens de Serviço**: Criação com catálogo integrado, cálculo automático, gestão de pagamentos
- **Impressão**: Versão nota fiscal simplificada para impressão
- **Despesas**: Registro de custos com categorias
- **Layout**: Sidebar desktop + menu mobile, dark mode, responsivo

### 🔜 Próximas evoluções

---

## 🔭 Roadmap SaaS

### Fase 1 — Multi-tenant
- Adicionar `tenant_id` em todas as tabelas
- Habilitar RLS no Supabase com políticas por tenant
- Sistema de autenticação (Supabase Auth)
- Planos: Básico, Pro, Ilimitado

### Fase 2 — Features Premium
- Upload de fotos por OS
- Assinatura digital do cliente
- Notificações WhatsApp (vencimentos, pagamentos)
- App mobile com React Native / Expo

### Fase 3 — Automação
- Dashboard com gráficos (Recharts/Chart.js)
- Relatórios em PDF automatizados
- Alertas de OS atrasadas por e-mail
- Integração fiscal NFSe

### Fase 4 — Inteligência
- Histórico preditivo de manutenção por caminhão
- Sugestão automática de peças por modelo/km
- Análise de lucratividade por cliente/caminhão
- API pública para integração com ERPs

---

## 🔐 Segurança (Para Produção)

Antes de ir para produção:

```sql
-- 1. Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- (repetir para todas as tabelas)

-- 2. Criar políticas por usuário autenticado
CREATE POLICY "acesso_proprio" ON clientes
  FOR ALL USING (auth.uid() = user_id);

-- 3. Adicionar user_id ou tenant_id nas tabelas
ALTER TABLE clientes ADD COLUMN user_id UUID REFERENCES auth.users;
```

---

## 🎨 Design System

- **Tema**: Dark mode industrial / fintech
- **Fontes**: Syne (display) + JetBrains Mono (código/placas)
- **Cores primárias**: Indigo (#6366f1) com gradiente brand
- **Superfícies**: Escala de surface-900 a surface-400
- **Componentes**: card, btn-primary, btn-secondary, input-field, status-badge (via @layer components no globals.css)
