import { describe, expect, it } from "vitest";
import { regrasDosCampos } from "./campos";

const base = { etapa: 2, podeAlterar: true, administrador: false, perfilIds: ["comercial"], configs: [] };

describe("regras dos campos do processo", () => {
  it("sem configuração, tudo visível e editável", () => {
    const r = regrasDosCampos(base);
    expect(r.validadeContrato).toEqual({ visivel: true, editavel: true });
  });

  it("campo só editável nas etapas marcadas", () => {
    const configs = [{ chave: "validadeContrato", etapasEditaveis: [1, 2, 7], sensivel: false, perfisVisiveis: [] }];
    expect(regrasDosCampos({ ...base, configs }).validadeContrato.editavel).toBe(true);
    expect(regrasDosCampos({ ...base, etapa: 3, configs }).validadeContrato).toEqual({ visivel: true, editavel: false });
  });

  it("sem permissão na etapa, nada é editável", () => {
    expect(regrasDosCampos({ ...base, podeAlterar: false }).plano.editavel).toBe(false);
  });

  it("campo sensível só para os perfis marcados e o administrador", () => {
    const configs = [{ chave: "valorMensal", etapasEditaveis: [1, 2], sensivel: true, perfisVisiveis: ["financeiro"] }];
    expect(regrasDosCampos({ ...base, configs }).valorMensal).toEqual({ visivel: false, editavel: false });
    expect(regrasDosCampos({ ...base, perfilIds: ["financeiro"], configs }).valorMensal.visivel).toBe(true);
    expect(regrasDosCampos({ ...base, administrador: true, perfilIds: [], configs }).valorMensal.visivel).toBe(true);
  });
});
