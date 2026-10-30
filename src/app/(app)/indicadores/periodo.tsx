import Link from "next/link";
import { PERIODOS } from "@/lib/indicadores";

export function SeletorPeriodo({ caminho, atual }: { caminho: string; atual: string }) {
  return (
    <nav aria-label="Período" className="flex flex-wrap gap-1.5">
      {PERIODOS.map((p) => (
        <Link
          key={p.chave}
          href={p.chave === "90" ? caminho : `${caminho}?periodo=${p.chave}`}
          aria-current={p.chave === atual ? "true" : undefined}
          className={`min-h-11 content-center rounded-xl border-[1.5px] px-3 text-sm font-semibold ${
            p.chave === atual ? "border-tinta bg-tinta text-menta" : "border-linha bg-superficie text-texto-2 hover:border-verde"
          }`}
        >
          {p.rotulo}
        </Link>
      ))}
    </nav>
  );
}
