import { describe, expect, it } from "vitest";
import { deslocarSemana, permissoesDoUsuario, proximasAcoes, semanaDe } from "./regras";

const nada = { criar: false, mover: false, iniciar: false, finalizar: false };

describe("permissoesDoUsuario", () => {
  it("perfil sem regra salva pode tudo", () => {
    expect(permissoesDoUsuario(["a"], [], false)).toEqual({ criar: true, mover: true, iniciar: true, finalizar: true });
  });

  it("basta um dos perfis permitir", () => {
    const regras = [
      { perfilId: "a", ...nada, iniciar: true },
      { perfilId: "b", ...nada, mover: true },
    ];
    expect(permissoesDoUsuario(["a", "b"], regras, false)).toEqual({ ...nada, iniciar: true, mover: true });
  });

  it("administrador pode sempre", () => {
    expect(permissoesDoUsuario(["a"], [{ perfilId: "a", ...nada }], true).finalizar).toBe(true);
  });

  it("usuário sem perfil não pode nada", () => {
    expect(permissoesDoUsuario([], [], false)).toEqual(nada);
  });
});

describe("proximasAcoes", () => {
  it("segue a ordem agendada → em andamento → concluída", () => {
    expect(proximasAcoes("AGENDADA")).toMatchObject({ iniciar: true, finalizar: false, cancelar: true });
    expect(proximasAcoes("EM_ANDAMENTO")).toMatchObject({ iniciar: false, finalizar: true, cancelar: false });
    expect(proximasAcoes("CONCLUIDA")).toMatchObject({ iniciar: false, finalizar: false, mover: false });
  });
});

describe("semanaDe", () => {
  it("começa na segunda, meia-noite de Brasília", () => {
    const s = semanaDe("2026-10-28"); // quarta
    expect(s.segunda).toBe("2026-10-26");
    expect(s.inicio.toISOString()).toBe("2026-10-26T03:00:00.000Z");
    expect(s.fim.toISOString()).toBe("2026-11-02T03:00:00.000Z");
  });

  it("domingo pertence à semana que começou na segunda anterior", () => {
    expect(semanaDe("2026-11-01").segunda).toBe("2026-10-26");
  });

  it("anda semanas para frente e para trás", () => {
    expect(deslocarSemana("2026-10-26", 1)).toBe("2026-11-02");
    expect(deslocarSemana("2026-10-26", -1)).toBe("2026-10-19");
  });
});
