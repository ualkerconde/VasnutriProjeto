"use server";

import { redirect } from "next/navigation";
import { logado } from "@/lib/acao";
import { db } from "@/lib/db";
import type { EstadoForm } from "@/lib/form";
import { linkDaNotificacao } from "@/lib/notificacoes";

/** Marca como lida e abre o item da notificação. */
export async function abrirNotificacao(id: string, _: EstadoForm): Promise<EstadoForm> {
  return logado(async (usuario) => {
    const n = await db.notificacao.findFirst({ where: { id, usuarioId: usuario.id } });
    if (!n) return;
    if (!n.lidaEm) await db.notificacao.update({ where: { id }, data: { lidaEm: new Date() } });
    const link = linkDaNotificacao(n);
    if (link) redirect(link);
  });
}

export async function marcarLida(id: string, _: EstadoForm): Promise<EstadoForm> {
  return logado(async (usuario) => {
    await db.notificacao.updateMany({ where: { id, usuarioId: usuario.id, lidaEm: null }, data: { lidaEm: new Date() } });
  });
}

export async function marcarTodasLidas(_: EstadoForm): Promise<EstadoForm> {
  return logado(async (usuario) => {
    await db.notificacao.updateMany({ where: { usuarioId: usuario.id, lidaEm: null }, data: { lidaEm: new Date() } });
  });
}
