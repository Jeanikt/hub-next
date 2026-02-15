# Planejamento v2: Monolito modular (Next.js + Fastify) e webhooks

**Objetivo:** Branch `v2` que transforma o projeto em um monolito modular com backend em Node (Fastify), Next.js consumindo a API, segurança reforçada com criptografia, e substituição de polling/crons por webhooks para filas e partidas, preparado para ~1 milhão de requisições diárias.

**Importante:** Este documento é apenas planejamento. Nenhuma alteração de código deve ser feita com base nele até a aprovação e a criação da branch `v2`.

---

## 1. Visão geral da arquitetura

### 1.1 Monolito modular

- **Next.js (frontend + BFF):**
  - Renderização (SSR/SSG), páginas, rotas de UI.
  - Rotas que **apenas** delegam para o backend (proxy/BFF): autenticação de sessão, chamadas à API Fastify com token/session.
  - Não contém lógica de negócio pesada (filas, partidas, ELO, missões). Apenas agrega dados e formata resposta para o cliente.
- **Backend Fastify (API de negócio):**
  - Serviço Node.js separado (mesmo repositório ou subpasta `packages/api` / `apps/api`).
  - Responsável por: auth (validação de JWT/session), usuários, filas, partidas, leaderboard, notificações, admin, integração Valorant, etc.
  - Consome e emite **webhooks** para eventos de fila e partida (ver seção 4).
- **Banco e cache:**
  - PostgreSQL (existente, Prisma) — único dono dos dados.
  - Redis: cache, rate limit, locks, filas internas (ex.: Bull/BullMQ) se necessário para jobs assíncronos.

### 1.2 Fluxo de uma requisição (exemplo)

1. Cliente faz requisição para o **Next.js** (ex.: `https://hubexpresso.com/api/queue/status`).
2. Next.js (BFF) valida sessão/cookie, chama o **backend Fastify** (ex.: `http://backend-interno:3001/queue/status`) com token ou session id.
3. Fastify valida token, aplica rate limit, consulta cache (Redis) ou DB, responde JSON.
4. Next.js repassa a resposta ao cliente (ou enriquece com dados de layout).

Toda a lógica de negócio (contagem na fila, regras de ELO, criação de partida) fica no Fastify; Next só orquestra e expõe a API pública.

---

## 2. Estrutura do repositório (monorepo sugerido)

```
hub-next/
├── apps/
│   ├── web/                    # Next.js (atual src/ migrado)
│   │   ├── src/
│   │   │   ├── app/            # App Router (páginas + rotas BFF que chamam api)
│   │   │   ├── components/
│   │   │   └── lib/            # auth client, fetch para API, utils
│   │   └── package.json
│   └── api/                    # Backend Fastify
│       ├── src/
│       │   ├── modules/        # modular por domínio
│       │   │   ├── auth/
│       │   │   ├── queue/
│       │   │   ├── matches/
│       │   │   ├── users/
│       │   │   ├── admin/
│       │   │   ├── webhooks/   # receptores de webhooks (fila cheia, partida encerrada)
│       │   │   └── ...
│       │   ├── lib/            # prisma, redis, logger, crypto, rate-limit
│       │   ├── plugins/
│       │   └── app.ts
│       └── package.json
├── packages/
│   ├── db/                     # Prisma schema + client (compartilhado)
│   │   ├── prisma/
│   │   └── package.json
│   └── config/                 # ESLint/TS compartilhado (opcional)
├── prisma/                     # ou apenas em packages/db
├── docs/
├── package.json                # workspace root (npm/pnpm/yarn workspaces)
└── turbo.json                  # opcional (Turborepo)
```

- **apps/web:** Next.js; dependência em `@hub/db` e em `apps/api` apenas em tempo de build para tipos (ou API client gerado). Em runtime, web chama a API via HTTP.
- **apps/api:** Fastify; dependência em `@hub/db`; expõe API interna (não pública na internet, atrás do mesmo host ou rede interna).

---

## 3. Segurança e criptografia

### 3.1 Princípios

