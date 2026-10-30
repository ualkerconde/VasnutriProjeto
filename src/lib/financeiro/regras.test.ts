import { describe, expect, it } from "vitest";
import { descreverMeses, intervaloDoMes, marcoAtingido, mesesEntre, planoDeParcelas, situacaoParcela } from "./regras";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("planoDeParcelas", () => {
  it("começa no mês seguinte quando o dia de vencimento já passou", () => {
    const p = planoDeParcelas({ inicio: d("2026-10-20"), diaVencimento: 10, quantidade: 3 });
    expect(p.map((x) => iso(x.vencimento))).toEqual(["2026-11-10", "2026-12-10", "2027-01-10"]);
  });

  it("para no fim do contrato e ajusta dia 31 em meses curtos", () => {
    const p = planoDeParcelas({ inicio: d("2027-01-01"), diaVencimento: 31, fim: d("2027-04-15") });
    expect(p.map((x) => iso(x.vencimento))).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(iso(p[1].competencia)).toBe("2027-02-01");
  });
});

describe("situacaoParcela", () => {
  const hoje = d("2026-10-30");
  it("separa recebida, vencida, a receber e cancelada", () => {
    expect(situacaoParcela({ recebidoEm: d("2026-10-01"), cancelada: false, vencimento: d("2026-09-10") }, hoje)).toBe("RECEBIDA");
    expect(situacaoParcela({ recebidoEm: null, cancelada: false, vencimento: d("2026-10-29") }, hoje)).toBe("VENCIDA");
    expect(situacaoParcela({ recebidoEm: null, cancelada: false, vencimento: d("2026-10-30") }, hoje)).toBe("A_RECEBER");
    expect(situacaoParcela({ recebidoEm: null, cancelada: true, vencimento: d("2026-01-01") }, hoje)).toBe("CANCELADA");
  });
});

describe("tempo de contrato", () => {
  it("conta meses inteiros e descreve", () => {
    expect(mesesEntre(d("2025-07-15"), d("2026-10-14"))).toBe(14);
    expect(descreverMeses(15)).toBe("1 ano e 3 meses");
    expect(descreverMeses(1)).toBe("1 mês");
  });

  it("avisa o marco só na semana em que ele cai", () => {
    expect(marcoAtingido(d("2026-04-10"), d("2026-10-12"), 6)).toBe(6);
    expect(marcoAtingido(d("2026-04-10"), d("2026-10-25"), 6)).toBeNull();
    expect(marcoAtingido(d("2025-10-28"), d("2026-10-30"), 6)).toBe(12);
    expect(marcoAtingido(d("2026-01-10"), d("2026-10-12"), 6)).toBeNull();
  });
});

describe("intervaloDoMes", () => {
  it("usa o mês atual quando não informado", () => {
    expect(intervaloDoMes(undefined, d("2026-10-30")).chave).toBe("2026-10");
    expect(iso(intervaloDoMes("2026-12", d("2026-10-30")).fim)).toBe("2027-01-01");
  });
});
