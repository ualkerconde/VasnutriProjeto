"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { comModulo, logado } from "@/lib/acao";
import { normalizarEmail } from "@/lib/auth/token";
import { db } from "@/lib/db";
import { ErroValidacao, marcado, texto, textoObrigatorio, type EstadoForm } from "@/lib/form";

const SENHA_MINIMA = 10;

function validarSenha(senha: string | null): string {
  if (!senha || senha.length < SENHA_MINIMA) {
    throw new ErroValidacao(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  return senha;
}

function perfisMarcados(f: FormData) {
  return f.getAll("perfis").filter((v): v is string => typeof v === "string" && v !== "");
}

export async function criarUsuario(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const senha = validarSenha(texto(f, "senha"));
    const perfis = perfisMarcados(f);
    if (perfis.length === 0) throw new ErroValidacao("Escolha pelo menos um perfil.");
    const usuario = await db.usuario.create({
      data: {
        nome: textoObrigatorio(f, "nome", "Nome"),
        email: normalizarEmail(textoObrigatorio(f, "email", "E-mail")),
        senhaHash: await bcrypt.hash(senha, 12),
        perfis: { create: perfis.map((perfilId) => ({ perfilId })) },
      },
    });
    redirect(`/usuarios/${usuario.id}`);
  });
}

export async function salvarUsuario(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async (atual) => {
    const perfis = perfisMarcados(f);
    if (perfis.length === 0) throw new ErroValidacao("Escolha pelo menos um perfil.");
    const ativo = marcado(f, "ativo");

    if (id === atual.id) {
      if (!ativo) throw new ErroValidacao("Você não pode desativar o seu próprio usuário.");
      const admin = await db.perfil.findUnique({ where: { nome: "Administrador" } });
      if (admin && atual.perfis.includes("Administrador") && !perfis.includes(admin.id)) {
        throw new ErroValidacao("Você não pode tirar o seu próprio perfil de Administrador.");
      }
    }

    await db.$transaction([
      db.usuario.update({
        where: { id },
        data: {
          nome: textoObrigatorio(f, "nome", "Nome"),
          email: normalizarEmail(textoObrigatorio(f, "email", "E-mail")),
          ativo,
        },
      }),
      db.usuarioPerfil.deleteMany({ where: { usuarioId: id } }),
      db.usuarioPerfil.createMany({ data: perfis.map((perfilId) => ({ usuarioId: id, perfilId })) }),
      // Usuário desativado sai na hora de todos os aparelhos.
      ...(ativo ? [] : [db.sessao.deleteMany({ where: { usuarioId: id } })]),
    ]);
    return { ok: "Usuário salvo." };
  });
}

export async function redefinirSenha(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const senha = validarSenha(texto(f, "senha"));
    await db.$transaction([
      db.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(senha, 12) } }),
      db.sessao.deleteMany({ where: { usuarioId: id } }),
    ]);
    return { ok: "Senha redefinida. O usuário precisa entrar de novo." };
  });
}

export async function trocarMinhaSenha(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return logado(async (atual) => {
    const usuario = await db.usuario.findUniqueOrThrow({ where: { id: atual.id } });
    const senhaAtual = texto(f, "senhaAtual") ?? "";
    if (!(await bcrypt.compare(senhaAtual, usuario.senhaHash))) throw new ErroValidacao("A senha atual está incorreta.");
    const nova = validarSenha(texto(f, "novaSenha"));
    if (nova !== texto(f, "confirmacao")) throw new ErroValidacao("A confirmação não confere com a nova senha.");
    await db.usuario.update({ where: { id: atual.id }, data: { senhaHash: await bcrypt.hash(nova, 12) } });
    return { ok: "Senha alterada." };
  });
}
