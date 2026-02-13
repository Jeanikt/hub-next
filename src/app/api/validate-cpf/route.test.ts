import { describe, it, expect } from "vitest";
import { parseCpf } from "../../../lib/cpf";

/**
 * Testes da lógica de validação usada por POST /api/validate-cpf.
 * A rota retorna { valid: parseCpf(raw) !== null }.
 */
describe("POST /api/validate-cpf (lógica)", () => {
  it("valid: true para CPF válido", () => {
    expect(parseCpf("52998224725")).not.toBeNull();
    expect(parseCpf("529.982.247-25")).toBe("52998224725");
  });

  it("valid: false para CPF inválido", () => {
    expect(parseCpf("11111111111")).toBeNull();
    expect(parseCpf("12345678900")).toBeNull();
  });

  it("valid: false para ausência de cpf", () => {
    expect(parseCpf("")).toBeNull();
  });
});
