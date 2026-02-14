# Cron: check-matches (sincronizar partidas com Valorant)

O endpoint `GET /api/cron/check-matches` verifica partidas pendentes/em andamento e sincroniza com partidas **encerradas** no Valorant (API Henrik). Deve ser chamado a cada 1–3 minutos.

---

## Erro: "Cannot find module '/app/scripts/cron-check-matches.js'"

Se a imagem Docker não tiver a pasta `scripts` (build antigo ou deploy que não copia), **use o comando one-liner** abaixo no agendador — não depende de nenhum arquivo, só do Node e da variável `CRON_SECRET` no ambiente do container.

**Comando para colar no Schedule (Dokploy):**

```bash
node -e "const s=process.env.CRON_SECRET||process.env.CRON_API_KEY||'';const u='https://www.hubexpresso.com/api/cron/check-matches?secret='+encodeURIComponent(s);fetch(u).then(r=>r.text().then(t=>({s:r.status,t}))).then(({s,t})=>{if(s===401){console.error('Não autorizado');process.exit(1);}if(!t.trim().startsWith('{')){console.warn('Resposta não JSON');process.exit(0);}try{console.log(JSON.parse(t));}catch(e){process.exit(0);}}).catch(e=>{console.error(e.message);process.exit(1);});"
```

**URL usada:** `https://www.hubexpresso.com`. No container/deploy, defina a variável **`CRON_SECRET`** com o valor configurado na aplicação (mesmo do `.env`).

- O container **precisa** ter a variável **`CRON_SECRET`** (ou `CRON_API_KEY`) com o mesmo valor da aplicação.
- Requer Node 18+ (fetch nativo). Não quebra se a resposta for HTML (deploy/manutenção).

---

## Erro: "Unexpected token 'T', \"The deploy\"... is not valid JSON"

Isso acontece quando:

1. **A resposta não é JSON** – O agendador faz `response.json()` e a API devolveu HTML ou texto (ex.: página "The deployment is in progress", 502/503 do proxy, ou manutenção). O primeiro caractere 'T' é de "The deploy...".
2. **Secret errado** – Se você usou literalmente `secret=CRON_SECRET` na URL, o servidor retorna 401 (Não autorizado). Muitos ambientes então mostram uma **página HTML de erro**, que não é JSON.

---

## Solução 1: Usar o script (recomendado)

No container ou no agendador (Docker/Dokploy), use o script que lê o secret do ambiente e não quebra com resposta HTML:

**Comando no agendador:**

```bash
node scripts/cron-check-matches.js
```

**Requisitos:**

- O ambiente onde o comando roda deve ter a variável **`CRON_SECRET`** (ou `CRON_API_KEY`) com o **mesmo valor** configurado na aplicação (ex.: no `.env` do app ou nas variáveis do deploy).
- Opcional: **`BASE_URL`** (ex.: `https://www.hubexpresso.com`). Se não definir, usa `https://www.hubexpresso.com`.

No **Docker exec** (teste manual), com o working directory `/app`:

```bash
docker exec <container_id> node scripts/cron-check-matches.js
```

O Dockerfile copia a pasta `scripts` para a imagem final; o comando deve rodar com o diretório de trabalho `/app`.

No **agendador do Dokploy** (Schedule):

- **Task Name:** Check matches  
- **Schedule:** `*/1 * * * *` (a cada 1 minuto) ou `*/3 * * * *` (a cada 3 minutos)  
- **Command:** `node scripts/cron-check-matches.js`  
- Garanta que o container/ambiente do cron tenha **CRON_SECRET** definido (mesmo valor da aplicação).

---

## Solução 2: One-liner (quando o script não está na imagem)

É o mesmo comando da seção acima. Não depende de arquivo; use quando der `MODULE_NOT_FOUND` para o script.

---

## Resumo

| Problema | Correção |
|----------|----------|
| `secret=CRON_SECRET` literal na URL | Usar o **valor real** do secret. No script: `process.env.CRON_SECRET`. No agendador: definir a variável **CRON_SECRET** no ambiente do cron e usar `scripts/cron-check-matches.js`. |
| "The deploy... is not valid JSON" | A API não está devolvendo JSON (HTML de deploy/erro). Use `scripts/cron-check-matches.js`, que trata resposta não-JSON sem quebrar. |

Depois de ajustar, o cron deve rodar a cada 1–3 min e o log deve mostrar algo como: `Cron check-matches: Verificação de partidas concluída.` (e opcionalmente `Partidas atualizadas: N`).
