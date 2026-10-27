"use server";

import { redirect } from "next/navigation";
import { comModulo } from "@/lib/acao";
import { lerConfig } from "@/lib/config";
import { db } from "@/lib/db";
import {
  data,
  decimal,
  ErroValidacao,
  inteiro,
  marcado,
  texto,
  textoObrigatorio,
  type EstadoForm,
} from "@/lib/form";
import { acoesOrcamento, bloqueioAvanco, ETAPA, etapasDeRetorno, ITEM_TREINAMENTO } from "@/lib/funil/regras";
import { abrirCicloSeNecessario, mudarEtapa } from "@/lib/funil/servico";
import { notificar } from "@/lib/notificacoes";

async function carregar(id: string) {
  return db.processo.findUniqueOrThrow({ where: { id }, include: { etapaAtual: true, cliente: true } });
}

export async function criarProcesso(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FUNIL", async (usuario) => {
    const clienteId = textoObrigatorio(f, "clienteId", "Cliente");
    const responsavelId = texto(f, "responsavelId") ?? usuario.id;
    const diretoVisitas = marcado(f, "diretoVisitas");

    if (await lerConfig("um_processo_ativo_por_cliente")) {
      const emAndamento = await db.processo.findFirst({
        where: { clienteId, etapaAtual: { final: false } },
        select: { numeroOrcamento: true },
      });
      if (emAndamento) {
        throw new ErroValidacao(
          `Este cliente já tem o processo nº ${emAndamento.numeroOrcamento} em andamento. Para permitir mais de um, mude a regra em Cadastros › Configurações.`,
        );
      }
    }

    const etapa = diretoVisitas ? ETAPA.VISITAS : ETAPA.ESCOPO;
    const processo = await db.$transaction(async (tx) => {
      const criado = await tx.processo.create({
        data: {
          clienteId,
          etapaAtualId: etapa,
          responsavelId,
          plano: texto(f, "plano"),
          observacoes: texto(f, "observacoes"),
          statusOrcamento: diretoVisitas ? "APROVADO" : "A_ENVIAR",
          dataAprovacao: diretoVisitas ? new Date() : null,
          validadeContrato: data(f, "validadeContrato"),
          visitasContratadas: inteiro(f, "visitasContratadas"),
        },
      });
      await tx.processoEtapaHistorico.create({
        data: { processoId: criado.id, etapaId: etapa, responsavelId, motivo: diretoVisitas ? "Entrou direto em Visitas técnicas" : null },
      });
      if (diretoVisitas) await abrirCicloSeNecessario(tx, criado.id, criado.validadeContrato);
      await notificar(
        tx,
        {
          usuarioId: responsavelId,
          tipo: "PROCESSO_ATRIBUIDO",
          titulo: "Novo processo atribuído a você",
          mensagem: `Orçamento nº ${criado.numeroOrcamento}`,
          entidade: "processo",
          entidadeId: criado.id,
        },
        usuario.id,
      );
      return criado;
    });
    redirect(`/funil/${processo.id}`);
  });
}

export async function avancarEtapa(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FUNIL", async (usuario) => {
    const processo = await carregar(id);
    const treinamento = await db.processoChecklist.findFirst({
      where: { processoId: id, concluido: true, item: { descricao: ITEM_TREINAMENTO } },
    });
    const bloqueio = bloqueioAvanco({
      etapa: processo.etapaAtualId,
      statusOrcamento: processo.statusOrcamento,
      treinamentoRealizado: Boolean(treinamento),
    });
    if (bloqueio) throw new ErroValidacao(bloqueio);
    const responsavelId = textoObrigatorio(f, "responsavelId", "Responsável");
    await db.$transaction((tx) =>
      mudarEtapa(tx, { processoId: id, para: processo.etapaAtualId + 1, responsavelId, motivo: texto(f, "motivo"), autorId: usuario.id }),
    );
    return { ok: "Processo enviado para a próxima etapa." };
  });
}

export async function retornarEtapa(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FUNIL", async (usuario) => {
    const processo = await carregar(id);
    const para = inteiro(f, "etapa");
    if (para === null || !etapasDeRetorno(processo.etapaAtualId).includes(para)) {
      throw new ErroValidacao("Escolha uma etapa anterior à atual.");
    }
    const motivo = textoObrigatorio(f, "motivo", "Motivo");
    const responsavelId = textoObrigatorio(f, "responsavelId", "Responsável");
    await db.$transaction((tx) => mudarEtapa(tx, { processoId: id, para, responsavelId, motivo, autorId: usuario.id }));
    return { ok: "Processo retornado." };
  });
}

export async function enviarOrcamento(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FUNIL", async () => {
    const p = await carregar(id);
    if (!acoesOrcamento(p.etapaAtualId, p.statusOrcamento).enviar) throw new ErroValidacao("O orçamento não pode ser enviado agora.");
    await db.processo.update({ where: { id }, data: { statusOrcamento: "AGUARDANDO_APROVACAO", dataEnvioOrcamento: new Date() } });
  });
}

