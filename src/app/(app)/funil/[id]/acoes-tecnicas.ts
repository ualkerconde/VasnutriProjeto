"use server";

import { redirect } from "next/navigation";
import type { CategoriaArquivo } from "@/generated/prisma/enums";
import { comModulo } from "@/lib/acao";
import { apagarArquivo, salvarArquivo } from "@/lib/armazenamento";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import {
  data,
  dataHora,
  ErroValidacao,
  inteiro,
  lista,
  simNao,
  texto,
  textoObrigatorio,
  type EstadoForm,
} from "@/lib/form";
import { ETAPA } from "@/lib/funil/regras";
import { cicloAberto, mudarEtapa } from "@/lib/funil/servico";
import { notificar } from "@/lib/notificacoes";

// Quem trabalha no funil ou nas visitas pode registrar a parte técnica.
const TECNICO = ["FUNIL", "VISITAS"] as const;
const modulos = [...TECNICO];

async function cicloAtualId(processoId: string) {
  const ciclo = await db.$transaction((tx) => cicloAberto(tx, processoId));
  return ciclo?.id ?? null;
}

// ─── Coleta de dados ──────────────────────────────────────────────────────

const CAMPOS_COLETA = [
  "horarioPublico",
  "horarioProducao",
  "responsavelLegalNome",
  "responsavelLegalCargo",
  "responsavelLegalRg",
  "responsavelLegalCpf",
  "responsavelLegalTelefone",
  "telefoneEmpresa",
  "responsavelRelatorio",
  "encarregadosSetores",
  "dedetizadora",
  "fornecimentoAgua",
  "caixasDagua",
  "limpezaCaixaDagua",
  "coletaLixoComum",
  "coletaLixoOrganico",
  "coletaOleo",
  "medicinaSegurancaTrabalho",
  "responsaveisHigienizacao",
  "materiaisLimpeza",
  "escalaLimpeza",
  "equipamentosRefrigeracao",
  "principaisFornecedores",
  "observacoes",
] as const;

export async function novaColeta(processoId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    const coleta = await db.coletaDados.create({ data: { processoId, cicloId: await cicloAtualId(processoId) } });
    redirect(`/funil/${processoId}/coleta/${coleta.id}`);
  });
}

export async function salvarColeta(coletaId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    const dados = Object.fromEntries(CAMPOS_COLETA.map((c) => [c, texto(f, c)]));
    await db.coletaDados.update({
      where: { id: coletaId },
      data: { ...dados, dataPreenchimento: data(f, "dataPreenchimento") ?? undefined },
    });
    return { ok: "Coleta salva." };
  });
}

export async function excluirColeta(processoId: string, coletaId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.coletaDados.delete({ where: { id: coletaId } });
    redirect(`/funil/${processoId}#coletas`);
  });
}

function dadosSetor(f: FormData) {
  return {
    nome: textoObrigatorio(f, "nome", "Setor"),
    piso: texto(f, "piso"),
    parede: texto(f, "parede"),
    teto: texto(f, "teto"),
    portas: lista(f, "portas"),
    janelas: lista(f, "janelas"),
    ralo: texto(f, "ralo"),
    equipamentos: texto(f, "equipamentos"),
  };
}

export async function adicionarSetor(coletaId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.setor.create({ data: { coletaId, ...dadosSetor(f) } });
    return { ok: "Setor adicionado." };
  });
}

export async function salvarSetor(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.setor.update({ where: { id }, data: dadosSetor(f) });
    return { ok: "Setor salvo." };
  });
}

export async function removerSetor(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.setor.delete({ where: { id } });
  });
}

// ─── Visitas ──────────────────────────────────────────────────────────────

