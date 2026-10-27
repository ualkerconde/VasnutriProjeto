"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; rotulo: string; entrega: number };

export function MenuLateral({ itens }: { itens: Item[] }) {
  const rota = usePathname();

  return (
    <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {itens.map((item) => {
        const ativo = item.href === "/" ? rota === "/" : rota.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={
                ativo
                  ? "flex min-h-11 items-center gap-3 rounded-xl whitespace-nowrap bg-menta px-3 text-[15px] font-semibold text-tinta"
                  : "flex min-h-11 items-center gap-3 rounded-xl whitespace-nowrap px-3 text-[15px] font-medium text-claro-2 transition-colors hover:bg-claro/10 hover:text-claro"
              }
            >
              <span className={ativo ? "size-1.5 rounded-full bg-tinta" : "size-1.5 rounded-full bg-claro-2/50"} />
              <span className="flex-1">{item.rotulo}</span>
              {item.entrega > 1 && (
                <span className={`hidden font-mono text-[10px] whitespace-nowrap lg:inline ${ativo ? "text-tinta/70" : "text-claro-3"}`}>
                  em breve
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
