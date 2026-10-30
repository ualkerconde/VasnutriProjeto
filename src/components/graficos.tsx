import Link from "next/link";
import type { ReactNode } from "react";

// Peças de painel: números grandes e barras simples, no visual do painel principal.

export type Kpi = { rotulo: string; valor: ReactNode; nota?: ReactNode; selo?: string; escuro?: boolean; alerta?: boolean; href?: string };

export function GradeKpis({ itens, min = 220 }: { itens: Kpi[]; min?: number }) {
  return (
    <section aria-label="Indicadores" className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}>
      {itens.map((k, i) => {
        const classe = `animate-subir flex min-w-0 flex-col gap-3 rounded-[22px] p-5 ${
          k.escuro ? "bg-tinta text-claro" : "border border-[#E1E9E4] bg-superficie"
        } ${k.href ? "transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgb(11_22_18/0.25)]" : ""}`;
        const conteudo = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-semibold ${k.escuro ? "text-claro-2" : "text-texto-2"}`}>{k.rotulo}</span>
              {k.selo && (
                <span
                  className={`rounded-lg px-2 py-1 font-mono text-[11px] tracking-[0.06em] whitespace-nowrap ${
                    k.alerta ? "bg-[#FDF0D5] text-ambar-texto" : k.escuro ? "bg-menta/15 text-menta" : "bg-[#E6EEE9] text-[#0B5F3B]"
                  }`}
                >
                  {k.selo}
                </span>
              )}
            </div>
            <span className="font-display text-[clamp(22px,2vw,30px)] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap">{k.valor}</span>
            {k.nota && <span className={`text-[13px] ${k.escuro ? "text-claro-2" : "text-suave"}`}>{k.nota}</span>}
          </>
        );
        return k.href ? (
          <Link key={k.rotulo} href={k.href} style={{ animationDelay: `${i * 50}ms` }} className={classe}>
            {conteudo}
          </Link>
        ) : (
          <div key={k.rotulo} style={{ animationDelay: `${i * 50}ms` }} className={classe}>
            {conteudo}
          </div>
        );
      })}
    </section>
  );
}

/** Barras horizontais com rótulo e valor; a maior ocupa a largura toda. */
export function BarrasHorizontais({
  itens,
  formato = (v) => String(v),
  cor = "bg-menta",
  vazio = "Nada no período.",
}: {
  itens: { rotulo: ReactNode; valor: number; chave: string; detalhe?: ReactNode }[];
  formato?: (v: number) => string;
  cor?: string;
  vazio?: string;
}) {
  if (itens.length === 0) return <p className="text-sm text-suave">{vazio}</p>;
  const maior = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <ol className="flex flex-col gap-2.5">
      {itens.map((item, i) => (
        <li key={item.chave} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="font-mono text-xs text-suave">{String(i + 1).padStart(2, "0")}</span>
              <span className="truncate font-medium">{item.rotulo}</span>
            </span>
            <span className="flex-none font-mono text-[13px] font-semibold">{formato(item.valor)}</span>
          </div>
          <span className="h-2 overflow-hidden rounded-full bg-linha-suave">
            <span
              className={`animate-crescer block h-full origin-left rounded-full ${cor}`}
              style={{ width: `${Math.max(3, Math.round((item.valor / maior) * 100))}%`, animationDelay: `${i * 40}ms` }}
            />
          </span>
          {item.detalhe && <span className="text-xs text-suave">{item.detalhe}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Colunas lado a lado por mês (ex.: recebido x despesas). */
export function ColunasMensais({
  meses,
  series,
  formato,
}: {
  meses: { chave: string; rotulo: string; valores: number[] }[];
  series: { nome: string; cor: string }[];
  formato: (v: number) => string;
}) {
  const maior = Math.max(1, ...meses.flatMap((m) => m.valores));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-texto-2">
        {series.map((s) => (
          <span key={s.nome} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${s.cor}`} />
            {s.nome}
          </span>
        ))}
      </div>
      <div className="grid h-44 items-end gap-2" style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0, 1fr))` }}>
        {meses.map((m) => (
          <div key={m.chave} className="flex h-full min-w-0 flex-col justify-end gap-1.5">
            <div className="flex h-full items-end justify-center gap-1">
              {m.valores.map((v, i) => (
                <span
                  key={series[i].nome}
                  title={`${series[i].nome}: ${formato(v)}`}
                  className={`w-full max-w-5 rounded-t-md ${series[i].cor}`}
                  style={{ height: `${v > 0 ? Math.max(3, Math.round((v / maior) * 100)) : 0}%` }}
                />
              ))}
            </div>
            <span className="truncate text-center font-mono text-[11px] text-suave uppercase">{m.rotulo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
