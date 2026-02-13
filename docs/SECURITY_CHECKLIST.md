# Checklist de segurança (CPF e aplicação)

## Dados sensíveis (CPF)

- **Nunca** logar CPF em texto, hash ou valor cifrado em logs (server ou client).
- **Validação:** apenas algoritmo (dígitos) em `src/lib/cpf.ts`; rota `/api/validate-cpf` retorna só `{ valid: boolean }`.
- **Persistência:** CPF normalizado vira `cpfHash` (SHA-256) para unicidade e `cpfEncrypted` (AES-256-GCM) para armazenamento; nunca em texto puro.
- **APIs:** onboarding/profile não retorna nem inclui CPF no corpo das respostas; erros genéricos ("CPF inválido", "já vinculado").

## Headers de segurança (next.config.ts)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Build de produção

- `removeConsole: true` no client (next.config) — nenhum `console.*` no bundle do navegador.
- HTTPS obrigatório em produção (TLS para tráfego e dados sensíveis).

## Auditoria

- Rodar `npm audit` (ou `npm audit --audit-level=high`) antes de releases; corrigir vulnerabilidades críticas/altas.
