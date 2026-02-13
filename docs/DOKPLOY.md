# Deploy no Dokploy (Docker)

Este projeto inclui um **Dockerfile** para rodar em Dokploy (ou qualquer host Docker) em vez da Vercel.

## Build da imagem

```bash
docker build -t hub-next .
```

## Variáveis de ambiente (obrigatórias)

Configure no Dokploy (ou no `docker run`):

- `DATABASE_URL` – PostgreSQL (use connection pooling em produção, ex.: `?connection_limit=3`)
- `NEXTAUTH_SECRET` – Segredo para sessões
- `NEXTAUTH_URL` – URL pública do app (ex.: `https://hub.seudominio.com`)
- `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` – OAuth Google
- `ALLOWED_ADMIN_EMAIL` – Email do admin (default: `jeandev003@gmail.com`)
- Opcional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` para cache
- Opcional: `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4, ex.: `G-XXXXXXXXXX`) para analytics
- Opcional: `NEXT_PUBLIC_APP_URL` (URL pública do app, para links e uploads)

## Rodar o container

```bash
docker run -p 3000:3000 --env-file .env hub-next
```

## Migrações do banco

Antes do primeiro deploy (ou após mudanças no schema), rode as migrações. Com a mesma imagem:

```bash
docker run --rm -e DATABASE_URL="postgresql://..." hub-next npx prisma migrate deploy
```

No Dokploy, você pode criar um job único (one-off) que execute esse comando, ou rodar em um container temporário com a mesma imagem e variáveis do app.

## Upload de avatar

O upload de foto de perfil grava em `public/uploads/avatars` e atualiza o campo `image` do usuário no banco. Em ambiente Docker com sistema de arquivos efêmero, a pasta pode ser perdida entre restarts. Para persistir: monte um volume no container em `/app/public/uploads` (ou ajuste o path conforme o WORKDIR). Alternativa: usar armazenamento externo (ex.: Vercel Blob, S3) e alterar a rota `/api/upload/avatar`.

## HTTPS e segurança

- Sirva o app **sempre por HTTPS** (reverse proxy no Dokploy/Nginx com TLS).
- Com HTTPS, as requisições já vão criptografadas (TLS); não envie dados sensíveis (ex.: CPF) por HTTP.
- O build de produção remove todos os `console.*` do bundle do client para não expor informações no console do navegador.
