/**
 * Validação e normalização de CPF (Brasil).
 * Use apenas para validação e geração de hash de unicidade; nunca armazene CPF em texto puro.
 */

/** Remove tudo que não for dígito. */
export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, "");
}

/** CPF tem 11 dígitos; valida dígitos verificadores. */
export function isValidCpf(cpf: string): boolean {
  const digits = normalizeCpf(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[10], 10)) return false;

  return true;
}

/** Retorna CPF normalizado (11 dígitos) ou null se inválido. */
export function parseCpf(input: string): string | null {
  const n = normalizeCpf(input);
  return isValidCpf(n) ? n : null;
}
