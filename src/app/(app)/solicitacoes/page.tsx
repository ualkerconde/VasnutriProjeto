import type { Metadata } from "next";
import Link from "next/link";
import { Formulario } from "@/components/formulario";
import { CabecalhoPagina, Cartao, EstadoVazio, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { clientesParaSelecao, opcoes, usuariosAtivos } from "@/lib/listas";
import { situacaoSolicitacao } from "@/lib/solicitacoes";
import { criarSolicitacao } from "./acoes";
import { CamposSolicitacao } from "./campos";

export const metadata: Metadata = { title: "Solicitações" };

export default async function Solicitacoes({ searchParams }: PageProps<"/solicitacoes">) {
  const usuario = await exigirModulo("SOLICITACOES");
  const { ver } = await searchParams;
  const filtro = ver === "concluidas" ? "concluidas" : ver === "minhas" ? "minhas" : "abertas";

  const [lista, clientes, usuarios] = await Promise.all([
    db.solicitacaoEscritorio.findMany({
      where:
        filtro === "concluidas"
          ? { status: "CONCLUIDO" }
          : filtro === "minhas"
            ? { status: "EM_ABERTO", responsavelId: usuario.id }
            : { status: "EM_ABERTO" },
      orderBy: filtro === "concluidas" ? { concluidoEm: "desc" } : [{ prazo: { sort: "asc", nulls: "last" } }, { data: "asc" }],
      take: filtro === "concluidas" ? 100 : undefined,
      include: { cliente: { select: { nomeFantasia: true } }, responsavel: { select: { nome: true } } },
    }),
    clientesParaSelecao(),
    usuariosAtivos(),
  ]);
  const hojeData = hoje();

  return (
    <>
      <CabecalhoPagina sobretitulo="Escritório" titulo="Solicitações do escritório" descricao="Em aberto com prazo vencido ficam em vermelho; no prazo, em verde." />

      <nav aria-label="Filtro" className="flex flex-wrap gap-2">
        {[
          ["abertas", "Em aberto"],
          ["minhas", "Minhas"],
          ["concluidas", "Concluídas"],
        ].map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={`/solicitacoes?ver=${valor}`}
            aria-current={filtro === valor ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${filtro === valor ? "bg-tinta text-menta" : "border border-linha bg-superficie text-texto-2 hover:border-verde"}`}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-start gap-5">
        <Cartao className="flex-[999_1_560px]">
          {lista.length === 0 ? (
            <EstadoVazio>Nenhuma solicitação aqui.</EstadoVazio>
          ) : (
            <Tabela cabecalho={["Serviço", "Cliente", "Responsável", "Prazo", "Situação"]}>
              {lista.map((s) => {
                const sit = situacaoSolicitacao(s, hojeData);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/solicitacoes/${s.id}`} className="font-semibold hover:text-verde">
                        {s.servico}
                      </Link>
                      {s.requerValidacao && <div className="text-xs text-suave">precisa de validação</div>}
                    </td>
                    <td className="text-texto-2">{s.cliente.nomeFantasia}</td>
                    <td className="text-texto-2">{s.responsavel?.nome ?? "—"}</td>
                    <td className="whitespace-nowrap text-texto-2">{fmtData(s.prazo)}</td>
                    <td>
                      <Selo cor={sit.cor}>{sit.rotulo}</Selo>
                    </td>
                  </tr>
                );
              })}
            </Tabela>
          )}
        </Cartao>

        <Cartao titulo="Nova solicitação" className="flex-[1_1_340px]">
          <Formulario acao={criarSolicitacao} botao="Criar solicitação">
            <CamposSolicitacao clientes={opcoes(clientes, (c) => c.nomeFantasia)} processos={[]} usuarios={opcoes(usuarios, (u) => u.nome)} />
          </Formulario>
        </Cartao>
      </div>
    </>
  );
}
