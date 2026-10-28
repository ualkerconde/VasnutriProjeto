"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Marca } from "@/components/marca";
import { MenuLateral } from "./menu-lateral";

type Item = { href: string; rotulo: string; contador?: number };

const ICONES: Record<string, ReactNode> = {
  "/": <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z" />,
  "/funil": <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  "/clientes": <path d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8" />,
  "/visitas": <path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM9 15l2 2 4-4" />,
  "/planejamento": <path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z" />,
  "/solicitacoes": <path d="M9 4h6v3H9zM7 5H5v15h14V5h-2M8 12h8M8 16h5" />,
  "/mapa": <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  "/cadastros": <path d="M4 6h16M4 12h16M4 18h10" />,
  "/usuarios": <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 0112 0v1M19 8v6M16 11h6" />,
};

function Icone({ href }: { href: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[href] ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}

/**
 * Navegação no celular: barra no topo (marca, avisos, menu) e barra de abas embaixo, ao alcance do polegar.
 * O menu completo abre numa gaveta. No computador fica escondida e vale o menu lateral.
 */
export function NavegacaoCelular({ itens, naoLidas, rodape }: { itens: Item[]; naoLidas: number; rodape: ReactNode }) {
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
          <Marca tamanho={28} className="text-claro" />
        </Link>
        <Link
          href="/notificacoes"
          aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações"}
          className="relative flex size-11 items-center justify-center rounded-xl text-claro-2 hover:bg-claro/10 hover:text-claro"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0" />
          </svg>
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
                <Icone href={item.href} />
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
