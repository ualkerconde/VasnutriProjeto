"use server";

import { redirect } from "next/navigation";
import type { TipoContato } from "@/generated/prisma/enums";
import { comModulo } from "@/lib/acao";
import { somenteDigitos, TIPOS_CONTATO } from "@/lib/clientes";
import { db } from "@/lib/db";
import { ErroValidacao, texto, textoObrigatorio, type EstadoForm } from "@/lib/form";

function dadosCliente(f: FormData) {
  const cnpjDigitado = texto(f, "cnpj");
  const cnpj = cnpjDigitado ? somenteDigitos(cnpjDigitado) : null;
  if (cnpj && cnpj.length !== 14) throw new ErroValidacao("O CNPJ precisa ter 14 números.");
  const uf = texto(f, "uf");
  return {
    nomeFantasia: textoObrigatorio(f, "nomeFantasia", "Nome fantasia"),
    razaoSocial: texto(f, "razaoSocial"),
    cnpj,
    logradouro: texto(f, "logradouro"),
    numero: texto(f, "numero"),
    complemento: texto(f, "complemento"),
    bairro: texto(f, "bairro"),
    cidade: texto(f, "cidade"),
    uf: uf ? uf.toUpperCase() : null,
    cep: texto(f, "cep"),
    observacaoNf: texto(f, "observacaoNf"),
    gestorId: texto(f, "gestorId"),
  };
}

function servicosMarcados(f: FormData) {
  return f.getAll("servicos").filter((v): v is string => typeof v === "string" && v !== "");
}

export async function criarCliente(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("CLIENTES", async () => {
    const cliente = await db.cliente.create({
      data: {
        ...dadosCliente(f),
        servicos: { create: servicosMarcados(f).map((servicoId) => ({ servicoId })) },
      },
    });
    redirect(`/clientes/${cliente.id}`);
  });
}

export async function salvarCliente(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("CLIENTES", async () => {
    const servicos = servicosMarcados(f);
    await db.$transaction([
      db.cliente.update({ where: { id }, data: dadosCliente(f) }),
      db.clienteServico.deleteMany({ where: { clienteId: id } }),
      db.clienteServico.createMany({ data: servicos.map((servicoId) => ({ clienteId: id, servicoId })) }),
    ]);
    return { ok: "Cliente salvo." };
  });
}

export async function excluirCliente(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("CLIENTES", async () => {
    const processos = await db.processo.count({ where: { clienteId: id } });
    const solicitacoes = await db.solicitacaoEscritorio.count({ where: { clienteId: id } });
    if (processos + solicitacoes > 0) {
      throw new ErroValidacao("Este cliente tem processos ou solicitações e não pode ser excluído.");
    }
    await db.cliente.delete({ where: { id } });
    redirect("/clientes");
  });
}

export async function adicionarContato(clienteId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("CLIENTES", async () => {
    const tipo = texto(f, "tipo");
    if (!tipo || !(tipo in TIPOS_CONTATO)) throw new ErroValidacao("Escolha o tipo de contato.");
    await db.clienteContato.create({
      data: {
        clienteId,
        tipo: tipo as TipoContato,
        valor: textoObrigatorio(f, "valor", "Contato"),
        nome: texto(f, "nome"),
      },
    });
    return { ok: "Contato adicionado." };
  });
}

export async function removerContato(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("CLIENTES", async () => {
    await db.clienteContato.delete({ where: { id } });
  });
}