- **Defesa em profundidade:** validação no BFF (Next) e no Fastify (autorização real).
- **Dados em trânsito:** TLS 1.2+ em tudo (cliente ↔ Next, Next ↔ Fastify, Fastify ↔ DB/Redis). Em produção, Fastify pode rodar atrás de um reverse proxy (Nginx/Caddy) que termina TLS.
- **Dados em repouso:** campos sensíveis (ex.: CPF já existente como `cpfEncrypted`) com AES-256-GCM; chaves em vault ou variáveis de ambiente, nunca em código.
- **Secrets:** todas as chaves (DB, Redis, JWT, API Valorant, webhooks) em variáveis de ambiente ou secret manager (ex.: Doppler, Vault). Rotação sem redeploy (lendo env a cada boot ou sob demanda).

### 3.2 Autenticação e autorização

- **NextAuth (ou similar) no Next.js:** mantém sessão/cookie para o usuário no browser; gera um **token opaco ou JWT** de curta duração para chamadas ao backend.
- **Fastify:** valida em toda rota protegida:
  - **JWT:** assinado com segredo forte (HS256 ou RS256); claim `sub` = userId; exp curto (ex.: 15 min); refresh via endpoint no Next ou no próprio Fastify.
  - **Ou session token:** Next envia session id; Fastify consulta store (Redis ou DB) e carrega usuário. Preferir JWT para reduzir round-trip e carga no store.
- **Webhooks (servidor → Fastify):** autenticação por **assinatura (HMAC)** ou **token fixo** em header:
  - Ex.: `X-Webhook-Signature: sha256=...` (body hasheado com secret compartilhado).
  - Ou `Authorization: Bearer WEBHOOK_SECRET_QUEUE` / `WEBHOOK_SECRET_MATCH`.
  - Fastify rejeita qualquer chamada sem assinatura válida (403/401).

### 3.3 Rate limiting e proteção

- **Por IP e por usuário:** no Fastify (ex.: `@fastify/rate-limit` com store Redis) para evitar abuso (ex.: 100 req/min por user, 500/min por IP para rotas pesadas).
- **Webhooks:** rate limit por origem (ex.: 10 req/min por tipo de webhook) e lista branca de IPs se possível.
- **CORS:** restrito ao domínio do front (ex.: `https://hubexpresso.com`). API Fastify não exposta ao browser diretamente se o BFF fizer proxy; se exposta, CORS restrito.

### 3.4 Criptografia de dados sensíveis

- **Campos já existentes (ex.: CPF):** manter padrão atual (hash para unicidade + cifra AES-256-GCM); chave em `ENCRYPTION_KEY` (32 bytes para AES-256).
- **Novos campos sensíveis:** mesmo padrão; nunca logar ou retornar texto claro em respostas.
- **Logs:** nenhum dado sensível (CPF, token, senha); apenas IDs e eventos (ex.: `user_id`, `match_id`, `event`).

---

## 4. Webhooks: fila e partida

### 4.1 Problema atual

- **Fila:** ao completar 10 jogadores na fila, a criação da partida e remoção da fila acontecem no próprio `queue/join` (Next) + cron a cada 15s que apenas atualiza `pending` → `in_progress` quando já há 10 na partida. Ou seja, há polling (cron) para “iniciar” partidas pending.
- **Partida:** cron a cada 1 min chama API Henrik (Valorant) para ver se a partida acabou e atualiza status, ELO, XP no banco.

### 4.2 Modelo desejado (evento-driven)

- **Fila com 10 jogadores (ou 2 para 2v2):**
  - **Emissor:** o serviço que detecta “fila cheia” (hoje pode ser o próprio `queue/join` no Next ou um worker no Fastify que consulta a fila). Em v2, **recomendação:** após inserir o 10º na fila, o **backend Fastify** (rota `POST /queue/join`) cria a partida na mesma transação e **emite um webhook interno** (ou evento) para “queue_ready” / “match_created”.
  - **Receptor (webhook):** um **endpoint no Fastify** `POST /webhooks/internal/queue-ready` (ou nome similar) que:
    - Recebe payload: `{ queueType, matchId, playerIds, ... }`.
    - Autenticação: HMAC ou Bearer interno.
    - Atualiza status no DB (ex.: partida para `in_progress`), invalida cache da fila, e pode disparar notificações (Pusher/SSE) para os 10 jogadores.
  - **Economia:** elimina o cron de 15s para “start pending”. A transição “fila cheia → partida criada e in_progress” ocorre em uma única transação no backend quando o 10º entra; o webhook é apenas para desacoplar notificações e side-effects (logs, métricas).

