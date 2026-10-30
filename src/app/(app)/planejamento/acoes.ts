"use server";

import { comModulo } from "@/lib/acao";
import { apagarArquivo, salvarArquivo } from "@/lib/armazenamento";
import type { UsuarioAtual } from "@/lib/auth/sessao";
import { fmtDataHora, hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { dataHora, ErroValidacao, inteiro, texto, textoObrigatorio, type EstadoForm } from "@/lib/form";
import { cicloAberto } from "@/lib/funil/servico";
import { notificar } from "@/lib/notificacoes";
import { proximasAcoes } from "@/lib/planejamento/regras";
import { exigirPermissaoCartao } from "@/lib/planejamento/servico";

// Os cartões do Planejamento são as próprias visitas do processo: nada é copiado.

async function visitaDoCartao(id: string) {
  const visita = await db.visita.findUnique({ where: { id }, include: { processo: { include: { cliente: { select: { nomeFantasia: true } } } } } });
  if (!visita) throw new ErroValidacao("Esta visita não existe mais. Atualize a página.");
  return visita;
}

async function consultorValido(id: string | null) {
  if (!id) return null;
  const u = await db.usuario.findUnique({ where: { id }, select: { id: true, ativo: true } });
  if (!u?.ativo) throw new ErroValidacao("Consultor inválido.");
  return u.id;
}

/** Tempo previsto em minutos (campo do formulário); vazio = null. */
function duracaoPrevista(f: FormData): number | null {
  const min = inteiro(f, "duracaoPrevistaMin");
  if (min === null) return null;
  if (min < 5 || min > 24 * 60) throw new ErroValidacao("O tempo previsto precisa ser entre 5 minutos e 24 horas.");
  return min;
}

async function avisarConsultor(usuario: UsuarioAtual, visita: { id: string; tecnicoId: string | null; inicio: Date }, cliente: string, titulo: string) {
  await notificar(
    db,
    { usuarioId: visita.tecnicoId, tipo: "VISITA_AGENDADA", titulo: `${titulo}: ${cliente}`, mensagem: fmtDataHora(visita.inicio), entidade: "visita", entidadeId: visita.id },
    usuario.id,
  );
}

export async function agendarVisita(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("PLANEJAMENTO", async (usuario) => {
    await exigirPermissaoCartao(usuario, "criar");
    const processoId = textoObrigatorio(f, "processoId", "Cliente");
    const processo = await db.processo.findUnique({ where: { id: processoId }, include: { cliente: { select: { nomeFantasia: true } } } });
    if (!processo) throw new ErroValidacao("Processo não encontrado.");
    const inicio = dataHora(f, "inicio");
    if (!inicio) throw new ErroValidacao("Informe o dia e a hora da visita.");
    const tecnicoId = await consultorValido(texto(f, "tecnicoId"));
    const ciclo = await db.$transaction((tx) => cicloAberto(tx, processoId));
    const visita = await db.visita.create({
      data: {
        processoId,
        cicloId: ciclo?.id ?? null,
        tecnicoId,
        status: "AGENDADA",
        agendadaPara: inicio,
        agendadaPorId: usuario.id,
        // Sem tempo informado, vale a carga horária por visita do contrato.
        duracaoPrevistaMin: duracaoPrevista(f) ?? (processo.cargaHorariaVisita ? processo.cargaHorariaVisita * 60 : null),
        inicio,
        realizado: texto(f, "observacao"),
      },
    });
    await avisarConsultor(usuario, visita, processo.cliente.nomeFantasia, "Visita agendada para você");
    return { ok: "Visita agendada." };
  });
}

/** Arrastar o cartão para outra coluna (ou usar o botão Mover). tecnicoId vazio = "A distribuir". */
export async function moverVisita(visitaId: string, tecnicoId: string | null, inicioTexto?: string | null, duracaoMin?: number | null): Promise<EstadoForm> {
  return comModulo("PLANEJAMENTO", async (usuario) => {
    await exigirPermissaoCartao(usuario, "mover");
    const visita = await visitaDoCartao(visitaId);
    if (!proximasAcoes(visita.status).mover) throw new ErroValidacao("Visita concluída não muda de consultor.");
    const novoTecnico = await consultorValido(tecnicoId);
    let inicio = visita.inicio;
    if (inicioTexto) {
      const f = new FormData();
      f.set("inicio", inicioTexto);
      inicio = dataHora(f, "inicio") ?? inicio;
      if (visita.status !== "AGENDADA" && inicio.getTime() !== visita.inicio.getTime()) {
        throw new ErroValidacao("A visita já começou: só dá para trocar o consultor.");
      }
    }
    const atualizada = await db.visita.update({
      where: { id: visitaId },
      data: {
        tecnicoId: novoTecnico,
        inicio,
        ...(visita.status === "AGENDADA" ? { agendadaPara: inicio } : {}),
        ...(duracaoMin !== undefined ? { duracaoPrevistaMin: duracaoMin } : {}),
      },
    });
    if (novoTecnico !== visita.tecnicoId) await avisarConsultor(usuario, atualizada, visita.processo.cliente.nomeFantasia, "Visita passada para você");
    return { ok: "Cartão movido." };
  });
}

export async function moverVisitaForm(visitaId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  try {
    return await moverVisita(visitaId, texto(f, "tecnicoId"), texto(f, "inicio"), f.has("duracaoPrevistaMin") ? duracaoPrevista(f) : undefined);
  } catch (erro) {
    if (erro instanceof ErroValidacao) return { erro: erro.message };
    throw erro;
  }
}

export async function iniciarVisita(visitaId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("PLANEJAMENTO", async (usuario) => {
    await exigirPermissaoCartao(usuario, "iniciar");
    const visita = await visitaDoCartao(visitaId);
    if (!proximasAcoes(visita.status).iniciar) throw new ErroValidacao("Esta visita já foi iniciada.");
    // Quem inicia sem consultor definido assume a visita.
    await db.visita.update({ where: { id: visitaId }, data: { status: "EM_ANDAMENTO", inicio: new Date(), tecnicoId: visita.tecnicoId ?? usuario.id } });
    return { ok: "Visita iniciada." };
  });
}

export async function finalizarVisita(visitaId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("PLANEJAMENTO", async (usuario) => {
    await exigirPermissaoCartao(usuario, "finalizar");
    const visita = await visitaDoCartao(visitaId);
    if (!proximasAcoes(visita.status).finalizar) throw new ErroValidacao("Inicie a visita antes de finalizar.");
    const resumo = textoObrigatorio(f, "realizado", "Resumo da visita");
    const inconformidades = texto(f, "inconformidades");
    const itensValidos = new Set((await db.checklistVisitaItem.findMany({ where: { ativo: true }, select: { id: true } })).map((i) => i.id));
    const marcados = f.getAll("checklist").filter((v): v is string => typeof v === "string" && itensValidos.has(v));
    const fotos = f.getAll("fotos").filter((v): v is File => v instanceof File && v.size > 0);
    if (fotos.some((foto) => !foto.type.startsWith("image/"))) throw new ErroValidacao("Envie só imagens nas fotos da visita.");

    // Grava as fotos primeiro; se algo falhar, apaga o que já foi salvo.
    const salvas: { caminho: string; mime: string; tamanho: number }[] = [];
    try {
      for (const foto of fotos) salvas.push(await salvarArquivo(foto));
    } catch (erro) {
      await Promise.all(salvas.map((s) => apagarArquivo(s.caminho)));
      throw new ErroValidacao(erro instanceof Error ? erro.message : "Não foi possível salvar as fotos.");
    }

    await db.$transaction([
      db.visita.update({
        where: { id: visitaId },
        data: {
          status: "CONCLUIDA",
          fim: new Date(),
          realizado: resumo,
          recebidoPor: texto(f, "recebidoPor"),
          teveInconformidade: Boolean(inconformidades),
          inconformidades,
          tecnicoId: visita.tecnicoId ?? usuario.id,
        },
      }),
      db.visitaChecklist.deleteMany({ where: { visitaId } }),
      db.visitaChecklist.createMany({ data: marcados.map((itemId) => ({ visitaId, itemId })) }),
      ...salvas.map((s) =>
        db.arquivo.create({
          data: {
            processoId: visita.processoId,
            visitaId,
            categoria: "FOTO",
            tipo: "Foto da visita",
            descricao: `Visita de ${fmtDataHora(visita.inicio)}`,
            data: hoje(),
            caminhoStorage: s.caminho,
            mime: s.mime,
            tamanhoBytes: s.tamanho,
            enviadoPorId: usuario.id,
          },
        }),
      ),
    ]);
    return { ok: "Visita finalizada." };
  });
}

/** Só cartões ainda não iniciados podem ser cancelados (apaga o agendamento). */
export async function cancelarVisita(visitaId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("PLANEJAMENTO", async (usuario) => {
    await exigirPermissaoCartao(usuario, "criar");
    const visita = await visitaDoCartao(visitaId);
    if (!proximasAcoes(visita.status).cancelar) throw new ErroValidacao("Só dá para cancelar visitas que ainda não começaram.");
    await db.visita.delete({ where: { id: visitaId } });
    return { ok: "Agendamento cancelado." };
  });
}
