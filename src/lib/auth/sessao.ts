import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { modulosDosPerfis } from "@/lib/modulos";
import type { Modulo } from "@/generated/prisma/enums";
import { DURACAO_SESSAO_LEMBRAR_MS, DURACAO_SESSAO_MS, gerarToken, hashToken } from "./token";

const COOKIE_SESSAO = "vasnutri_sessao";

export type UsuarioAtual = {
  id: string;
  nome: string;
  email: string;
  perfis: string[];
  perfilIds: string[];
  modulos: Modulo[];
};

export async function criarSessao(usuarioId: string, lembrar: boolean) {
  const token = gerarToken();
  const duracao = lembrar ? DURACAO_SESSAO_LEMBRAR_MS : DURACAO_SESSAO_MS;
  const expiraEm = new Date(Date.now() + duracao);
  const h = await headers();

  await db.sessao.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId,
      expiraEm,
      ip: ipDaRequisicao(h),
      dispositivo: h.get("user-agent")?.slice(0, 300),
    },
  });

  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sem "manter conectado", o cookie some ao fechar o navegador.
    expires: lembrar ? expiraEm : undefined,
  });
}

export async function encerrarSessao() {
  const loja = await cookies();
  const token = loja.get(COOKIE_SESSAO)?.value;
  if (token) await db.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
  loja.delete(COOKIE_SESSAO);
}

/** Usuário logado nesta requisição, ou null. Consulta o banco uma vez por requisição. */
export const usuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  const sessao = await db.sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      usuario: {
        include: { perfis: { include: { perfil: { include: { permissoes: true } } } } },
      },
    },
  });
  if (!sessao || sessao.expiraEm < new Date() || !sessao.usuario.ativo) return null;

  const perfis = sessao.usuario.perfis.map((up) => up.perfil);
  return {
    id: sessao.usuario.id,
    nome: sessao.usuario.nome,
    email: sessao.usuario.email,
    perfis: perfis.map((p) => p.nome),
    perfilIds: perfis.map((p) => p.id),
    modulos: modulosDosPerfis(perfis),
  };
});

export async function exigirUsuario(): Promise<UsuarioAtual> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Bloqueia a tela para quem não tem o módulo no perfil. */
export async function exigirModulo(modulo: Modulo): Promise<UsuarioAtual> {
  const usuario = await exigirUsuario();
  if (!usuario.modulos.includes(modulo)) redirect("/?sem-acesso=1");
  return usuario;
}

export function ipDaRequisicao(h: Headers): string | undefined {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
}
