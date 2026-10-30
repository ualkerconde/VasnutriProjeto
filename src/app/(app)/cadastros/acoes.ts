"use server";

import type { Modulo } from "@/generated/prisma/enums";
import { comModulo } from "@/lib/acao";
import { apagarArquivo, salvarArquivo } from "@/lib/armazenamento";
import { CONFIGURACOES, type ChaveConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { ErroValidacao, inteiro, marcado, texto, textoObrigatorio, type EstadoForm } from "@/lib/form";
import { CAMPOS_PROCESSO } from "@/lib/funil/campos";
import { CHAVE_LOGOTIPO, lerLogotipo, TIPOS_LOGOTIPO } from "@/lib/logotipo";
import { MENU } from "@/lib/modulos";
import { ACOES_CARTAO, type PermissoesCartao } from "@/lib/planejamento/regras";

export type ListaSimples = "motivos" | "servicos" | "documentacao" | "categorias";

// As listas têm o mesmo formato: um texto e "ativo".
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
    case "categorias":
      return {
        criar: (v: string) => db.categoriaDespesa.create({ data: { nome: v } }),
        renomear: (id: string, v: string) => db.categoriaDespesa.update({ where: { id }, data: { nome: v } }),
        alternar: async (id: string) => {
          const item = await db.categoriaDespesa.findUniqueOrThrow({ where: { id } });
          return db.categoriaDespesa.update({ where: { id }, data: { ativo: !item.ativo } });
        },
      };
  }
}

// Motivos de recusa podem ser cadastrados por quem trabalha no funil, não só no Cadastros.
const MODULOS_LISTA: Record<ListaSimples, Modulo[]> = {
  motivos: ["CADASTROS", "FUNIL"],
  servicos: ["CADASTROS"],
  documentacao: ["CADASTROS"],
  categorias: ["CADASTROS"],
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
    const etapas = await db.etapa.findMany({ select: { id: true } });
    await db.perfil.create({
      data: {
        nome: textoObrigatorio(f, "nome", "Nome do perfil"),
        descricao: texto(f, "descricao"),
        permissoes: { create: { modulo: "PAINEL" } },
        // Começa podendo alterar processos em todas as etapas, como os outros perfis.
        etapasEdicao: { create: etapas.map((e) => ({ etapaId: e.id })) },
      },
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

// ─── Permissões do funil ──────────────────────────────────────────────────

/** Regra 1: quais perfis podem alterar processos em cada etapa. Checkbox "etapa:perfil". */
export async function salvarPermissoesEtapas(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const [etapas, perfis] = await Promise.all([db.etapa.findMany({ select: { id: true } }), db.perfil.findMany({ select: { id: true } })]);
    const etapaIds = new Set(etapas.map((e) => e.id));
    const perfilIds = new Set(perfis.map((p) => p.id));
    const dados = f
      .getAll("permissao")
      .filter((v): v is string => typeof v === "string")
      .map((v) => {
        const [etapa, perfilId] = v.split(":");
        return { etapaId: Number(etapa), perfilId };
      })
      .filter((d) => etapaIds.has(d.etapaId) && perfilIds.has(d.perfilId));
    await db.$transaction([db.etapaPerfil.deleteMany(), db.etapaPerfil.createMany({ data: dados })]);
    return { ok: "Permissões por etapa salvas." };
  });
}

/** Regra 2: em quais etapas cada campo pode ser editado. Checkbox "campo:etapa". */
export async function salvarEdicaoCampos(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const marcados = f.getAll("editavel").filter((v): v is string => typeof v === "string");
    await db.$transaction(
      CAMPOS_PROCESSO.map(({ chave }) => {
        const etapasEditaveis = marcados.filter((m) => m.startsWith(`${chave}:`)).map((m) => Number(m.split(":")[1]));
        return db.campoProcesso.upsert({ where: { chave }, update: { etapasEditaveis }, create: { chave, etapasEditaveis } });
      }),
    );
    return { ok: "Edição dos campos por etapa salva." };
  });
}

