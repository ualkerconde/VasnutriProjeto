import type { Metadata } from "next";
import Link from "next/link";
import { BotaoAcao } from "@/components/formulario";
import { CabecalhoPagina, Cartao, EstadoVazio } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth/sessao";
import { tempoRelativo } from "@/lib/datas";
import { db } from "@/lib/db";
import { abrirNotificacao, marcarLida, marcarTodasLidas } from "./acoes";

export const metadata: Metadata = { title: "Notificações" };

export default async function Notificacoes({ searchParams }: PageProps<"/notificacoes">) {
  const usuario = await exigirUsuario();
  const { todas } = await searchParams;
  const verTodas = todas === "1";
  const lista = await db.notificacao.findMany({
    where: { usuarioId: usuario.id, ...(verTodas ? {} : { lidaEm: null }) },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });
  const agora = new Date();

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Avisos"
        titulo="Notificações"
        descricao="Prazos, vencimentos, atrasos e mudanças de etapa dos seus processos."
        acoes={
          !verTodas && lista.length > 0 ? (
            <BotaoAcao acao={marcarTodasLidas} pequeno={false}>
              Marcar todas como lidas
            </BotaoAcao>
          ) : undefined
        }
      />
      <div className="flex gap-2">
        <Link href="/notificacoes" className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${!verTodas ? "bg-tinta text-menta" : "border border-linha bg-superficie text-texto-2"}`}>
          Não lidas
        </Link>
        <Link href="/notificacoes?todas=1" className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${verTodas ? "bg-tinta text-menta" : "border border-linha bg-superficie text-texto-2"}`}>
          Todas
        </Link>
      </div>
      <Cartao>
        {lista.length === 0 ? (
          <EstadoVazio>{verTodas ? "Nenhuma notificação ainda." : "Tudo em dia. Nenhuma notificação nova."}</EstadoVazio>
        ) : (
          <ul className="flex flex-col gap-2">
            {lista.map((n) => (
              <li key={n.id} className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-3 ${n.lidaEm ? "bg-fundo" : "bg-[#FDF6E6]"}`}>
                <span className={`size-2.5 flex-none rounded-full ${n.lidaEm ? "bg-linha" : "bg-ambar"}`} />
                <span className="min-w-0 flex-[1_1_240px]">
                  <span className="block text-sm font-semibold">{n.titulo}</span>
                  <span className="block text-[13px] text-suave">
                    {n.mensagem && `${n.mensagem} · `}
                    {tempoRelativo(n.criadoEm, agora)}
                  </span>
                </span>
                <span className="flex gap-2">
                  {n.entidadeId && (
                    <BotaoAcao acao={abrirNotificacao.bind(null, n.id)} variante="secundario">
                      Abrir
                    </BotaoAcao>
                  )}
                  {!n.lidaEm && (
                    <BotaoAcao acao={marcarLida.bind(null, n.id)} variante="fantasma">
                      Marcar lida
                    </BotaoAcao>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
