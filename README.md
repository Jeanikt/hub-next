# HUBEXPRESSO

Hub de players para **Valorant**: matchmaking por filas competitivas, partidas, ranking por ELO e integração com conta Riot. Front em Next.js (App Router) com autenticação Google, painel admin restrito e atualizações em tempo real (Pusher + Redis).

---

## Stack

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Framework     | Next.js 16 (App Router)             |
| Auth          | NextAuth v5 (Google OAuth, JWT)     |
| Banco         | PostgreSQL + Prisma ORM             |
| Estilo        | Tailwind CSS v4                     |
| Real-time     | Pusher (canal público para filas)   |
| Cache         | Upstash Redis (opcional)             |
| Validação     | Zod                                 |
| Ícones        | Lucide React                        |

---

## Pré-requisitos

- **Node.js** 18+
- **npm** (ou yarn/pnpm)
- **PostgreSQL** (local ou remoto)
- Conta **Google Cloud** (OAuth)
- (Opcional) Conta **Pusher** e **Upstash** para real-time e cache

---

## Instalação e primeiro uso

### 1. Clonar e instalar dependências

```bash
git clone <url-do-repositorio>
cd hub-next
npm install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as variáveis listadas na seção [Variáveis de ambiente](#variáveis-de-ambiente). Se existir `.env.example`, você pode copiá-lo:

```bash
cp .env.example .env
# Edite .env com suas chaves
```

Mínimo para rodar em desenvolvimento:

- `DATABASE_URL` – connection string PostgreSQL
- `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` – credenciais OAuth Google
- `NEXTAUTH_SECRET` – string aleatória (ex: `openssl rand -base64 32`)
- `NEXTAUTH_URL` – em dev: `http://localhost:3000`

### 3. Banco de dados

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

Ou use `npx prisma db seed` (requer `tsx`: `npm i -D tsx`). O seed cria as missões iniciais (diárias, semanais, únicas) na tabela `missions`. Se já houver missões, nada é inserido.

**Importante:** após alterar o `schema.prisma`, rode sempre `npx prisma generate` para atualizar o cliente (e reinicie o servidor de desenvolvimento se estiver rodando).

Se o banco já existir com tabelas do Auth (Laravel ou outro), pode ser necessário rodar os SQL em `prisma/` (ex.: `create-auth-tables.sql`, `add-users-columns.sql`) antes ou em vez das migrations, conforme o estado do schema.

**Erro "table/column does not exist" (missions, support_tickets, profileBackgroundUrl, etc.):**  
Se o PostgreSQL foi criado por outro sistema e faltam tabelas/colunas do Prisma, aplique o script que cria apenas o que falta:

```bash
# No diretório do projeto (substitua pela sua connection string se necessário)
psql "$DATABASE_URL" -f prisma/apply-missing-postgres.sql
```

Depois rode `npx prisma generate` e `npm run db:seed`.

### 4. Subir o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Login via **Entrar com Google**.

---

## Estrutura do projeto

```
hub-next/
├── prisma/
│   ├── schema.prisma       # Modelos (User, QueueEntry, GameMatch, etc.)
│   ├── migrations/         # Migrations Prisma
│   └── *.sql               # Scripts manuais (auth, colunas extras)
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Layout raiz + Sidebar
│   │   ├── page.tsx        # Home
│   │   ├── components/     # Sidebar, AppNav, HubLayout
│   │   ├── (auth)/         # login, register, forgot-password, etc.
│   │   ├── dashboard/      # Painel do usuário
│   │   ├── queue/          # Fila e sala de espera
│   │   ├── matches/        # Partidas
│   │   ├── admin/          # Painel admin (restrito por e-mail)
│   │   └── api/            # Rotas API (auth, queue, admin, etc.)
│   ├── lib/
│   │   ├── auth.ts         # NextAuth (auth, signIn, signOut)
│   │   ├── auth.config.ts  # Callbacks e providers
│   │   ├── prisma.ts       # Cliente Prisma singleton
│   │   ├── admin.ts        # isAllowedAdmin (e-mail admin)
│   │   ├── redis.ts        # Cache Upstash (filas)
│   │   ├── pusher.ts       # Real-time (trigger filas/notificações)
│   │   ├── rankPoints.ts   # Pontuação ELO (0–20) e regras de fila
│   │   ├── valorant.ts      # Cliente API Henrik (conta, MMR)
│   │   └── validators/     # Schemas Zod
│   ├── types/              # Tipos API (toSafeUser, etc.)
│   └── middleware.ts      # Proteção de rotas, onboarding, admin
└── package.json
```

