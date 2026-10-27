import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, classeCampo, LinkBotao, Selo } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { diasEntre } from "@/lib/datas";
import { db } from "@/lib/db";
import { ETAPA, ROTULO_STATUS } from "@/lib/funil/regras";

export const metadata: Metadata = { title: "Funil" };

export default async function Funil({ searchParams }: PageProps<"/funil">) {
  const usuario = await exigirModulo("FUNIL");
  const { q, meus, recusados } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const soMeus = meus === "1";
  const verRecusados = recusados === "1";

  const [etapas, processos] = await Promise.all([
    db.etapa.findMany({ orderBy: { ordem: "asc" } }),
    db.processo.findMany({
      where: {
        ...(busca
          ? {
              OR: [
                { cliente: { nomeFantasia: { contains: busca, mode: "insensitive" } } },
                ...(Number.isInteger(Number(busca)) ? [{ numeroOrcamento: Number(busca) }] : []),
              ],
            }
          : {}),
        ...(soMeus ? { responsavelId: usuario.id } : {}),
        ...(verRecusados ? {} : { etapaAtualId: { not: ETAPA.RECUSADOS } }),
      },
      orderBy: { atualizadoEm: "desc" },
      include: {
        cliente: { select: { nomeFantasia: true } },
        responsavel: { select: { nome: true } },
        historico: { where: { fim: null }, select: { inicio: true }, take: 1 },
      },
    }),
  ]);

  const agora = new Date();
  const colunas = etapas
    .filter((e) => verRecusados || e.id !== ETAPA.RECUSADOS)
    .map((etapa) => ({ etapa, cards: processos.filter((p) => p.etapaAtualId === etapa.id) }));

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Funil"
        titulo="Processos por etapa"
        descricao={`${processos.length} processo(s) ${verRecusados ? "" : "em andamento"}`}
        acoes={<LinkBotao href="/funil/novo">Novo processo</LinkBotao>}
      />

      <form className="flex flex-wrap gap-3" role="search">
        <label className="min-w-0 flex-[1_1_260px]">
          <span className="sr-only">Buscar</span>
          <input name="q" type="search" defaultValue={busca} placeholder="Cliente ou nº do orçamento" className={`${classeCampo} h-11`} />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-texto-2">
          <input type="checkbox" name="meus" value="1" defaultChecked={soMeus} className="size-[18px] accent-verde" />
          Só os meus
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-texto-2">
          <input type="checkbox" name="recusados" value="1" defaultChecked={verRecusados} className="size-[18px] accent-verde" />
          Mostrar recusados
        </label>
        <button type="submit" className="min-h-11 cursor-pointer rounded-xl border-[1.5px] border-linha bg-superficie px-4 text-sm font-semibold hover:border-verde">
          Filtrar
        </button>
      </form>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-[clamp(16px,3vw,40px)] sm:px-[clamp(16px,3vw,40px)]">
        <ol className="flex gap-3">
          {colunas.map(({ etapa, cards }) => (
            <li key={etapa.id} className="flex w-[272px] flex-none flex-col gap-2 rounded-[18px] bg-linha-suave p-2.5">
              <div className="flex items-center justify-between gap-2 px-1.5 pt-1">
                <h2 className="text-[13px] leading-tight font-bold">
                  <span className="font-mono text-[11px] text-suave">{String(etapa.id).padStart(2, "0")}</span> {etapa.nome}
                </h2>
                <span className="rounded-full bg-superficie px-2 py-0.5 font-mono text-xs">{cards.length}</span>
              </div>
              {cards.length === 0 && <p className="px-1.5 py-3 text-xs text-suave">Nenhum processo</p>}
              {cards.map((p) => {
                const dias = p.historico[0] ? diasEntre(p.historico[0].inicio, agora) : null;
                return (
                  <Link
                    key={p.id}
                    href={`/funil/${p.id}`}
                    className="flex flex-col gap-2 rounded-[14px] bg-superficie p-3 shadow-[0_1px_0_rgb(11_22_18/0.06)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgb(11_22_18/0.3)]"
                  >
                    <span className="text-sm leading-snug font-semibold">{p.cliente.nomeFantasia}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-suave">
                      <span className="font-mono">Nº {p.numeroOrcamento}</span>
                      {p.responsavel && <span>· {p.responsavel.nome.split(" ")[0]}</span>}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {etapa.id <= ETAPA.FECHAMENTO && (
                        <Selo cor={p.statusOrcamento === "APROVADO" ? "verde" : p.statusOrcamento === "AGUARDANDO_APROVACAO" ? "ambar" : "cinza"}>
                          {ROTULO_STATUS[p.statusOrcamento]}
                        </Selo>
                      )}
                      {dias !== null && <Selo cor={dias > 15 && etapa.id !== ETAPA.VISITAS ? "ambar" : "cinza"}>{dias === 0 ? "hoje" : `${dias} d na etapa`}</Selo>}
                    </span>
                  </Link>
                );
              })}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
