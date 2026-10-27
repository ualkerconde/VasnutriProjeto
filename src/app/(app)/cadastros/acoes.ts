"use server";

import type { Modulo } from "@/generated/prisma/enums";
import { comModulo } from "@/lib/acao";
import { CONFIGURACOES, type ChaveConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { ErroValidacao, inteiro, marcado, texto, textoObrigatorio, type EstadoForm } from "@/lib/form";
import { MENU } from "@/lib/modulos";

export type ListaSimples = "motivos" | "servicos" | "documentacao";

// As três listas têm o mesmo formato: um texto e "ativo".
function tabela(lista: ListaSimples) {
  switch (lista) {
    case "motivos":
      return {
        criar: (v: string) => db.motivoRecusa.create({ data: { descricao: v } }),
        renomear: (id: string, v: string) => db.motivoRecusa.update({ where: { id }, data: { descricao: v } }),
        alternar: async (id: string) => {
          const item = await db.motivoRecusa.findUniqueOrThrow({ where: { id } });
          return db.motivoRecusa.update({ where: { id }, data: { ativo: !item.ativo } });
        },
      };
    case "servicos":
      return {
        criar: (v: string) => db.servico.create({ data: { nome: v } }),
        renomear: (id: string, v: string) => db.servico.update({ where: { id }, data: { nome: v } }),
        alternar: async (id: string) => {
          const item = await db.servico.findUniqueOrThrow({ where: { id } });
          return db.servico.update({ where: { id }, data: { ativo: !item.ativo } });
        },
      };
    case "documentacao":
      return {
        criar: (v: string) => db.tipoDocumentacao.create({ data: { nome: v } }),
        renomear: (id: string, v: string) => db.tipoDocumentacao.update({ where: { id }, data: { nome: v } }),
        alternar: async (id: string) => {
          const item = await db.tipoDocumentacao.findUniqueOrThrow({ where: { id } });
          return db.tipoDocumentacao.update({ where: { id }, data: { ativo: !item.ativo } });
        },
      };
  }
}

// Motivos de recusa podem ser cadastrados por quem trabalha no funil, não só no Cadastros.
const MODULOS_LISTA: Record<ListaSimples, Modulo[]> = {
  motivos: ["CADASTROS", "FUNIL"],
  servicos: ["CADASTROS"],
  documentacao: ["CADASTROS"],
};

export async function adicionarItem(lista: ListaSimples, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(MODULOS_LISTA[lista], async () => {
    await tabela(lista).criar(textoObrigatorio(f, "valor", "Descrição"));
    return { ok: "Adicionado." };
  });
}

export async function renomearItem(lista: ListaSimples, id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo(MODULOS_LISTA[lista], async () => {
    await tabela(lista).renomear(id, textoObrigatorio(f, "valor", "Descrição"));
  });
}

export async function alternarItem(lista: ListaSimples, id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo(MODULOS_LISTA[lista], async () => {
    await tabela(lista).alternar(id);
  });
}

export async function adicionarChecklist(etapaId: number, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("CADASTROS", async () => {
    const ultimo = await db.checklistItem.findFirst({ where: { etapaId }, orderBy: { ordem: "desc" } });
    await db.checklistItem.create({
      data: { etapaId, descricao: textoObrigatorio(f, "descricao", "Item"), ordem: (ultimo?.ordem ?? -1) + 1 },
    });
    return { ok: "Item adicionado." };
  });
}

export async function alternarChecklist(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("CADASTROS", async () => {
    const item = await db.checklistItem.findUniqueOrThrow({ where: { id } });
    await db.checklistItem.update({ where: { id }, data: { ativo: !item.ativo } });
  });
}

export async function salvarPermissoes(perfilId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const perfil = await db.perfil.findUniqueOrThrow({ where: { id: perfilId } });
    const validos = new Set(MENU.map((m) => m.modulo));
    const modulos = f.getAll("modulos").filter((m): m is Modulo => typeof m === "string" && validos.has(m as Modulo));
    if (perfil.nome === "Administrador" && !modulos.includes("USUARIOS")) {
      throw new ErroValidacao("O perfil Administrador precisa manter o acesso a Usuários.");
    }
    await db.$transaction([
      db.perfilPermissao.deleteMany({ where: { perfilId } }),
      db.perfilPermissao.createMany({ data: modulos.map((modulo) => ({ perfilId, modulo })) }),
    ]);
    return { ok: `Permissões de ${perfil.nome} salvas.` };
  });
}

export async function criarPerfil(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    await db.perfil.create({
      data: { nome: textoObrigatorio(f, "nome", "Nome do perfil"), descricao: texto(f, "descricao"), permissoes: { create: { modulo: "PAINEL" } } },
    });
    return { ok: "Perfil criado. Marque os módulos dele abaixo." };
  });
}

export async function salvarConfiguracoes(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("CADASTROS", async () => {
    for (const chave of Object.keys(CONFIGURACOES) as ChaveConfig[]) {
      const padrao = CONFIGURACOES[chave].padrao;
      let valor: boolean | number;
      if (typeof padrao === "boolean") {
        valor = marcado(f, chave);
      } else {
        const n = inteiro(f, chave);
        if (n === null || n < 0 || n > 365) throw new ErroValidacao(`"${CONFIGURACOES[chave].rotulo}" precisa ser entre 0 e 365.`);
        valor = n;
      }
      await db.configuracao.upsert({
        where: { chave },
        update: { valor },
        create: { chave, valor, descricao: CONFIGURACOES[chave].descricao },
      });
    }
    return { ok: "Configurações salvas." };
  });
}
