# Google Analytics 4 (GA4) – Passo a passo

Este projeto está preparado para enviar dados de tráfego e eventos para o **Google Analytics 4**. Nenhum dado sensível (PII, CPF, e-mail) é enviado.

---

## 1. Criar propriedade no Google Analytics

1. Acesse [Google Analytics](https://analytics.google.com/) e entre com sua conta Google.
2. Clique em **Admin** (engrenagem) → **Criar propriedade**.
3. Nome da propriedade: ex. `HUBEXPRESSO`.
4. Fuso e moeda: Brasil / Real.
5. Avance e crie a propriedade. Se perguntado, crie também um **fluxo de dados da Web**.
6. No fluxo da Web, escolha **URL do site** (ex. `https://hubexpresso.com`) e nome do fluxo (ex. `Hub Next`).
7. Após criar, copie o **ID de medição** no formato `G-XXXXXXXXXX`.

---

## 2. Variável de ambiente

ID de medição deste projeto: **G-FL17SJ4EG9** (Google tag gtag.js).

No seu ambiente (local, Vercel, Dokploy), defina:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-FL17SJ4EG9
```

- **Local:** crie ou edite `.env.local` e adicione a linha acima.
- **Vercel:** Project → Settings → Environment Variables.
- **Dokploy:** variáveis do aplicativo.

Reinicie o servidor de desenvolvimento ou faça um novo deploy para a variável ser aplicada.

---

## 3. O que já está no projeto

- **Script do gtag:** carregado no layout quando `NEXT_PUBLIC_GA_MEASUREMENT_ID` está definido (`src/app/components/GoogleAnalytics.tsx`).
- **Config:** `anonymize_ip: true` para maior privacidade.
- **Biblioteca de eventos:** `src/lib/analytics.ts` com funções para enviar eventos sem dados sensíveis.

---

## 4. Eventos mapeados (GA4)

| Função (lib/analytics.ts)   | Nome do evento GA4   | Uso |
|----------------------------|----------------------|-----|
| `trackLogin(method)`       | `login`              | Login com Google (method: `google`) |
| `trackSignUp(method)`      | `sign_up`            | Cadastro concluído |
| `trackQueueJoin(queueType)`| `queue_join`         | Entrada na fila (low_elo, high_elo, inclusive) |
| `trackQueueLeave(queueType)`| `queue_leave`        | Saída da fila |
| `trackMatchCreate(type, fromQueue)` | `match_create` | Partida criada |
| `trackProfileUpdate()`     | `profile_update`     | Perfil editado |
| `trackTermsView()`        | `terms_view`         | Página de termos acessada |
| `trackOnboardingStart()`  | `onboarding_start`   | Início do onboarding |
| `trackOnboardingComplete()` | `onboarding_complete` | Onboarding concluído |
| `trackOutboundLink(url, label)` | `click`        | Clique em link externo |

Parâmetros enviados são apenas identificadores de fluxo (ex.: `queue_type`, `match_type`). Nenhum dado pessoal é enviado.

---

## 5. Onde os eventos são chamados

- **Login:** em `src/app/login/page.tsx` (ao clicar em “Continuar com Google”).
- **Termos:** em `src/app/termos/page.tsx` (ao montar a página).
- **Fila:** em `src/app/api/queue/join/route.ts` e `leave/route.ts` (após sucesso, o client pode chamar; ou chamar no client após resposta da API).
- **Perfil:** em `src/app/profile/edit/page.tsx` (após salvar com sucesso).
- **Onboarding:** em `src/app/onboarding/page.tsx` (início e conclusão).

Os eventos que dependem de ação no client devem ser chamados nos componentes com `trackQueueJoin`, `trackProfileUpdate`, etc., após a ação do usuário.

---

## 6. Verificar no GA4

1. No GA4, vá em **Relatórios** → **Tempo real**. Acesse o site com a variável configurada; em alguns segundos deve aparecer usuário ativo.
2. Em **Relatórios** → **Engajamento** → **Eventos**, após algumas horas você verá eventos como `login`, `queue_join`, `page_view`, etc.

---

## 7. Segurança e privacidade

- Não enviamos e-mail, nome, CPF ou qualquer PII para o GA.
- `anonymize_ip: true` está ativo.
- Em produção, mantenha sempre HTTPS para que os dados trafeguem criptografados.
