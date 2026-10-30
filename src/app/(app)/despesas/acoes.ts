"use server";

import { redirect } from "next/navigation";
import { comModulo } from "@/lib/acao";
import { apagarArquivo } from "@/lib/armazenamento";
import type { UsuarioAtual } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { anexarArquivos, apagarArquivosDe } from "@/lib/financeiro/anexos";
import { data, decimal, ErroValidacao, texto, textoObrigatorio, type EstadoForm } from "@/lib/form";

/** Cada um mexe nas próprias despesas; quem tem o Financeiro mexe em todas. */
async function despesaEditavel(usuario: UsuarioAtual, id: string) {
  const d = await db.despesa.findUnique({ where: { id } });
  if (!d) throw new ErroValidacao("Despesa não encontrada. Atualize a página.");
  if (d.usuarioId !== usuario.id && !usuario.modulos.includes("FINANCEIRO")) throw new ErroValidacao("Você só pode alterar as suas despesas.");
  return d;
}

async function camposDespesa(f: FormData) {
  const quando = data(f, "data");
  if (!quando) throw new ErroValidacao("Informe a data da despesa.");
  const valor = decimal(f, "valor");
  if (valor === null || Number(valor) <= 0) throw new ErroValidacao("Informe o valor da despesa.");
  const categoriaId = textoObrigatorio(f, "categoriaId", "Categoria");
  if (!(await db.categoriaDespesa.findUnique({ where: { id: categoriaId }, select: { id: true } }))) throw new ErroValidacao("Categoria inválida.");
  const clienteId = texto(f, "clienteId");
  if (clienteId && !(await db.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }))) throw new ErroValidacao("Cliente inválido.");
  return { data: quando, valor, categoriaId, clienteId, descricao: texto(f, "descricao") };
}

export async function criarDespesa(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("DESPESAS", async (usuario) => {
    const despesa = await db.despesa.create({ data: { ...(await camposDespesa(f)), usuarioId: usuario.id } });
    try {
      await anexarArquivos(f, "comprovante", { despesaId: despesa.id }, { tipo: "Comprovante", usuarioId: usuario.id });
    } catch (erro) {
      await db.despesa.delete({ where: { id: despesa.id } });
      throw erro;
    }
    return { ok: "Despesa lançada." };
  });
}

export async function salvarDespesa(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("DESPESAS", async (usuario) => {
    await despesaEditavel(usuario, id);
    await db.despesa.update({ where: { id }, data: await camposDespesa(f) });
    return { ok: "Despesa salva." };
  });
}

export async function excluirDespesa(id: string, _: EstadoForm): Promise<EstadoForm> {
  const r = await comModulo("DESPESAS", async (usuario) => {
    await despesaEditavel(usuario, id);
    await apagarArquivosDe({ despesaId: id });
    await db.despesa.delete({ where: { id } });
  });
  if (r.erro) return r;
  redirect("/despesas");
}

export async function anexarComprovante(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("DESPESAS", async (usuario) => {
    await despesaEditavel(usuario, id);
    await anexarArquivos(f, "comprovante", { despesaId: id }, { tipo: "Comprovante", usuarioId: usuario.id, obrigatorio: true });
    return { ok: "Comprovante anexado." };
  });
}

export async function removerComprovante(arquivoId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("DESPESAS", async (usuario) => {
    const a = await db.arquivo.findUnique({ where: { id: arquivoId } });
    if (!a?.despesaId) throw new ErroValidacao("Arquivo não encontrado.");
    await despesaEditavel(usuario, a.despesaId);
    await db.arquivo.delete({ where: { id: arquivoId } });
    await apagarArquivo(a.caminhoStorage);
  });
}
