import "server-only";
import type { UsuarioAtual } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { ErroValidacao } from "@/lib/form";
import { ehAdministrador } from "@/lib/funil/permissoes";
import { ACOES_CARTAO, permissoesDoUsuario, type AcaoCartao, type PermissoesCartao } from "./regras";

export async function permissoesPlanejamento(usuario: UsuarioAtual): Promise<PermissoesCartao> {
  const regras = await db.planejamentoPerfil.findMany({ where: { perfilId: { in: usuario.perfilIds } } });
  return permissoesDoUsuario(usuario.perfilIds, regras, ehAdministrador(usuario));
}

export async function exigirPermissaoCartao(usuario: UsuarioAtual, acao: AcaoCartao) {
  const pode = await permissoesPlanejamento(usuario);
  if (!pode[acao]) {
    const rotulo = ACOES_CARTAO.find((a) => a.chave === acao)?.rotulo ?? acao;
    throw new ErroValidacao(`Seu perfil não pode "${rotulo}" cartões. Isso é definido em Cadastros › Planejamento.`);
  }
}

export const PERFIL_CONSULTOR = "Técnico";

/**
 * Consultores que viram colunas, na ordem escolhida em Cadastros.
 * Enquanto ninguém escolheu, entram os usuários ativos com perfil Técnico.
 */
export async function consultoresDoQuadro() {
  const escolhidos = await db.planejamentoColuna.findMany({
    where: { usuario: { ativo: true } },
    orderBy: [{ ordem: "asc" }, { usuario: { nome: "asc" } }],
    select: { usuario: { select: { id: true, nome: true } } },
  });
  if (escolhidos.length > 0) return { configurado: true, consultores: escolhidos.map((e) => e.usuario) };
  const tecnicos = await db.usuario.findMany({
    where: { ativo: true, perfis: { some: { perfil: { nome: PERFIL_CONSULTOR } } } },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  return { configurado: false, consultores: tecnicos };
}