export async function aprovarOrcamento(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FUNIL", async () => {
    const p = await carregar(id);
    if (!acoesOrcamento(p.etapaAtualId, p.statusOrcamento).aprovar) throw new ErroValidacao("O orçamento não pode ser aprovado agora.");
    await db.processo.update({
      where: { id },
      data: { statusOrcamento: "APROVADO", dataAprovacao: new Date(), dataEnvioOrcamento: p.dataEnvioOrcamento ?? new Date() },
    });
  });
}

export async function recusarOrcamento(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FUNIL", async (usuario) => {
    const p = await carregar(id);
    if (!acoesOrcamento(p.etapaAtualId, p.statusOrcamento).recusar) throw new ErroValidacao("O orçamento não pode ser recusado agora.");
    const motivoRecusaId = textoObrigatorio(f, "motivoRecusaId", "Motivo da recusa");
    const motivo = await db.motivoRecusa.findUniqueOrThrow({ where: { id: motivoRecusaId } });
    const detalhe = texto(f, "detalhe");
    await db.$transaction(async (tx) => {
      await tx.processo.update({ where: { id }, data: { statusOrcamento: "RECUSADO", motivoRecusaId } });
      await mudarEtapa(tx, {
        processoId: id,
        para: ETAPA.RECUSADOS,
        responsavelId: p.responsavelId ?? usuario.id,
        motivo: detalhe ? `${motivo.descricao}: ${detalhe}` : motivo.descricao,
        autorId: usuario.id,
      });
    });
    return { ok: "Orçamento recusado." };
  });
}

export async function recuperarOrcamento(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FUNIL", async (usuario) => {
    const p = await carregar(id);
    if (!acoesOrcamento(p.etapaAtualId, p.statusOrcamento).recuperar) throw new ErroValidacao("Só é possível recuperar orçamentos recusados.");
    await db.$transaction(async (tx) => {
      await tx.processo.update({ where: { id }, data: { statusOrcamento: "AGUARDANDO_APROVACAO", motivoRecusaId: null } });
      await mudarEtapa(tx, {
        processoId: id,
        para: ETAPA.COMERCIAL,
        responsavelId: p.responsavelId ?? usuario.id,
        motivo: "Orçamento recuperado",
        autorId: usuario.id,
      });
    });
    return { ok: "Orçamento recuperado." };
  });
}

export async function salvarContrato(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FUNIL", async () => {
    const p = await carregar(id);
    const dia = inteiro(f, "diaVencimento");
    if (dia !== null && (dia < 1 || dia > 31)) throw new ErroValidacao("O dia de vencimento precisa ser entre 1 e 31.");
    const documentacoes = f.getAll("documentacoes").filter((v): v is string => typeof v === "string" && v !== "");

    await db.$transaction([
      db.processo.update({
        where: { id },
        data: {
          numeroContrato: texto(f, "numeroContrato"),
          plano: texto(f, "plano"),
          // O valor só aparece (e só pode ser alterado) até a etapa 4.
          ...(p.etapaAtual.exibeValorContrato ? { valorMensal: decimal(f, "valorMensal") } : {}),
          diaVencimento: dia,
          validadeContrato: data(f, "validadeContrato"),
          visitasContratadas: inteiro(f, "visitasContratadas"),
          cargaHorariaVisita: inteiro(f, "cargaHorariaVisita"),
          incluiFichasTecnicas: marcado(f, "incluiFichasTecnicas"),
          incluiInfoNutricional: marcado(f, "incluiInfoNutricional"),
          incluiCardapios: marcado(f, "incluiCardapios"),
          emailRelatorios: texto(f, "emailRelatorios"),
          dataEnvioAssinatura: data(f, "dataEnvioAssinatura"),
          dataAssinatura: data(f, "dataAssinatura"),
          observacoes: texto(f, "observacoes"),
          pendencias: texto(f, "pendencias"),
        },
      }),
      db.processoDocumentacao.deleteMany({ where: { processoId: id } }),
      db.processoDocumentacao.createMany({ data: documentacoes.map((tipoDocumentacaoId) => ({ processoId: id, tipoDocumentacaoId })) }),
    ]);
    return { ok: "Dados do contrato salvos." };
  });
}

export async function marcarChecklist(processoId: string, itemId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FUNIL", async (usuario) => {
    const atual = await db.processoChecklist.findUnique({ where: { processoId_itemId: { processoId, itemId } } });
    const concluido = !atual?.concluido;
    await db.processoChecklist.upsert({
      where: { processoId_itemId: { processoId, itemId } },
      create: { processoId, itemId, concluido, concluidoEm: new Date(), concluidoPorId: usuario.id },
      update: { concluido, concluidoEm: concluido ? new Date() : null, concluidoPorId: concluido ? usuario.id : null },
    });
  });
}

export async function excluirProcesso(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FUNIL", async (usuario) => {
    if (!usuario.perfis.includes("Administrador")) throw new ErroValidacao("Só administradores podem excluir processos.");
    await db.processo.delete({ where: { id } });
    redirect("/funil");
  });
}
