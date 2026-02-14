# Autenticação em produção (www.hubexpresso.com)

## Problema: login OK mas páginas de conta ficam em "Carregando"

Isso acontece quando a **URL que o usuário usa** não bate com as variáveis de ambiente e com o **Google OAuth**.

- Se o site é acessado por **https://www.hubexpresso.com**, todas as URLs de auth e a configuração do Google **precisam usar exatamente** `https://www.hubexpresso.com` (com `www`).
- Se estiverem como `https://hubexpresso.com` (sem `www`), o cookie de sessão fica em outro “host” e o NextAuth não reconhece o usuário em `www`, daí a tela fica em Carregando ou volta para o login.

---

## 1. Variáveis de ambiente em produção (Vercel / etc.)

Use **exatamente** a mesma URL que o usuário vê no navegador (com `www`):

```env
# URL canônica do site (com www, pois o usuário acessa www.hubexpresso.com)
NEXTAUTH_URL=https://www.hubexpresso.com

# Callback do Google deve ser o mesmo host que NEXTAUTH_URL
AUTH_GOOGLE_REDIRECT_URI=https://www.hubexpresso.com/api/auth/callback/google

# App URL pública (links, SEO, etc.)
NEXT_PUBLIC_APP_URL=https://www.hubexpresso.com
```

As demais chaves continuam iguais, por exemplo:

- `NEXTAUTH_SECRET` (a mesma em dev e prod)
- `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`
- `DATABASE_URL`, `UPSTASH_*`, etc.

---

## 2. Google Cloud Console (OAuth)

No projeto do Google Cloud, em **APIs e serviços → Credenciais → ID do cliente OAuth 2.0 (tipo “Aplicativo da Web”)**:

### Origens JavaScript autorizadas

Inclua:

- `https://www.hubexpresso.com`

(Mantenha as que já existem, por exemplo `http://localhost:3000`, `https://hubexpresso.com`, etc., se precisar.)

### URIs de redirecionamento autorizados

Inclua:

- `https://www.hubexpresso.com/api/auth/callback/google`

Salve as alterações. Pode levar alguns minutos para propagar.

---

## 3. Checklist

- [ ] Em produção: `NEXTAUTH_URL=https://www.hubexpresso.com`
- [ ] Em produção: `AUTH_GOOGLE_REDIRECT_URI=https://www.hubexpresso.com/api/auth/callback/google`
- [ ] Em produção: `NEXT_PUBLIC_APP_URL=https://www.hubexpresso.com`
- [ ] Google: origem `https://www.hubexpresso.com` adicionada
- [ ] Google: URI de redirecionamento `https://www.hubexpresso.com/api/auth/callback/google` adicionada
- [ ] Redeploy da aplicação após alterar as variáveis (e após salvar no Google)

Depois disso, ao acessar **https://www.hubexpresso.com**, fazer login com Google e ir para Dashboard / Amigos / Admin etc., a sessão deve ser reconhecida e as páginas devem carregar normalmente.

---

## 4. Middleware e cookie seguro (HTTPS)

Em produção (HTTPS), o NextAuth define o cookie de sessão com o prefixo `__Secure-` (`__Secure-authjs.session-token`). O middleware precisa usar `secureCookie: true` ao chamar `getToken()`, senão ele procura o cookie sem prefixo e não encontra a sessão. O código do middleware já faz isso automaticamente quando a requisição é HTTPS.

---

## 5. Erro no login com Google (500 ou redirecionamento para /auth/error?error=Configuration)

Se o login retornar 500 ou o usuário for redirecionado para `/auth/error?error=Configuration`, a causa costuma ser o banco de produção sem as colunas `cpfHash` e `cpfEncrypted` na tabela `users` (o adapter do NextAuth falha ao acessar o usuário). **Execute o SQL no banco de produção** (Vercel Postgres, Supabase, etc.):

```bash
psql $DATABASE_URL -f prisma/add-cpf-columns.sql
```

Ou copie e execute o conteúdo de `prisma/add-cpf-columns.sql` no cliente SQL do seu provedor. Ou use: `npm run db:add-cpf` (com DATABASE_URL configurado). Depois disso, o login deve voltar a funcionar.

---

## 6. Reset completo do banco e rodar do zero (migrations)

Para **apagar o banco e recriar do zero** com todas as tabelas (incluindo `cpfHash` e `cpfEncrypted`), use as migrations:

```bash
npm run db:reset
```

