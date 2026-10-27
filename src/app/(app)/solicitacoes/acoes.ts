"use server";

import { redirect } from "next/navigation";
import { comModulo } from "@/lib/acao";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { data, ErroValidacao, marcado, texto, textoObrigatorio, type EstadoForm } from "@/lib/form";
import { notificar } from "@/lib/notificacoes";

function dados(f: FormData) {
  return {
    clienteId: textoObrigatorio(f, "clienteId", "Cliente"),
    processoId: texto(f, "processoId"),
    data: data(f, "data") ?? hoje(),
    servico: textoObrigatorio(f, "servico", "Serviço"),
    descricao: texto(f, "descricao"),
    responsavelId: texto(f, "responsavelId"),
    prazo: data(f, "prazo"),
    requerValidacao: marcado(f, "requerValidacao"),
    observacao: texto(f, "observacao"),
  };
}

export async function criarSolicitacao(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("SOLICITACOES", async (usuario) => {
    const s = await db.solicitacaoEscritorio.create({ data: dados(f) });
    await notificar(
      db,
      { usuarioId: s.responsavelId, tipo: "SOLICITACAO_PRAZO", titulo: `Nova solicitação: ${s.servico}`, mensagem: s.descricao, entidade: "solicitacao", entidadeId: s.id },
      usuario.id,
    );
    redirect(`/solicitacoes/${s.id}`);
  });
}

export async function salvarSolicitacao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("SOLICITACOES", async (usuario) => {
    const antes = await db.solicitacaoEscritorio.findUniqueOrThrow({ where: { id } });
    const s = await db.solicitacaoEscritorio.update({ where: { id }, data: dados(f) });
    if (s.responsavelId !== antes.responsavelId) {
      await notificar(
        db,
        { usuarioId: s.responsavelId, tipo: "SOLICITACAO_PRAZO", titulo: `Solicitação atribuída a você: ${s.servico}`, entidade: "solicitacao", entidadeId: s.id },
        usuario.id,
      );
    }
    return { ok: "Solicitação salva." };
  });
}

export async function concluirSolicitacao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("SOLICITACOES", async () => {
    const s = await db.solicitacaoEscritorio.findUniqueOrThrow({ where: { id } });
    const validadoPorId = texto(f, "validadoPorId");
    if (s.requerValidacao && !validadoPorId) throw new ErroValidacao("Esta solicitação precisa de validação. Informe quem validou.");
    await db.solicitacaoEscritorio.update({
      where: { id },
      data: { status: "CONCLUIDO", concluidoEm: data(f, "concluidoEm") ?? hoje(), validadoPorId: s.requerValidacao ? validadoPorId : null },
    });
    return { ok: "Solicitação concluída." };
  });
}

export async function reabrirSolicitacao(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("SOLICITACOES", async () => {
    await db.solicitacaoEscritorio.update({ where: { id }, data: { status: "EM_ABERTO", concluidoEm: null } });
  });
}

export async function excluirSolicitacao(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("SOLICITACOES", async () => {
    await db.solicitacaoEscritorio.delete({ where: { id } });
    redirect("/solicitacoes");
  });
}
