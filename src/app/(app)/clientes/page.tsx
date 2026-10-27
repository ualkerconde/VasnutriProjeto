import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao, classeCampo, EstadoVazio, LinkBotao, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { enderecoCompleto, filtroContratoVigente, formatarCnpj } from "@/lib/clientes";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes({ searchParams }: PageProps<"/clientes">) {
  await exigirModulo("CLIENTES");
  const { q, filtro } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const soAtivos = filtro === "ativos";
  const digitos = busca.replace(/\D/g, "");

  const clientes = await db.cliente.findMany({
    where: {
      AND: [
        busca
          ? {
              OR: [
                { nomeFantasia: { contains: busca, mode: "insensitive" } },
                { razaoSocial: { contains: busca, mode: "insensitive" } },
                ...(digitos.length >= 3 ? [{ cnpj: { contains: digitos } }] : []),
              ],
            }
          : {},
        soAtivos ? { processos: { some: filtroContratoVigente() } } : {},
      ],
    },
    orderBy: { nomeFantasia: "asc" },
    include: {
      processos: { where: filtroContratoVigente(), select: { id: true }, take: 1 },
      gestor: { select: { nome: true } },
    },
  });

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Cadastro"
        titulo="Clientes"
        descricao="Cliente ativo é quem tem contrato assinado e dentro da validade."
        acoes={<LinkBotao href="/clientes/novo">Novo cliente</LinkBotao>}
      />

      <Cartao>
        <form className="mb-4 flex flex-wrap gap-3" role="search">
          <label className="min-w-0 flex-[1_1_280px]">
            <span className="sr-only">Buscar</span>
            <input name="q" type="search" defaultValue={busca} placeholder="Buscar por nome ou CNPJ" className={`${classeCampo} h-11`} />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-texto-2">
            <input type="checkbox" name="filtro" value="ativos" defaultChecked={soAtivos} className="size-[18px] accent-verde" />
            Só ativos
          </label>
          <button type="submit" className="min-h-11 cursor-pointer rounded-xl border-[1.5px] border-linha bg-superficie px-4 text-sm font-semibold hover:border-verde">
            Filtrar
          </button>
        </form>

        {clientes.length === 0 ? (
          <EstadoVazio>{busca || soAtivos ? "Nenhum cliente encontrado com esse filtro." : "Nenhum cliente cadastrado ainda."}</EstadoVazio>
        ) : (
          <>
            <p className="mb-2 text-[13px] text-suave">{clientes.length} cliente(s)</p>
            <Tabela cabecalho={["Cliente", "CNPJ", "Endereço", "Gestor", "Situação"]}>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/clientes/${c.id}`} className="font-semibold text-texto hover:text-verde">
                      {c.nomeFantasia}
                    </Link>
                    {c.razaoSocial && <div className="text-xs text-suave">{c.razaoSocial}</div>}
                  </td>
                  <td className="font-mono text-[13px] whitespace-nowrap">{formatarCnpj(c.cnpj)}</td>
                  <td className="max-w-[280px] text-texto-2">{enderecoCompleto(c)}</td>
                  <td className="text-texto-2">{c.gestor?.nome ?? "—"}</td>
                  <td>{c.processos.length > 0 ? <Selo cor="verde">Ativo</Selo> : <Selo>Sem contrato</Selo>}</td>
                </tr>
              ))}
            </Tabela>
          </>
        )}
      </Cartao>
    </>
  );
}
