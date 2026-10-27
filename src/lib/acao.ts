import "server-only";
import { revalidatePath } from "next/cache";
import type { Modulo } from "@/generated/prisma/enums";
import { exigirModulo, exigirUsuario, type UsuarioAtual } from "@/lib/auth/sessao";
import { tratar, type EstadoForm } from "@/lib/form";

/**
 * Executa uma ação de formulário conferindo o módulo do usuário.
 * Erros de validação voltam como mensagem; as telas são atualizadas no fim.
 */
export async function comModulo(
  modulo: Modulo | Modulo[],
  fn: (usuario: UsuarioAtual) => Promise<EstadoForm | void>,
): Promise<EstadoForm> {
  const usuario = await exigirAlgumModulo(Array.isArray(modulo) ? modulo : [modulo]);
  try {
    return await tratar(() => fn(usuario));
  } finally {
    revalidatePath("/", "layout");
  }
}

/** Ações que qualquer usuário logado pode fazer (ex.: trocar a própria senha). */
export async function logado(fn: (usuario: UsuarioAtual) => Promise<EstadoForm | void>): Promise<EstadoForm> {
  const usuario = await exigirUsuario();
  try {
    return await tratar(() => fn(usuario));
  } finally {
    revalidatePath("/", "layout");
  }
}

async function exigirAlgumModulo(modulos: Modulo[]): Promise<UsuarioAtual> {
  const usuario = await exigirUsuario();
  if (modulos.some((m) => usuario.modulos.includes(m))) return usuario;
  return exigirModulo(modulos[0]); // redireciona com o aviso de sem acesso
}
