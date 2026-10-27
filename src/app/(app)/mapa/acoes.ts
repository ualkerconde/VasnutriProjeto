"use server";

import { comModulo } from "@/lib/acao";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import type { EstadoForm } from "@/lib/form";

/** Marca/desmarca o pedido do mapa de comercialização de um cliente. */
export async function alternarMapa(clienteId: string, _: EstadoForm): Promise<EstadoForm> {
  return comModulo("MAPA_COMERCIALIZACAO", async () => {
    const atual = await db.solicitacaoMapa.findFirst({ where: { clienteId } });
    if (!atual) {
      await db.solicitacaoMapa.create({ data: { clienteId, solicitado: true, data: hoje() } });
      return;
    }
    const solicitado = !atual.solicitado;
    await db.solicitacaoMapa.update({ where: { id: atual.id }, data: { solicitado, data: solicitado ? hoje() : null } });
  });
}

/** Começo de um novo ciclo: todos voltam para "não solicitado". */
export async function reiniciarMapa(_: EstadoForm): Promise<EstadoForm> {
  return comModulo("MAPA_COMERCIALIZACAO", async () => {
    const { count } = await db.solicitacaoMapa.updateMany({ data: { solicitado: false, data: null } });
    return { ok: `${count} cliente(s) voltaram para "não solicitado".` };
  });
}
