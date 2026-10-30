"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeMenu } from "@/components/icones";

type Item = { href: string; rotulo: string; contador?: number };

export function MenuLateral({ itens }: { itens: Item[] }) {
  const rota = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {itens.map((item) => {
        const ativo = item.href === "/" ? rota === "/" : rota.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={
                ativo
                  ? "flex min-h-11 items-center gap-3 rounded-xl whitespace-nowrap bg-menta px-3 text-[15px] font-semibold text-tinta lg:min-h-10"
                  : "flex min-h-11 items-center gap-3 rounded-xl whitespace-nowrap px-3 text-[15px] font-medium text-claro-2 transition-colors hover:bg-claro/10 hover:text-claro lg:min-h-10"
              }
            >
              <IconeMenu href={item.href} />
              <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
              {item.contador ? (
                <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${ativo ? "bg-tinta text-menta" : "bg-ambar text-tinta"}`}>
                  {item.contador}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
