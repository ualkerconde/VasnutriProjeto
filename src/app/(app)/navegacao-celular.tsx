"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconeMenu } from "@/components/icones";
import { MenuLateral } from "./menu-lateral";

type Item = { href: string; rotulo: string; contador?: number };

/**
 * Navegação no celular: barra no topo (marca, avisos, menu) e barra de abas embaixo, ao alcance do polegar.
 * O menu completo abre numa gaveta. No computador fica escondida e vale o menu lateral.
 */
export function NavegacaoCelular({ itens, naoLidas, rodape, marca }: { itens: Item[]; naoLidas: number; rodape: ReactNode; marca: ReactNode }) {
  const rota = usePathname();
  const [aberto, setAberto] = useState(false);
  const [rotaAberta, setRotaAberta] = useState(rota);
  // Fecha a gaveta quando a página muda.
  if (rota !== rotaAberta) {
    setRotaAberta(rota);
    setAberto(false);
  }

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", fechar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fechar);
      document.body.style.overflow = "";
    };
  }, [aberto]);

  const principais = itens.filter((i) => i.href !== "/notificacoes").slice(0, 4);
  const ativo = (href: string) => (href === "/" ? rota === "/" : rota.startsWith(href));
  const ativoForaDasAbas = !principais.some((i) => ativo(i.href));

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-tinta px-4 py-2.5 lg:hidden">
        <Link href="/" aria-label="Painel">
          {marca}
        </Link>
        <Link
          href="/notificacoes"
          aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações"}
          className="relative flex size-11 items-center justify-center rounded-xl text-claro-2 hover:bg-claro/10 hover:text-claro"
        >
          <IconeMenu href="/notificacoes" tamanho={22} />
          {naoLidas > 0 && (
            <span className="absolute top-1 right-0.5 min-w-5 rounded-full bg-ambar px-1 text-center font-mono text-[11px] leading-5 font-bold text-tinta">
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
        </Link>
      </header>

      <nav
        aria-label="Atalhos"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-claro/10 bg-tinta pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex">
          {principais.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo(item.href) ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${ativo(item.href) ? "text-menta" : "text-claro-2"}`}
              >
                <IconeMenu href={item.href} tamanho={22} />
                <span className="max-w-full truncate px-1">{item.rotulo}</span>
              </Link>
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setAberto(true)}
              aria-expanded={aberto}
              className={`flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-semibold ${ativoForaDasAbas ? "text-menta" : "text-claro-2"}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              Menu
            </button>
          </li>
        </ul>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 cursor-default bg-tinta/60" onClick={() => setAberto(false)} />
          <div className="animate-subir absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-tinta px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] text-claro-2">
            <div className="flex items-center justify-between">
              <span className="pl-2 text-sm font-semibold text-claro">Menu</span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex size-11 cursor-pointer items-center justify-center rounded-xl hover:bg-claro/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <MenuLateral itens={itens} />
            {rodape}
          </div>
        </div>
      )}
    </>
  );
}
