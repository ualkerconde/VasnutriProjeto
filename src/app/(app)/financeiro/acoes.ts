"use server";

import { comModulo } from "@/lib/acao";
import { apagarArquivo } from "@/lib/armazenamento";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { anexarArquivos, apagarArquivosDe } from "@/lib/financeiro/anexos";
import { MAXIMO_PARCELAS } from "@/lib/financeiro/regras";
import { criarParcelas } from "@/lib/financeiro/servico";
import { data, decimal, ErroValidacao, inteiro, texto, type EstadoForm } from "@/lib/form";

async function parcela(id: string) {
  const p = await db.parcela.findUnique({ where: { id } });
  if (!p) throw new ErroValidacao("Parcela não encontrada. Atualize a página.");
  return p;
}

function valorPositivo(f: FormData, nome: string, rotulo: string) {
  const v = decimal(f, nome);
  if (v === null || Number(v) <= 0) throw new ErroValidacao(`Informe ${rotulo} maior que zero.`);
  return v;
}

export async function gerarParcelas(processoId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async () => {
    const primeiro = data(f, "primeiroVencimento");
    if (!primeiro) throw new ErroValidacao("Informe o primeiro vencimento.");
    const quantidade = inteiro(f, "quantidade");
    if (!quantidade || quantidade < 1 || quantidade > MAXIMO_PARCELAS) throw new ErroValidacao(`A quantidade precisa ser de 1 a ${MAXIMO_PARCELAS}.`);
    const valor = valorPositivo(f, "valor", "o valor da parcela");
    const criadas = await criarParcelas(db, { processoId, inicio: primeiro, diaVencimento: primeiro.getUTCDate(), quantidade, valor });
    const repetidas = quantidade - criadas;
    return { ok: `${criadas} parcela(s) criada(s).${repetidas > 0 ? ` ${repetidas} já existia(m) no mesmo mês e foi(ram) mantida(s).` : ""}` };
  });
}

/** Baixa com a data e o valor informados (ou hoje e o valor da parcela). */
export async function receberParcela(id: string, _: EstadoForm, f?: FormData): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async (usuario) => {
    const p = await parcela(id);
    if (p.cancelada) throw new ErroValidacao("Parcela cancelada não pode ser recebida.");
    const recebidoEm = (f && data(f, "recebidoEm")) || hoje();
    const valorRecebido = (f && decimal(f, "valorRecebido")) || p.valor.toString();
    const numeroNf = f ? texto(f, "numeroNf") : null;
    await db.parcela.update({
      where: { id },
      data: { recebidoEm, valorRecebido, baixadoPorId: usuario.id, ...(numeroNf ? { numeroNf } : {}) },
    });
    if (f) await anexarArquivos(f, "nf", { parcelaId: id }, { tipo: "Nota fiscal", usuarioId: usuario.id });
    return { ok: "Recebimento registrado." };
  });
}

export async function estornarParcela(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async () => {
    await db.parcela.update({ where: { id }, data: { recebidoEm: null, valorRecebido: null, baixadoPorId: null } });
    return { ok: "Recebimento desfeito." };
  });
}

export async function salvarParcela(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async () => {
    const p = await parcela(id);
    const vencimento = data(f, "vencimento");
    if (!vencimento) throw new ErroValidacao("Informe o vencimento.");
    const recebidoEm = data(f, "recebidoEm");
    await db.parcela.update({
      where: { id },
      data: {
        vencimento,
        valor: valorPositivo(f, "valor", "o valor"),
        numeroNf: texto(f, "numeroNf"),
        observacao: texto(f, "observacao"),
        // Já recebida: deixa corrigir a data e o valor do recebimento.
        ...(p.recebidoEm ? { recebidoEm: recebidoEm ?? p.recebidoEm, valorRecebido: decimal(f, "valorRecebido") ?? p.valorRecebido } : {}),
      },
    });
    return { ok: "Parcela salva." };
  });
}

export async function alternarCancelamento(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async () => {
    const p = await parcela(id);
    if (p.recebidoEm && !p.cancelada) throw new ErroValidacao("Desfaça o recebimento antes de cancelar.");
    await db.parcela.update({ where: { id }, data: { cancelada: !p.cancelada } });
  });
}

export async function excluirParcela(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async () => {
    await apagarArquivosDe({ parcelaId: id });
    await db.parcela.delete({ where: { id } });
    return { ok: "Parcela excluída." };
  });
}

export async function anexarNf(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async (usuario) => {
    await parcela(id);
    await anexarArquivos(f, "nf", { parcelaId: id }, { tipo: "Nota fiscal", usuarioId: usuario.id, obrigatorio: true });
    const numeroNf = texto(f, "numeroNf");
    if (numeroNf) await db.parcela.update({ where: { id }, data: { numeroNf } });
    return { ok: "Nota fiscal anexada." };
  });
}

export async function removerNf(arquivoId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("FINANCEIRO", async () => {
    const a = await db.arquivo.findUnique({ where: { id: arquivoId } });
    if (!a?.parcelaId) throw new ErroValidacao("Arquivo não encontrado.");
    await db.arquivo.delete({ where: { id: arquivoId } });
    await apagarArquivo(a.caminhoStorage);
  });
}