- **Rotas públicas:** home, leaderboard, users, tournaments, missions, parceiros.
- **Rotas autenticadas:** dashboard, queue, matches, friends, profile, notifications, support.
- **Admin:** apenas o e-mail em `ALLOWED_ADMIN_EMAIL` acessa `/admin` (middleware + layout + APIs).

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string PostgreSQL |
| `AUTH_GOOGLE_ID` | Sim | Client ID OAuth Google |
| `AUTH_GOOGLE_SECRET` | Sim | Client secret OAuth Google |
| `NEXTAUTH_SECRET` | Sim | Chave para JWT/session (ex: `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Sim | URL da app (dev: `http://localhost:3000`) |
| `ALLOWED_ADMIN_EMAIL` | Não | E-mail único que acessa `/admin` (padrão: `jeandev003@gmail.com`) |
| `VALORANT_API_KEY` ou `VALORANT_KEY` | Não | API key Henrik (conta Riot + MMR) |
| `PUSHER_APP_ID` | Não | App ID Pusher (real-time) |
| `PUSHER_KEY` | Não | Key Pusher |
| `PUSHER_SECRET` | Não | Secret Pusher |
| `PUSHER_CLUSTER` | Não | Cluster (ex: `us2`) |
| `NEXT_PUBLIC_PUSHER_KEY` | Não | Key Pusher no cliente (pode ser igual a `PUSHER_KEY`) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Não | Cluster no cliente |
| `UPSTASH_REDIS_REST_URL` | Não | URL REST Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Não | Token Upstash Redis |
| `NEXT_PUBLIC_APP_NAME` | Não | Nome exibido no layout (padrão: HUBEXPRESSO) |
| `CRON_SECRET` ou `CRON_API_KEY` | Não | Segredo para chamar o cron de sync ELO (`GET /api/cron/sync-elo?secret=...` ou `Authorization: Bearer ...`) |

Sem Pusher/Redis o app continua funcionando: filas usam polling; cache de status da fila fica desativado.

**Cron – Sync ELO:** para atualizar o ELO de todos os usuários com conta Riot em background, agende uma requisição para `GET /api/cron/sync-elo` passando o segredo em query (`?secret=SEU_CRON_SECRET`) ou no header `Authorization: Bearer SEU_CRON_SECRET`. Ex.: a cada 6–12 horas (Dokploy, Vercel Cron, cron do SO, etc.).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção (após `build`) |
| `npm run lint` | ESLint |

Prisma (fora do package.json):

- `npx prisma generate` – gera cliente a partir do schema
- `npx prisma migrate dev` – cria e aplica migration em dev
- `npx prisma migrate deploy` – aplica migrations em produção

---

## Funcionalidades principais

### Autenticação

- Login com **Google** (NextAuth).
- Sessão JWT; dados extras (username, isAdmin, onboardingCompleted) vêm do banco no `signIn` e são guardados no token.

### Filas competitivas

- Três tipos: **Low ELO** (até Gold), **High ELO** (Plat+), **Inclusiva** (todos).
- Entrada na fila exige **conta Riot vinculada** (perfil ou onboarding). O rank é obtido via API Henrik e convertido em pontos (0–20); as filas são liberadas conforme esse ELO.
- **Sala de espera** por tipo de fila; quando completam 10 jogadores, uma partida é criada e os usuários são redirecionados.

### Ranking / ELO

- Pontuação no formato “GC”: 0 (Ferro) a 20 (Radiante), a partir do rank atual da Riot (`rankPoints.ts`).
- Vincular Riot no onboarding ou no perfil: validação de conta na API, checagem de duplicidade no banco e atualização de rank/elo.

### Real-time e desempenho

- **Pusher:** evento `status-update` no canal `queue` ao entrar/sair da fila; o cliente assina e recarrega o status (além do polling a cada 8s).
- **Redis (Upstash):** cache do resultado de status das filas (TTL 3s); invalidação em join/leave. Reduz carga no banco e melhora tempo de resposta no Vercel.

### Admin

- Acesso **apenas** para o e-mail em `ALLOWED_ADMIN_EMAIL`.
- Dashboard (métricas), usuários (listar, banir/desbanir), filas (jogadores por tipo), tickets (stub) e reports.

---

## Banco de dados

- **PostgreSQL** + **Prisma**.
- Modelos principais: User (com campos do Auth + riotId, tagline, rank, elo, level, etc.), Account, Session, QueueEntry, GameMatch, GameMatchUser, Friend, FriendMessage, LobbyMessage.
- Em ambientes que já tinham tabelas de auth/usuários, podem existir scripts em `prisma/*.sql` para criar tabelas do NextAuth ou colunas extras; use conforme a documentação interna ou o histórico do projeto.

---

## Deploy (Vercel)

1. Conectar o repositório ao Vercel.
2. Configurar todas as [variáveis de ambiente](#variáveis-de-ambiente) no painel do projeto.
3. Build: o Vercel usa `npm run build`; garantir que `prisma generate` rode no build (geralmente via `postinstall` ou script de build).
4. **Pusher** e **Upstash** funcionam em serverless; não é preciso servidor WebSocket próprio.

---

## Referências

- [Next.js](https://nextjs.org/docs)
- [NextAuth.js](https://authjs.dev/)
- [Prisma](https://www.prisma.io/docs)
- [Pusher](https://pusher.com/docs)
- [Upstash Redis](https://upstash.com/docs/redis)
- [API Henrik (Valorant)](https://docs.henrikdev.xyz/valorant)

---

## Licença

Projeto privado – HUBEXPRESSO.