- **Partida encerrada:**
  - **Emissor:** hoje não existe webhook da Riot/Valorant para “match ended”. Então o **emissor** continua sendo um **worker** (processo separado ou job agendado) que:
    - A cada X minutos (ex.: 1–2 min) consulta a API Henrik para partidas `in_progress`.
    - Quando detecta que a partida terminou, **chama o webhook do backend**: `POST /webhooks/internal/match-ended`.
  - **Receptor (Fastify):** `POST /webhooks/internal/match-ended`:
    - Payload: `{ matchId, valorantMatchId, results: { playerId, kills, deaths, ... }, ... }`.
    - Valida assinatura/token.
    - Atualiza `GameMatch` (status `finished`), calcula ELO/XP, atualiza usuários, missões, invalida cache.
  - **Economia:** o cron “check-matches” deixa de rodar dentro do Next; vira um **worker leve** que só faz polling na Henrik e dispara um único HTTP para o Fastify. Toda a lógica pesada (DB, ELO, missões) fica no backend, uma vez por partida, sob demanda.

### 4.3 Resumo dos webhooks (interno)

| Evento            | Emissor                         | Receptor (Fastify)                    | Payload (exemplo) |
|------------------|----------------------------------|----------------------------------------|-------------------|
| queue_ready       | Backend ao criar partida (10 na fila) | Opcional: mesmo processo ou `POST /webhooks/internal/queue-ready` | `queueType, matchId, playerIds` |
| match_ended       | Worker (polling Henrik)          | `POST /webhooks/internal/match-ended`  | `matchId, results, metadata` |

- **Autenticação:** header `X-Webhook-Secret` ou `Authorization: Bearer <WEBHOOK_INTERNAL_SECRET>`; validar em middleware Fastify antes de qualquer handler de webhook.

---

## 5. Backend Fastify (módulos e rotas)

### 5.1 Módulos sugeridos (por domínio)

- **auth:** validação JWT/session; refresh token; logout (invalidar token/session).
- **users:** perfil, atualização, contagem (com cache).
- **queue:** join, leave, status (leitura com cache Redis).
- **matches:** criar (via webhook ou interna), get, join, cancel, finish (via webhook), valorant-code.
- **webhooks:** rotas `POST /webhooks/internal/queue-ready`, `POST /webhooks/internal/match-ended` (e futuros).
- **admin:** dashboard, queues, users, reports, tickets, missions, settings (com mesmo controle de admin por email).
- **notifications, friends, referrals, support, reports, leaderboard, onboarding, valorant:** espelhar as atuais rotas da API Next, movendo lógica para o Fastify.

Cada módulo pode ter: `routes.ts`, `service.ts`, `schema.ts` (validação com Zod ou similar).

### 5.2 Rotas que viram apenas proxy no Next

- Next mantém as mesmas URLs públicas (ex.: `/api/queue/status`) para não quebrar o front.
- Internamente, Next chama Fastify (ex.: `GET http://api/queue/status`) com o token do usuário e repassa a resposta. Nenhuma lógica de negócio no Next além de “chamar e retornar”.

### 5.3 Cron/workers que viram processos separados

- **Start pending matches:** removido; substituído pela lógica “ao 10º na fila” no backend (e opcional webhook para side-effects).
- **Check matches (Valorant):** vira **worker** (script Node ou pequeno serviço):
  - Lê partidas `in_progress` do DB (ou da API Fastify) ou mantém lista em memória.
  - A cada 1–2 min, chama API Henrik; quando partida terminou, chama `POST /webhooks/internal/match-ended` no Fastify.
- **Sync ELO / outros:** podem virar jobs agendados no Fastify (ex.: cron-expression) ou workers que chamam endpoints internos protegidos.

---

## 6. Escalabilidade e ~1 milhão de requisições/dia

### 6.1 Números

- 1M req/dia ≈ **~12 req/s** em média; com pico 3–5x, algo como **40–60 req/s**.
- Objetivo: manter latência p99 < 500 ms nas rotas críticas (queue/status, queue/join, matches).

### 6.2 Estratégias

- **Cache (Redis):**
  - Queue status: já existe; TTL curto (ex.: 3 s); invalidar em join/leave e ao criar partida.
  - Users count, leaderboard, configurações: TTL maior (ex.: 60 s).
  - Chave por tipo de dado + parâmetros (ex.: `hub:queue:status`, `hub:leaderboard:global`).
