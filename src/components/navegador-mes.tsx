import Link from "next/link";
import { deslocarMes } from "@/lib/financeiro/regras";

const fmtMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });

/** ‹ outubro de 2026 › — muda o parâmetro `mes` da URL mantendo os outros. */
export function NavegadorMes({ caminho, mes, atual, params = {} }: { caminho: string; mes: string; atual: string; params?: Record<string, string | undefined> }) {
  const link = (m: string) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    if (m !== atual) q.set("mes", m);
    return `${caminho}${q.size ? `?${q}` : ""}`;
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border-[1.5px] border-linha bg-superficie p-1">
        <Link href={link(deslocarMes(mes, -1))} aria-label="Mês anterior" className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-fundo">
          ‹
        </Link>
        <span className="min-w-[150px] px-1 text-center text-sm font-semibold first-letter:uppercase">{fmtMes.format(new Date(`${mes}-01T00:00:00Z`))}</span>
        <Link href={link(deslocarMes(mes, 1))} aria-label="Próximo mês" className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-fundo">
          ›
        </Link>
      </div>
      {mes !== atual && (
        <Link href={link(atual)} className="min-h-11 content-center rounded-xl px-3 text-sm font-semibold text-verde hover:bg-[#E6EEE9]">
          Este mês
        </Link>
      )}
    </div>
  );
}
