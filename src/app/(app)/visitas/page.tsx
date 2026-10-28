import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina, Cartao, EstadoVazio, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, fmtDataHora } from "@/lib/datas";
import { db } from "@/lib/db";
import { ROTULO_STATUS_VISITA } from "@/lib/planejamento/regras";
import { ciclosEmAndamento, situacaoCiclo } from "@/lib/visitas";

export const metadata: Metadata = { title: "Visitas" };

export default async function Visitas() {
  await exigirModulo("VISITAS");
  const [ciclos, recentes] = await Promise.all([
    ciclosEmAndamento(),
    db.visita.findMany({
      where: { inicio: { lte: new Date() } },
      orderBy: { inicio: "desc" },
      take: 20,
      include: { processo: { include: { cliente: { select: { nomeFantasia: true } } } }, tecnico: { select: { nome: true } } },
    }),
  ]);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Etapa 11"
        titulo="Visitas técnicas"
        descricao="Clientes em visitas periódicas, comparando o que foi feito com o contratado no ciclo."
      />

      <Cartao titulo="Ciclo atual de cada cliente">
        {ciclos.length === 0 ? (
          <EstadoVazio>Nenhum cliente em Visitas técnicas.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Cliente", "Visitas no ciclo", "Última visita", "Fim do ciclo", "Situação", ""]}>
            {ciclos.map((c) => {
              const s = situacaoCiclo(c);
              const pct = c.contratadas ? Math.min(100, Math.round((c.feitas / c.contratadas) * 100)) : 0;
              return (
                <tr key={c.processoId}>
                  <td>
                    <Link href={`/funil/${c.processoId}`} className="font-semibold hover:text-verde">
                      {c.cliente}
                    </Link>
                    <div className="text-xs text-suave">
                      Ciclo {c.ciclo?.numero ?? "—"}
                      {c.responsavel && ` · ${c.responsavel.nome}`}
                    </div>
                  </td>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <span className="h-2 w-28 overflow-hidden rounded-full bg-linha-suave">
                        <span className={`animate-crescer block h-full origin-left rounded-full ${c.atrasadas > 0 ? "bg-[#E0703F]" : "bg-menta"}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="font-mono text-[13px] whitespace-nowrap">
                        {c.feitas}
                        {c.contratadas ? ` de ${c.contratadas}` : ""}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-texto-2">{fmtData(c.ultima)}</td>
                  <td className="whitespace-nowrap text-texto-2">{fmtData(c.ciclo?.fimPrevisto)}</td>
                  <td>
                    <Selo cor={s.cor}>{s.rotulo}</Selo>
                  </td>
                  <td>
                    <Link href={`/funil/${c.processoId}/visita/nova`} className="text-sm font-semibold whitespace-nowrap">
                      Registrar visita
                    </Link>
                  </td>
                </tr>
              );
            })}
          </Tabela>
        )}
      </Cartao>

      <Cartao titulo="Visitas recentes">
        {recentes.length === 0 ? (
          <EstadoVazio>Nenhuma visita registrada.</EstadoVazio>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentes.map((v) => (
              <li key={v.id}>
                <Link href={`/funil/${v.processoId}/visita/${v.id}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-fundo px-3 py-2.5 text-sm hover:text-verde">
                  <span className="font-semibold">{v.processo.cliente.nomeFantasia}</span>
                  <span className="text-suave">{fmtDataHora(v.inicio)}</span>
                  {v.tecnico && <span className="text-suave">· {v.tecnico.nome}</span>}
                  {v.status !== "CONCLUIDA" && <Selo cor={v.status === "EM_ANDAMENTO" ? "ambar" : "cinza"}>{ROTULO_STATUS_VISITA[v.status]}</Selo>}
                  {v.teveInconformidade && <Selo cor="ambar">Inconformidades</Selo>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