- **Connection pooling:** Prisma/PostgreSQL com pool limit (ex.: 20–50 conexões por instância); Redis connection pool ou single connection por instância (ioredis já gerencia).
- **Leitura do banco:** preferir índices nas colunas usadas em `where`/`orderBy` (ex.: `queueEntry.queueType`, `gameMatch.status`, `gameMatch.createdAt`). Revisar queries N+1; usar `include`/`select` mínimos.
- **Rate limit:** por usuário e por IP no Fastify para evitar picos de um único cliente.
- **Next.js:** estático (SSG) onde possível; ISR para páginas que mudam pouco; API routes só como BFF (pouca CPU).
- **Backend:** uma instância Fastify pode lidar com milhares de req/s em rotas simples; para 40–60 req/s, uma instância é suficiente; horizontal scaling atrás de um load balancer quando crescer.
- **Worker (match-ended):** uma única instância do worker de polling Henrik + webhook é suficiente; pode rodar no mesmo host ou em container separado.

### 6.3 Monitoramento e observabilidade

- Logs estruturados (JSON) no Fastify (ex.: pino); nível info/error; sem dados sensíveis.
- Métricas: contagem de requisições por rota, latência (ex.: Prometheus + Grafana ou provedor managed).
- Alertas: erro 5xx acima de threshold, latência p99 alta, fila Redis/DB crescendo.

---

## 7. Migração e ordem de execução sugerida (quando implementar)

1. **Branch e monorepo:** criar `v2`; estruturar `apps/web`, `apps/api`, `packages/db` sem quebrar o `main`.
2. **packages/db:** extrair Prisma para pacote compartilhado; `apps/api` e `apps/web` dependem dele.
3. **Fastify mínimo:** servidor que sobe, health check, middleware de auth (JWT) e de webhook (secret). Uma rota de exemplo (ex.: `GET /users/me`).
4. **Auth:** Next continua com NextAuth; gera JWT para o backend; Fastify valida JWT em rotas protegidas.
5. **Migrar rotas críticas:** queue (join, leave, status), matches (criar, get, join, cancel, finish), webhooks (queue_ready, match_ended). Manter contrato (request/response) igual ao atual para o front.
6. **Worker match-ended:** script que faz polling Henrik e chama `POST /webhooks/internal/match-ended`.
7. **Next BFF:** trocar implementação das rotas `/api/*` por proxy para Fastify; remover crons de dentro do Next (instrumentation).
8. **Admin e demais módulos:** migrar em lotes (admin, users, friends, notifications, etc.).
9. **Segurança e hardening:** revisar CORS, rate limit, secrets, criptografia; testes de carga.
10. **Docs e deploy:** documentar variáveis de ambiente, arquitetura, e pipeline de deploy (Next + API + worker).

---

## 8. Checklist de segurança (v2)

- [ ] TLS em todas as comunicações externas e, se aplicável, entre Next e Fastify.
- [ ] JWT com exp curto e refresh controlado; secret forte e rotacionável.
- [ ] Webhooks internos com autenticação (HMAC ou Bearer) e rate limit.
- [ ] Nenhum dado sensível em logs; campos criptografados com AES-256-GCM.
- [ ] Rate limit por usuário e por IP no Fastify.
- [ ] CORS restrito ao domínio do front.
- [ ] Dependências sem vulnerabilidades conhecidas (npm audit / Snyk).
- [ ] Variáveis de ambiente e secrets não commitados; uso de secret manager em produção.

---

## 9. Resumo

- **Arquitetura:** monolito modular (Next.js como front + BFF, Fastify como API de negócio), mesmo repositório (monorepo), DB e Redis compartilhados.
- **Segurança:** TLS, JWT, webhooks assinados, rate limit, criptografia para dados sensíveis, sem logs sensíveis.
- **Webhooks:** (1) “Fila cheia” tratada no próprio backend ao criar partida; webhook interno opcional para notificações. (2) “Partida encerrada” por worker que faz polling na API Valorant e chama `POST /webhooks/internal/match-ended` no Fastify; cron dentro do Next removido.
- **Escala:** cache Redis, connection pooling, índices, rate limit e uma instância Fastify suficientes para ~1M req/dia; horizontal scaling e worker dedicado quando necessário.

Este documento serve apenas como **planejamento**. A implementação deve ocorrer apenas após aprovação e na branch `v2`, sem alterar o código atual na `main`.
