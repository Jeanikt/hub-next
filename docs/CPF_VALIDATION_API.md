# Validação de CPF – Plano para API de existência/validade

O sistema já valida CPF por **formato e dígitos verificadores** (`src/lib/cpf.ts` e rota de onboarding). Este documento descreve o plano para, no futuro, **consultar se o CPF existe e é válido** (ex.: na base da Receita Federal) antes de permitir criar a conta.

---

## Objetivo

Quando o usuário informar o CPF no onboarding (ou em etapa de verificação), uma API poderá:

1. Validar formato e algoritmo (já feito).
2. **Consultar** se o CPF existe e está ativo (futuro), para reduzir fraudes e contas duplicadas com CPFs inválidos ou inexistentes.

---

## Fluxo planejado

1. Usuário preenche CPF no onboarding.
2. Frontend pode chamar `POST /api/validate-cpf` (opcional em tempo real) com `{ cpf: "12345678901" }`.
3. Backend:
   - Valida formato e dígitos (sempre).
   - **Futuro:** chama provedor externo (Receita Federal, Serpro, ou API comercial) para verificar existência/validade.
4. Resposta: `{ valid: boolean, exists?: boolean }`. Hoje `exists` não é retornado; quando houver integração, será preenchido.
5. Só após validação positiva (e, no futuro, `exists === true` se a política exigir), o usuário pode concluir o cadastro.

---

## Implementação atual

- **`POST /api/validate-cpf`**: existe e retorna apenas validação algorítmica (`valid: true/false`). Não envia CPF a terceiros.
- **Onboarding**: continua usando validação em `src/lib/cpf.ts` e verificação de duplicidade por `cpfHash` no banco.

---

## Próximos passos (futuro)

1. **Provedor externo**  
   Escolher um dos:
   - **Receita Federal (convênio)** – consulta oficial, exige convênio e ambiente homologado.
   - **APIs comerciais** – ex.: Consulta CPF, Brasil API (quando disponível), etc.  
   Definir variáveis de ambiente (ex.: `CPF_VALIDATION_API_URL`, `CPF_VALIDATION_API_KEY`).

2. **Rota `/api/validate-cpf`**  
   - Manter validação algorítmica primeiro; se inválido, retornar `valid: false` sem chamar externo.  
   - Se válido, chamar a API externa (com rate limit e timeout).  
   - Retornar `{ valid: boolean, exists?: boolean }` sem expor o CPF na resposta.  
   - Não logar CPF; em logs, usar apenas “validação ok/falha”.

3. **Onboarding**  
   - Opcionalmente chamar `POST /api/validate-cpf` antes de enviar o formulário completo.  
   - Se a política exigir “CPF existente”, bloquear conclusão quando `exists === false`.

4. **Segurança**  
   - CPF nunca em logs nem em respostas além do estritamente necessário.  
   - Comunicação com provedor externo via HTTPS.  
   - Rate limit na rota de validação para evitar abuso.

---

## TDD

Para a feature de validação com API externa:

- Testes unitários para `isValidCpf` / `parseCpf` (já cobertos por uso em onboarding).
- Testes para `POST /api/validate-cpf`: formato inválido → `valid: false`; formato válido → `valid: true` (e, no futuro, mock da API externa para `exists`).
- Testes de integração com mock do provedor quando a integração for implementada.
