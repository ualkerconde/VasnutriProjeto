import type { Metadata } from "next";
import Link from "next/link";
import { Formulario } from "@/components/formulario";
import { BarrasHorizontais, GradeKpis } from "@/components/graficos";
import { NavegadorMes } from "@/components/navegador-mes";
import { CabecalhoPagina, Campo, Cartao, EstadoVazio, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, fmtMoeda, hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { intervaloDoMes } from "@/lib/financeiro/regras";
import { clientesParaSelecao, opcoes } from "@/lib/listas";
import { criarDespesa } from "./acoes";
import { CamposDespesa } from "./campos";

export const metadata: Metadata = { title: "Despesas" };

export default async function Despesas({ searchParams }: PageProps<"/despesas">) {
  const usuario = await exigirModulo("DESPESAS");
  const { mes, todos, usuario: filtroUsuario } = await searchParams;
  const veTodos = usuario.modulos.includes("FINANCEIRO");
  const hojeData = hoje();
  const periodo = intervaloDoMes(typeof mes === "string" ? mes : undefined, hojeData);
  const atual = intervaloDoMes(undefined, hojeData).chave;

  // Sem o Financeiro, só as próprias. Com ele: as próprias, as de um usuário ou de todos.
  const alvo = !veTodos ? usuario.id : typeof filtroUsuario === "string" && filtroUsuario ? filtroUsuario : todos === "1" ? null : usuario.id;
  const where = { data: { gte: periodo.inicio, lt: periodo.fim }, ...(alvo ? { usuarioId: alvo } : {}) };

  const [despesas, categorias, clientes, usuarios] = await Promise.all([
    db.despesa.findMany({
      where,
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      include: {
        categoria: { select: { nome: true } },
        cliente: { select: { id: true, nomeFantasia: true } },
        usuario: { select: { nome: true } },
        _count: { select: { arquivos: true } },
      },
    }),
    db.categoriaDespesa.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    clientesParaSelecao(),
    veTodos ? db.usuario.findMany({ where: { despesas: { some: {} } }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }) : Promise.resolve([]),
  ]);

  const total = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const porCategoria = new Map<string, number>();
  for (const d of despesas) porCategoria.set(d.categoria.nome, (porCategoria.get(d.categoria.nome) ?? 0) + Number(d.valor));
  const comCliente = despesas.filter((d) => d.clienteId).reduce((s, d) => s + Number(d.valor), 0);
  const params = { todos: alvo === null ? "1" : undefined, usuario: alvo && alvo !== usuario.id ? alvo : undefined };
  const filtro = (q: Record<string, string>) => {
    const s = new URLSearchParams({ ...(periodo.chave !== atual ? { mes: periodo.chave } : {}), ...q });
    return `/despesas${s.size ? `?${s}` : ""}`;
  };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Financeiro"
        titulo={alvo === usuario.id ? "Minhas despesas" : "Despesas da equipe"}
        descricao="Lance aqui os gastos do trabalho, com o comprovante. Despesas ligadas a um cliente entram na margem dele."
      />

      <div className="flex flex-wrap items-center gap-2">
        <NavegadorMes caminho="/despesas" mes={periodo.chave} atual={atual} params={params} />
        {veTodos && (
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            <Link
              href={filtro({})}
              className={`min-h-11 content-center rounded-xl border-[1.5px] px-3 text-sm font-semibold ${alvo === usuario.id ? "border-tinta bg-tinta text-menta" : "border-linha bg-superficie text-texto-2 hover:border-verde"}`}
            >
              Minhas
            </Link>
            <Link
              href={filtro({ todos: "1" })}
              className={`min-h-11 content-center rounded-xl border-[1.5px] px-3 text-sm font-semibold ${alvo === null ? "border-tinta bg-tinta text-menta" : "border-linha bg-superficie text-texto-2 hover:border-verde"}`}
            >
              Toda a equipe
            </Link>
            {usuarios
              .filter((u) => u.id !== usuario.id)
              .map((u) => (
                <Link
                  key={u.id}
                  href={filtro({ usuario: u.id })}
                  className={`min-h-11 content-center rounded-xl border-[1.5px] px-3 text-sm font-semibold ${alvo === u.id ? "border-tinta bg-tinta text-menta" : "border-linha bg-superficie text-texto-2 hover:border-verde"}`}
                >
                  {u.nome.split(" ")[0]}
                </Link>
              ))}
          </div>
        )}
      </div>

      <GradeKpis
        min={230}
        itens={[
          { rotulo: "Total no mês", valor: fmtMoeda(total), nota: `${despesas.length} lançamento(s)`, escuro: true },
          { rotulo: "Ligadas a clientes", valor: fmtMoeda(comCliente), nota: "Entram na margem por cliente" },
          { rotulo: "Sem comprovante", valor: despesas.filter((d) => d._count.arquivos === 0).length, nota: "Anexe o comprovante na despesa", alerta: despesas.some((d) => d._count.arquivos === 0), selo: "PENDENTE" },
        ]}
      />

      <div className="flex flex-wrap items-start gap-5">
        <Cartao titulo="Nova despesa" className="flex-[1_1_360px]">
          {categorias.length === 0 ? (
            <EstadoVazio>Cadastre as categorias de despesa em Cadastros.</EstadoVazio>
          ) : (
            <Formulario acao={criarDespesa} botao="Lançar despesa" limparAoSalvar>
              <CamposDespesa
                categorias={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
                clientes={opcoes(clientes, (c) => c.nomeFantasia)}
                hoje={hojeData}
              />
              <Campo rotulo="Comprovante (foto ou PDF)" nome="comprovante" type="file" multiple accept="image/*,application/pdf" className="[&_input]:py-2" />
            </Formulario>
          )}
        </Cartao>
        <Cartao titulo="Por categoria" className="flex-[1_1_300px]">
          <BarrasHorizontais
            itens={[...porCategoria].sort((a, b) => b[1] - a[1]).map(([rotulo, valor]) => ({ chave: rotulo, rotulo, valor }))}
            formato={(v) => fmtMoeda(v)}
            cor="bg-ambar"
            vazio="Nenhuma despesa neste mês."
          />
        </Cartao>
      </div>

      <Cartao titulo="Lançamentos do mês">
        {despesas.length === 0 ? (
          <EstadoVazio>Nenhuma despesa neste mês.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Descrição", "Data", "Categoria", "Cliente", ...(alvo === usuario.id ? [] : ["Quem lançou"]), "Valor", "Comprovante"]}>
            {despesas.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/despesas/${d.id}`} className="font-semibold hover:text-verde">
                    {d.descricao || d.categoria.nome}
                  </Link>
                </td>
                <td>{fmtData(d.data)}</td>
                <td>{d.categoria.nome}</td>
                <td>{d.cliente?.nomeFantasia ?? "—"}</td>
                {alvo !== usuario.id && <td>{d.usuario.nome}</td>}
                <td className="font-mono">{fmtMoeda(d.valor)}</td>
                <td>{d._count.arquivos > 0 ? <Selo cor="verde">{d._count.arquivos} anexo(s)</Selo> : <Selo cor="ambar">Falta</Selo>}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
