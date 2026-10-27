import { describe, expect, it } from "vitest";
import { dataPorExtenso, formatarDias, primeiroNome, saudacao } from "./formato";

describe("formato", () => {
  it("cumprimenta conforme o horário de Brasília", () => {
    expect(saudacao(new Date("2026-10-27T12:00:00Z"))).toBe("Bom dia"); // 9h
    expect(saudacao(new Date("2026-10-27T18:00:00Z"))).toBe("Boa tarde"); // 15h
    expect(saudacao(new Date("2026-10-27T23:00:00Z"))).toBe("Boa noite"); // 20h
  });

  it("escreve a data por extenso sem o '-feira'", () => {
    expect(dataPorExtenso(new Date("2026-10-27T15:00:00Z"))).toBe("TERÇA, 27 DE OUTUBRO");
  });

  it("formata dias com vírgula e traço quando não há dado", () => {
    expect(formatarDias(6.25)).toBe("6,3 d");
    expect(formatarDias(null)).toBe("—");
  });

  it("pega o primeiro nome", () => {
    expect(primeiroNome("Pedro Tirello")).toBe("Pedro");
  });
});
