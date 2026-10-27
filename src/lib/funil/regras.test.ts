import { describe, expect, it } from "vitest";
import { acoesOrcamento, bloqueioAvanco, etapasDeRetorno, situacaoVisitas } from "./regras";

describe("bloqueioAvanco", () => {
  const base = { statusOrcamento: "A_ENVIAR" as const, treinamentoRealizado: false };

  it("libera as etapas comuns", () => {
    expect(bloqueioAvanco({ ...base, etapa: 1 })).toBeNull();
    expect(bloqueioAvanco({ ...base, etapa: 5 })).toBeNull();
  });

  it("no Comercial exige orçamento aprovado", () => {
    expect(bloqueioAvanco({ ...base, etapa: 2 })).toMatch(/aprovado/);
    expect(bloqueioAvanco({ ...base, etapa: 2, statusOrcamento: "APROVADO" })).toBeNull();
  });

  it("da etapa 10 para a 11 exige o treinamento realizado", () => {
    expect(bloqueioAvanco({ ...base, etapa: 10 })).toMatch(/Treinamento/);
    expect(bloqueioAvanco({ ...base, etapa: 10, treinamentoRealizado: true })).toBeNull();
  });

  it("não avança de Visitas técnicas nem de Recusados", () => {
    expect(bloqueioAvanco({ ...base, etapa: 11 })).not.toBeNull();
    expect(bloqueioAvanco({ ...base, etapa: 12 })).not.toBeNull();
  });
});

describe("etapasDeRetorno", () => {
  it("só volta para etapas anteriores, a partir da 2 e fora dos recusados", () => {
    expect(etapasDeRetorno(1)).toEqual([]);
    expect(etapasDeRetorno(4)).toEqual([1, 2, 3]);
    expect(etapasDeRetorno(12)).toEqual([]);
  });
});

describe("acoesOrcamento", () => {
  it("enviar só quando ainda não foi enviado", () => {
    expect(acoesOrcamento(2, "A_ENVIAR").enviar).toBe(true);
    expect(acoesOrcamento(2, "AGUARDANDO_APROVACAO").enviar).toBe(false);
  });
  it("recuperar só nos recusados", () => {
    expect(acoesOrcamento(12, "RECUSADO").recuperar).toBe(true);
    expect(acoesOrcamento(2, "RECUSADO").recuperar).toBe(false);
  });
  it("depois do fechamento o orçamento não muda mais", () => {
    expect(acoesOrcamento(5, "A_ENVIAR")).toMatchObject({ enviar: false, aprovar: false, recusar: false });
  });
});

describe("situacaoVisitas", () => {
  const inicio = new Date("2026-01-01T00:00:00Z");
  const fimPrevisto = new Date("2027-01-01T00:00:00Z");

  it("12 visitas no ano: na metade do ano espera 6", () => {
    const r = situacaoVisitas({ inicio, fimPrevisto, contratadas: 12, feitas: 4, hoje: new Date("2026-07-02T12:00:00Z") });
    expect(r).toEqual({ esperadas: 6, atrasadas: 2 });
  });

  it("no começo do ciclo nada está atrasado", () => {
    expect(situacaoVisitas({ inicio, fimPrevisto, contratadas: 12, feitas: 0, hoje: inicio }).atrasadas).toBe(0);
  });

  it("sem visitas contratadas não calcula atraso", () => {
    expect(situacaoVisitas({ inicio, fimPrevisto, contratadas: null, feitas: 0, hoje: fimPrevisto })).toEqual({ esperadas: null, atrasadas: 0 });
  });
});
