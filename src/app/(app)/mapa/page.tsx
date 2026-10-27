import type { Metadata } from "next";
import Link from "next/link";
import { BotaoAcao } from "@/components/formulario";
import { CabecalhoPagina, Cartao, EstadoVazio, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { filtroContratoVigente, formatarCnpj } from "@/lib/clientes";
import { fmtData } from "@/lib/datas";
import { db } from "@/lib/db";
import { alternarMapa, reiniciarMapa } from "./acoes";

export const metadata: Metadata = { title: "Mapa de comercialização" };

export default async function Mapa({ searchParams }: PageProps<"/mapa">) {
  await exigirModulo("MAPA_COMERCIALIZACAO");
  const { todos } = await searchParams;
  const verTodos = todos === "1";

  const clientes = await db.cliente.findMany({
    where: verTodos ? {} : { OR: [{ processos: { some: filtroContratoVigente() } }, { solicitacoesMapa: { some: {} } }] },
    orderBy: { nomeFantasia: "asc" },
    select: { id: true, nomeFantasia: true, cnpj: true, solicitacoesMapa: { take: 1 } },
  });
  const feitos = clientes.filter((c) => c.solicitacoesMapa[0]?.solicitado).length;

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Controle"
        titulo="Mapa de comercialização"
        descricao={`${feitos} de ${clientes.length} cliente(s) já solicitados neste ciclo.`}
        acoes={
          <BotaoAcao acao={reiniciarMapa} variante="perigo" pequeno={false} confirmar='Reiniciar o ciclo? Todos os clientes voltam para "não solicitado".'>
            Reiniciar ciclo
          </BotaoAcao>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/mapa"
          aria-current={verTodos ? undefined : "page"}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${!verTodos ? "bg-tinta text-menta" : "border border-linha bg-superficie text-texto-2"}`}
        >
          Clientes ativos
        </Link>
        <Link
          href="/mapa?todos=1"
          aria-current={verTodos ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${verTodos ? "bg-tinta text-menta" : "border border-linha bg-superficie text-texto-2"}`}
        >
          Todos os clientes
        </Link>
      </div>
      <Cartao>
        {clientes.length === 0 ? (
          <EstadoVazio>Nenhum cliente com contrato ativo.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Cliente", "CNPJ", "Situação", "Data", ""]}>
            {clientes.map((c) => {
              const mapa = c.solicitacoesMapa[0];
              return (
                <tr key={c.id}>
                  <td className="font-semibold">{c.nomeFantasia}</td>
                  <td className="font-mono text-[13px]">{formatarCnpj(c.cnpj)}</td>
                  <td>{mapa?.solicitado ? <Selo cor="verde">Solicitado</Selo> : <Selo cor="ambar">Não solicitado</Selo>}</td>
                  <td>{fmtData(mapa?.data)}</td>
                  <td>
                    <BotaoAcao acao={alternarMapa.bind(null, c.id)} variante={mapa?.solicitado ? "secundario" : "menta"}>
                      {mapa?.solicitado ? "Desfazer" : "Marcar solicitado"}
                    </BotaoAcao>
                  </td>
                </tr>
              );
            })}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