Isso executa `prisma migrate reset --force`: **apaga todos os dados**, recria o banco e aplica todas as migrations em `prisma/migrations/`. A migração inicial (`20250212000000_init`) já cria a tabela `users` com todas as colunas necessárias para o login com Google.

**Em produção:** configure `DATABASE_URL` e rode `npm run db:reset` (ou `npx prisma migrate reset --force`) no ambiente de produção. **Atenção:** isso apaga todos os dados. Para apenas aplicar migrations sem apagar (ex.: primeiro deploy), use `npm run db:migrate` (`prisma migrate deploy`).

---

## 7. Evitar "Too many database connections" no build e em produção

- **Build:** As páginas que usam Prisma não são mais pré-renderizadas no build (uso de `force-dynamic` ou contador via API em cache), evitando muitas conexões simultâneas.
- **Produção:** Use connection pooling na `DATABASE_URL`. Ex.: `postgresql://...?connection_limit=3` ou a URL de **pooled connection** do Vercel Postgres (não a URL direta). Assim o tráfego alto não esgota o limite de conexões do banco.

---

## 8. Segurança: HTTPS e dados sensíveis (CPF)

- **Requisições criptografadas:** Em produção o site deve ser acessado **somente por HTTPS**. Assim, todo o tráfego (incluindo login e envio de CPF no onboarding) já vai criptografado (TLS). Nunca use `NEXTAUTH_URL` ou links públicos em HTTP em produção.
- **Console do navegador:** O build de produção remove todos os `console.*` do código que vai para o client; o usuário não vê logs no DevTools.
- **CPF:** Não é logado em nenhuma rota; é apenas normalizado, hasheado (cpfHash) e criptografado (cpfEncrypted) antes de persistir. Nunca escreva o valor em claro em logs ou respostas.

---

## 9. Cache (Redis)

O Redis neste projeto é usado **apenas** para cache do status da fila (`hub:queue:status`, TTL 3s). **Não afeta autenticação.** Se quiser “resetar” o cache da fila, use `invalidateQueueStatusCache()` ou `resetQueueCache()` de `@/src/lib/redis` (por exemplo numa rota de admin).

---

## 10. Erros MissingCSRF / Invalid code verifier em multi-datacenter

Quando o tráfego passa por **vários datacenters** (ex.: Cloudflare, load balancer) ou o usuário é atendido por **instâncias diferentes** entre o início do login e o callback, o cookie com o **code_verifier** (PKCE) ou o **CSRF token** pode não estar na mesma instância que processa o callback. Resultado: `MissingCSRF`, `Invalid code verifier` ou `InvalidCheck` (pkceCodeVerifier).

**Recomendações:**

- **Sticky session (recomendado):** Configure o load balancer ou o proxy (ex.: Cloudflare Load Balancing, ou o proxy na frente do Dokploy) para manter a mesma sessão (cookie ou IP) na mesma instância para as rotas `/api/auth/*`. Assim o callback do Google será processado pela mesma instância que iniciou o login.
- Confirme que `NEXTAUTH_URL` e `AUTH_GOOGLE_REDIRECT_URI` estão exatamente iguais à URL que o usuário usa (com ou sem `www`).
- Se usar apenas uma instância (um container), o problema pode ser cookie não persistido (domínio, path, SameSite) ou uso de múltiplas abas; oriente o usuário a fazer login em uma única aba.

---

## 11. Cloudflare Cache Level

O **Cache Level** do Cloudflare define **quanto do conteúdo estático** da zona é cacheado. Valores comuns:

- **Standard** – Cacheia apenas recursos estáticos (ex.: imagens, CSS, JS). Boa opção para sites com muitas páginas dinâmicas (como este).
- **Ignore query string** – Trata URLs com query strings diferentes como a mesma para cache (ex.: `?utm_source=x` não gera nova entrada). Aumenta o hit rate.
- **No query string** – Só cacheia se a URL não tiver query string.

Para **reduzir carga no origin** (ex.: servidor Dokploy) e melhorar tempo de carregamento, use **Standard** ou **Ignore query string**. Não use "Cache Everything" em rotas dinâmicas ou API.

**Alterar via API (zone setting):**

- **GET** (ler): `GET https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/cache_level`
- **PATCH** (editar): `PATCH https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/cache_level` com body `{ "value": "standard" }` (ou `"ignore"` para ignore query string). Ver [Edit Zone Setting](https://developers.cloudflare.com/api/resources/zones/subresources/settings/methods/edit/).
