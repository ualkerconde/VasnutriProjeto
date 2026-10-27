"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao, ipDaRequisicao } from "./sessao";
import { normalizarEmail } from "./token";

export type EstadoLogin = { erro?: string; email?: string };

const esquemaLogin = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
  lembrar: z.literal("on").optional(),
});

// Hash de uma senha qualquer, para o tempo de resposta não revelar se o e-mail existe.
const HASH_FALSO = "$2b$12$oSksUSw327QVzYL9ckRvdOt4Lt16p7fP5dBy..MUeeL2B3olzibHi";

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const dados = esquemaLogin.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    lembrar: formData.get("lembrar") ?? undefined,
  });
  const emailDigitado = String(formData.get("email") ?? "");
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos.", email: emailDigitado };
  }

  const email = normalizarEmail(dados.data.email);
  const usuario = await db.usuario.findUnique({ where: { email } });
  const senhaConfere = await bcrypt.compare(dados.data.senha, usuario?.senhaHash ?? HASH_FALSO);
  const sucesso = Boolean(usuario?.ativo && senhaConfere);

  const h = await headers();
  await db.acessoLog.create({
    data: {
      usuarioId: usuario?.id,
      emailInformado: email,
      sucesso,
      ip: ipDaRequisicao(h),
      dispositivo: h.get("user-agent")?.slice(0, 300),
    },
  });

  if (!usuario || !sucesso) {
    return { erro: "E-mail ou senha incorretos.", email: emailDigitado };
  }

  await criarSessao(usuario.id, dados.data.lembrar === "on");
  redirect("/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