/** Regra 3: campos sensíveis e os perfis que podem vê-los. */
export async function salvarCamposSensiveis(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const [etapas, perfis] = await Promise.all([db.etapa.findMany({ select: { id: true } }), db.perfil.findMany({ select: { id: true } })]);
    const perfilIds = new Set(perfis.map((p) => p.id));
    const sensiveis = new Set(f.getAll("sensivel").filter((v): v is string => typeof v === "string"));
    const quemVe = f.getAll("ve").filter((v): v is string => typeof v === "string");
    await db.$transaction(
      CAMPOS_PROCESSO.map(({ chave }) => {
        const sensivel = sensiveis.has(chave);
        const perfisVisiveis = quemVe
          .filter((m) => m.startsWith(`${chave}:`))
          .map((m) => m.split(":")[1])
          .filter((id) => perfilIds.has(id));
        return db.campoProcesso.upsert({
          where: { chave },
          update: { sensivel, perfisVisiveis },
          create: { chave, sensivel, perfisVisiveis, etapasEditaveis: etapas.map((e) => e.id) },
        });
      }),
    );
    return { ok: "Campos sensíveis salvos." };
  });
}

// ─── Planejamento ─────────────────────────────────────────────────────────

/** O que cada perfil pode fazer nos cartões. Checkbox "perfil:acao". */
export async function salvarPermissoesPlanejamento(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const perfis = await db.perfil.findMany({ select: { id: true } });
    const marcados = new Set(f.getAll("pode").filter((v): v is string => typeof v === "string"));
    await db.$transaction(
      perfis.map(({ id }) => {
        const regra = Object.fromEntries(ACOES_CARTAO.map((a) => [a.chave, marcados.has(`${id}:${a.chave}`)])) as PermissoesCartao;
        return db.planejamentoPerfil.upsert({ where: { perfilId: id }, update: regra, create: { perfilId: id, ...regra } });
      }),
    );
    return { ok: "Permissões do planejamento salvas." };
  });
}

/** Usuários que aparecem como colunas do quadro, com a ordem. */
export async function salvarColunasPlanejamento(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("USUARIOS", async () => {
    const ativos = new Set((await db.usuario.findMany({ where: { ativo: true }, select: { id: true } })).map((u) => u.id));
    const escolhidos = f.getAll("coluna").filter((v): v is string => typeof v === "string" && ativos.has(v));
    const dados = escolhidos.map((usuarioId) => ({ usuarioId, ordem: inteiro(f, `ordem:${usuarioId}`) ?? 0 }));
    await db.$transaction([db.planejamentoColuna.deleteMany(), db.planejamentoColuna.createMany({ data: dados })]);
    return { ok: dados.length ? "Colunas do quadro salvas." : "Nenhum escolhido: o quadro mostra os usuários com perfil Técnico." };
  });
}

export async function adicionarChecklistVisita(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("CADASTROS", async () => {
    const ultimo = await db.checklistVisitaItem.findFirst({ orderBy: { ordem: "desc" } });
    await db.checklistVisitaItem.create({ data: { descricao: textoObrigatorio(f, "descricao", "Item"), ordem: (ultimo?.ordem ?? -1) + 1 } });
    return { ok: "Item adicionado." };
  });
}

export async function alternarChecklistVisita(id: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("CADASTROS", async () => {
    const item = await db.checklistVisitaItem.findUniqueOrThrow({ where: { id } });
    await db.checklistVisitaItem.update({ where: { id }, data: { ativo: !item.ativo } });
  });
}

// ─── Aparência ────────────────────────────────────────────────────────────

export async function enviarLogotipo(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  return comModulo("CADASTROS", async () => {
    const arquivo = f.get("logotipo");
    if (!(arquivo instanceof File) || arquivo.size === 0) throw new ErroValidacao("Escolha a imagem do logotipo.");
    if (!TIPOS_LOGOTIPO.includes(arquivo.type)) throw new ErroValidacao("Envie o logotipo em PNG, JPG, WEBP ou GIF.");
    if (arquivo.size > 2 * 1024 * 1024) throw new ErroValidacao("O logotipo pode ter no máximo 2 MB.");
    const anterior = await lerLogotipo();
    const salvo = await salvarArquivo(arquivo);
    const valor = { caminho: salvo.caminho, mime: salvo.mime, versao: Date.now().toString(36) };
    await db.configuracao.upsert({
      where: { chave: CHAVE_LOGOTIPO },
      update: { valor },
      create: { chave: CHAVE_LOGOTIPO, valor, descricao: "Logotipo exibido no menu e no login." },
    });
    if (anterior) await apagarArquivo(anterior.caminho);
    return { ok: "Logotipo atualizado." };
  });
}

export async function removerLogotipo(_: EstadoForm): Promise<EstadoForm> {
  return comModulo("CADASTROS", async () => {
    const anterior = await lerLogotipo();
    await db.configuracao.deleteMany({ where: { chave: CHAVE_LOGOTIPO } });
    if (anterior) await apagarArquivo(anterior.caminho);
    return { ok: "Logotipo removido." };
  });
}
