import "server-only";
import { db } from "@/lib/db";

// Listas usadas em seletores de formulário.

export function usuariosAtivos() {
  return db.usuario.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } });
}

export function servicosAtivos() {
  return db.servico.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } });
}

export function clientesParaSelecao() {
  return db.cliente.findMany({ select: { id: true, nomeFantasia: true }, orderBy: { nomeFantasia: "asc" } });
}

export function opcoes<T extends { id: string }>(itens: T[], rotulo: (item: T) => string) {
  return itens.map((i) => ({ valor: i.id, rotulo: rotulo(i) }));
}