async function dadosVisita(f: FormData) {
  const inicio = dataHora(f, "inicio");
  if (!inicio) throw new ErroValidacao("Informe o início da visita.");
  const fim = dataHora(f, "fim");
  if (fim && fim < inicio) throw new ErroValidacao("O fim da visita está antes do início.");
  const teveInconformidade = simNao(f, "teveInconformidade") === true;
  return {
    inicio,
    fim,
    tecnicoId: texto(f, "tecnicoId"),
    realizado: texto(f, "realizado"),
    recebidoPor: texto(f, "recebidoPor"),
    placasColadas: simNao(f, "placasColadas"),
    fichasTecnicas: simNao(f, "fichasTecnicas"),
    infoNutricional: simNao(f, "infoNutricional"),
    cardapios: simNao(f, "cardapios"),
    teveInconformidade,
    inconformidades: teveInconformidade ? texto(f, "inconformidades") : null,
  };
}

export async function registrarVisita(processoId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.visita.create({ data: { processoId, cicloId: await cicloAtualId(processoId), ...(await dadosVisita(f)) } });
    redirect(`/funil/${processoId}#visitas`);
  });
}

export async function salvarVisita(processoId: string, visitaId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.visita.update({ where: { id: visitaId }, data: await dadosVisita(f) });
    redirect(`/funil/${processoId}#visitas`);
  });
}

export async function excluirVisita(processoId: string, visitaId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.visita.delete({ where: { id: visitaId } });
    redirect(`/funil/${processoId}#visitas`);
  });
}

// ─── Plano de ação ────────────────────────────────────────────────────────

export async function adicionarPlano(processoId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.planoAcao.create({
      data: {
        processoId,
        cicloId: await cicloAtualId(processoId),
        visitaId: texto(f, "visitaId"),
        data: data(f, "data") ?? hoje(),
        prazo: data(f, "prazo"),
        origem: texto(f, "origem"),
        descricao: textoObrigatorio(f, "descricao", "Ação"),
      },
    });
    return { ok: "Ação adicionada." };
  });
}

export async function alternarPlano(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    const plano = await db.planoAcao.findUniqueOrThrow({ where: { id } });
    await db.planoAcao.update({ where: { id }, data: { status: plano.status === "ABERTO" ? "CONCLUIDO" : "ABERTO" } });
  });
}

export async function removerPlano(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.planoAcao.delete({ where: { id } });
  });
}

// ─── Pedidos de documento ─────────────────────────────────────────────────

export async function solicitarDocumento(processoId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.solicitacaoDocumento.create({
      data: {
        processoId,
        cicloId: await cicloAtualId(processoId),
        data: data(f, "data") ?? hoje(),
        tipoDocumento: textoObrigatorio(f, "tipoDocumento", "Documento"),
      },
    });
    return { ok: "Pedido registrado." };
  });
}

export async function alternarDocumento(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    const doc = await db.solicitacaoDocumento.findUniqueOrThrow({ where: { id } });
    await db.solicitacaoDocumento.update({ where: { id }, data: { realizadoEm: doc.realizadoEm ? null : hoje() } });
  });
}

export async function removerDocumento(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    await db.solicitacaoDocumento.delete({ where: { id } });
  });
}

// ─── Placas (viram solicitação do escritório, como no AppSheet) ───────────

export async function solicitarPlacas(processoId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async (usuario) => {
    const processo = await db.processo.findUniqueOrThrow({ where: { id: processoId } });
    const placa = textoObrigatorio(f, "placa", "Qual placa");
    const quantidade = inteiro(f, "quantidade");
    const setores = texto(f, "setores");
    const responsavelId = texto(f, "responsavelId");
    const solicitacao = await db.solicitacaoEscritorio.create({
      data: {
        clienteId: processo.clienteId,
        processoId,
        data: hoje(),
        servico: "Placas",
        descricao: [placa, quantidade ? `Quantidade: ${quantidade}` : null, setores ? `Setores: ${setores}` : null, texto(f, "observacoes")]
          .filter(Boolean)
          .join("\n"),
        responsavelId,
        prazo: data(f, "prazo"),
      },
    });
    await notificar(
      db,
      {
        usuarioId: responsavelId,
        tipo: "SOLICITACAO_PRAZO",
        titulo: "Nova solicitação de placas",
        mensagem: placa,
        entidade: "solicitacao",
        entidadeId: solicitacao.id,
      },
      usuario.id,
    );
    return { ok: "Solicitação enviada ao escritório." };
  });
}

