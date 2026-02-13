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

## 5. Cache (Redis)

O Redis neste projeto é usado **apenas** para cache do status da fila (`hub:queue:status`, TTL 3s). **Não afeta autenticação.** Se quiser “resetar” o cache da fila, use `invalidateQueueStatusCache()` ou `resetQueueCache()` de `@/src/lib/redis` (por exemplo numa rota de admin).
