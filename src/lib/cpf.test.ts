import { describe, it, expect } from "vitest";
import { isValidCpf, parseCpf, normalizeCpf } from "./cpf";

describe("normalizeCpf", () => {
  it("remove não-dígitos", () => {
    expect(normalizeCpf("123.456.789-00")).toBe("12345678900");
    expect(normalizeCpf("123 456 789 00")).toBe("12345678900");
  });
});

describe("isValidCpf", () => {
  it("rejeita CPF com todos dígitos iguais", () => {
    expect(isValidCpf("11111111111")).toBe(false);
  });

  it("rejeita tamanho diferente de 11", () => {
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("123456789012")).toBe(false);
  });

  it("aceita CPF válido (exemplo conhecido)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita CPF com dígitos verificadores errados", () => {
    expect(isValidCpf("12345678900")).toBe(false);
  });
});

describe("parseCpf", () => {
  it("retorna null para inválido", () => {
    expect(parseCpf("")).toBe(null);
    expect(parseCpf("11111111111")).toBe(null);
  });

  it("retorna 11 dígitos para válido", () => {
    const r = parseCpf("529.982.247-25");
    expect(r).toBe("52998224725");
  });
});