// ─── Arquivos ─────────────────────────────────────────────────────────────

export async function enviarArquivo(
  dono: { processoId?: string; solicitacaoEscritorioId?: string },
  _: EstadoForm,
  f: FormData,
): Promise<EstadoForm> {
  return comModulo(["FUNIL", "VISITAS", "SOLICITACOES"], async (usuario) => {
    const arquivo = f.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) throw new ErroValidacao("Escolha um arquivo.");
    const categoria = (texto(f, "categoria") === "FOTO" ? "FOTO" : "ANEXO") as CategoriaArquivo;
    let salvo;
    try {
      salvo = await salvarArquivo(arquivo);
    } catch (erro) {
      throw new ErroValidacao(erro instanceof Error ? erro.message : "Não foi possível salvar o arquivo.");
    }
    await db.arquivo.create({
      data: {
        processoId: dono.processoId ?? null,
        solicitacaoEscritorioId: dono.solicitacaoEscritorioId ?? null,
        categoria,
        tipo: texto(f, "tipo"),
        descricao: texto(f, "descricao"),
        data: data(f, "data") ?? hoje(),
        validade: data(f, "validade"),
        caminhoStorage: salvo.caminho,
        mime: salvo.mime,
        tamanhoBytes: salvo.tamanho,
        enviadoPorId: usuario.id,
      },
    });
    return { ok: "Arquivo enviado." };
  });
}

export async function removerArquivo(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(["FUNIL", "VISITAS", "SOLICITACOES"], async () => {
    const arquivo = await db.arquivo.delete({ where: { id } });
    await apagarArquivo(arquivo.caminhoStorage);
  });
}

// ─── Ciclo do contrato ────────────────────────────────────────────────────

export async function ajustarCiclo(cicloId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async () => {
    const inicio = data(f, "inicio");
    if (!inicio) throw new ErroValidacao("Informe o início do ciclo.");
    const fimPrevisto = data(f, "fimPrevisto");
    if (fimPrevisto && fimPrevisto <= inicio) throw new ErroValidacao("O fim do ciclo precisa ser depois do início.");
    await db.processoCiclo.update({ where: { id: cicloId }, data: { inicio, fimPrevisto } });
    return { ok: "Ciclo atualizado." };
  });
}

/** Fim do contrato confirmado por uma pessoa: fecha o ciclo e volta para Agendamento de diagnóstico. */
export async function encerrarCiclo(processoId: string, cicloId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(modulos, async (usuario) => {
    const processo = await db.processo.findUniqueOrThrow({ where: { id: processoId } });
    if (processo.etapaAtualId !== ETAPA.VISITAS) throw new ErroValidacao("O ciclo só pode ser encerrado em Visitas técnicas.");
    const ciclo = await db.processoCiclo.findUniqueOrThrow({ where: { id: cicloId } });
    if (ciclo.encerradoEm) throw new ErroValidacao("Este ciclo já foi encerrado.");
    const obs = texto(f, "observacao");
    await db.$transaction(async (tx) => {
      await tx.processoCiclo.update({ where: { id: cicloId }, data: { encerradoEm: new Date(), encerradoPorId: usuario.id } });
      await mudarEtapa(tx, {
        processoId,
        para: ETAPA.AGENDAMENTO_DIAGNOSTICO,
        responsavelId: texto(f, "responsavelId") ?? processo.responsavelId,
        motivo: `Fim do ciclo ${ciclo.numero}${obs ? `: ${obs}` : ""}`,
        autorId: usuario.id,
      });
      // O próximo ciclo começa quando o processo voltar para Visitas técnicas.
      await tx.processoChecklist.deleteMany({
        where: { processoId, item: { etapaId: { gte: ETAPA.AGENDAMENTO_DIAGNOSTICO, lte: ETAPA.TREINAMENTO } } },
      });
    });
    return { ok: "Ciclo encerrado. O processo voltou para Agendamento de diagnóstico." };
  });
}
