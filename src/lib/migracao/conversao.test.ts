import { describe, expect, it } from "vitest";
import {
  acharUsuario,
  cepDe,
  cnpjDe,
  dataDe,
  dataHoraDe,
  diaDe,
  emailsDe,
  horaDe,
  listaDe,
  nomeDoEmail,
  numeroDe,
  simNao,
  textoDe,
} from "./conversao";

describe("conversões da planilha", () => {
  it("lê datas brasileiras e do Excel", () => {
    expect(dataDe("09/12/2025")?.toISOString()).toBe("2025-12-09T00:00:00.000Z");
    expect(dataDe("31/02/2026")).toBeNull();
    expect(dataDe(new Date(Date.UTC(2026, 6, 10, 15)))?.toISOString()).toBe("2026-07-10T00:00:00.000Z");
    expect(dataDe(46213)?.toISOString()).toBe("2026-07-10T00:00:00.000Z");
    expect(dataDe("")).toBeNull();
  });

  it("lê data e hora no fuso de São Paulo", () => {
    expect(dataHoraDe("20/07/2026 14:28:45")?.toISOString()).toBe("2026-07-20T17:28:45.000Z");
    expect(dataHoraDe(new Date(Date.UTC(2026, 6, 17, 10, 45)))?.toISOString()).toBe("2026-07-17T13:45:00.000Z");
  });

  it("lê horários", () => {
    expect(horaDe("15:32:00")).toBe("15:32");
    expect(horaDe(0.5)).toBe("12:00");
    expect(horaDe(new Date(Date.UTC(1899, 11, 30, 8, 5)))).toBe("08:05");
  });

  it("lê números pt-BR", () => {
    expect(numeroDe("1.000,00")).toBe(1000);
    expect(numeroDe("R$ 449,10")).toBe(449.1);
    expect(numeroDe("1.500")).toBe(1500);
    expect(numeroDe("0,036")).toBe(0.036);
    expect(numeroDe("abc")).toBeNull();
  });

  it("dia de vencimento", () => {
    expect(diaDe("05")).toBe(5);
    expect(diaDe("10/10/2026")).toBe(10);
    expect(diaDe("45")).toBeNull();
  });

  it("CNPJ, e-mails, listas, CEP e Sim/Não", () => {
    expect(cnpjDe("48.018.705/0001-62")).toBe("48018705000162");
    expect(cnpjDe("1111111111111111")).toBeNull();
    expect(emailsDe("a@b.com / C@D.com.br")).toEqual(["a@b.com", "c@d.com.br"]);
    expect(listaDe("Madeira , Metalon,Metalon")).toEqual(["Madeira", "Metalon"]);
    expect(cepDe("Rua X, 54, Muriaé-MG CEP: 36884-112")).toBe("36884-112");
    expect(cepDe("CEP:36.810-000")).toBe("36810-000");
    expect(simNao("Sim")).toBe(true);
    expect(simNao("Não")).toBe(false);
    expect(simNao("")).toBeNull();
    expect(textoDe("#ERROR!")).toBeNull();
  });

  it("acha usuários por nome livre", () => {
    const usuarios = [
      { nome: "Pedro", email: "pedro@vasnutri.com.br" },
      { nome: "Ualker Conde", email: "ualker.conde@dolean.com.br" },
      { nome: "Vagner", email: "vagner@vasnutri.com.br" },
    ];
    expect(acharUsuario("Pedro Tirello", usuarios)?.email).toBe("pedro@vasnutri.com.br");
    expect(acharUsuario("ualker", usuarios)?.email).toBe("ualker.conde@dolean.com.br");
    expect(acharUsuario("VAGNER (selecionar os funcionários)", usuarios)?.email).toBe("vagner@vasnutri.com.br");
    expect(acharUsuario("eu", usuarios)).toBeNull();
    expect(acharUsuario("Estagiária", usuarios)).toBeNull();
    expect(nomeDoEmail("ualker.conde@dolean.com.br")).toBe("Ualker Conde");
  });
});
