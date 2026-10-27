import { createHash, randomBytes } from "node:crypto";

/** Token aleatório que vai no cookie. O banco guarda só o hash dele. */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;
export const DURACAO_SESSAO_LEMBRAR_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
