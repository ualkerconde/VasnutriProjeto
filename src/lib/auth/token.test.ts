import { describe, expect, it } from "vitest";
import { gerarToken, hashToken, normalizarEmail } from "./token";

describe("token de sessão", () => {
  it("gera tokens diferentes a cada chamada", () => {
    expect(gerarToken()).not.toEqual(gerarToken());
  });

  it("o hash é estável e não revela o token", () => {
    const token = gerarToken();
    expect(hashToken(token)).toEqual(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64);
  });
});

describe("normalizarEmail", () => {
  it("ignora espaços e maiúsculas", () => {
    expect(normalizarEmail("  Pedro@Vasnutri.com.BR ")).toBe("pedro@vasnutri.com.br");
  });
});
