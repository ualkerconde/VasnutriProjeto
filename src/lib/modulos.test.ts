import { describe, expect, it } from "vitest";
import { menuPermitido, modulosDosPerfis } from "./modulos";

describe("modulosDosPerfis", () => {
  it("junta os módulos de vários perfis sem repetir, na ordem do menu", () => {
    const modulos = modulosDosPerfis([
      { permissoes: [{ modulo: "VISITAS" }, { modulo: "PAINEL" }] },
      { permissoes: [{ modulo: "PAINEL" }, { modulo: "FUNIL" }] },
    ]);
    expect(modulos).toEqual(["PAINEL", "FUNIL", "VISITAS"]);
  });

  it("devolve lista vazia para usuário sem perfil", () => {
    expect(modulosDosPerfis([])).toEqual([]);
  });
});

describe("menuPermitido", () => {
  it("mostra só as telas dos módulos do usuário", () => {
    const rotulos = menuPermitido(["PAINEL", "CLIENTES"]).map((i) => i.rotulo);
    expect(rotulos).toEqual(["Painel", "Clientes"]);
  });
});
