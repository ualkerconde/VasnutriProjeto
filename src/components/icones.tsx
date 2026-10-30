import type { ReactNode } from "react";

// Ícones de traço do menu (24×24), um por tela.
const ICONES: Record<string, ReactNode> = {
  "/": <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z" />,
  "/funil": <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  "/planejamento": <path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z" />,
  "/clientes": <path d="M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M16 4.1a3 3 0 010 5.8" />,
  "/visitas": <path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM9 15l2 2 4-4" />,
  "/solicitacoes": <path d="M9 4h6v3H9zM7 5H5v15h14V5h-2M8 12h8M8 16h5" />,
  "/financeiro": <path d="M3 7h18v12H3zM3 11h18M7 15h3M12 3v4" />,
  "/despesas": <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" />,
  "/indicadores": <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  "/mapa": <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  "/cadastros": <path d="M4 6h16M4 12h16M4 18h10" />,
  "/usuarios": <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 0112 0v1M19 8v6M16 11h6" />,
  "/notificacoes": <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0" />,
};

export function IconeMenu({ href, tamanho = 20 }: { href: string; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      {ICONES[href] ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}
