import Link from "next/link";
import { MarcaEmpresa } from "@/components/marca-empresa";
import { gerarAlertasSeNecessario } from "@/lib/alertas";
import { sair } from "@/lib/auth/acoes";
import { exigirUsuario } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { menuPermitido } from "@/lib/modulos";
import { MenuLateral } from "./menu-lateral";
import { NavegacaoCelular } from "./navegacao-celular";

export default async function LayoutApp({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  try {
    await gerarAlertasSeNecessario();
  } catch (erro) {
    // Um problema nos avisos automáticos nunca pode impedir o uso do sistema.
    console.error("Falha ao gerar alertas", erro);
  }
  const naoLidas = await db.notificacao.count({ where: { usuarioId: usuario.id, lidaEm: null } });
  const itens = [
    ...menuPermitido(usuario.modulos).map(({ href, rotulo }) => ({ href, rotulo })),
    { href: "/notificacoes", rotulo: "Notificações", contador: naoLidas },
  ];

  const cartaoUsuario = (
    <div className="flex items-center gap-3 rounded-[14px] bg-claro/5 p-2 lg:p-3">
      <Link href="/conta" title="Minha conta" className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] hover:text-claro">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-menta text-sm font-bold text-tinta">
          {usuario.nome.slice(0, 1).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-[13px] leading-snug">
          <span className="truncate font-semibold text-claro">{usuario.nome}</span>
          <span className="truncate">{usuario.perfis.join(", ") || "Sem perfil"}</span>
        </span>
      </Link>
      <form action={sair}>
        <button
          type="submit"
          aria-label="Sair"
          title="Sair"
          className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] text-claro-2 hover:bg-claro/10 hover:text-claro"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4" />
          </svg>
        </button>
      </form>
    </div>
  );

  // Menu lateral com a altura da tela: a lista rola sozinha e o cartão do usuário (com o Sair) fica sempre visível.
  return (
    <div className="flex min-h-dvh flex-col bg-fundo lg:flex-row">
      <nav
        aria-label="Menu principal"
        className="hidden min-w-0 flex-col bg-tinta text-claro-2 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[248px] lg:flex-none xl:w-[264px]"
      >
        <div className="flex-none px-6 pt-5 pb-4">
          <MarcaEmpresa tamanho={30} className="text-claro" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 [scrollbar-color:rgb(232_241_236/0.2)_transparent] [scrollbar-width:thin]">
          <MenuLateral itens={itens} />
        </div>
        <div className="flex-none border-t border-claro/10 px-4 py-3">{cartaoUsuario}</div>
      </nav>

      <NavegacaoCelular itens={itens} naoLidas={naoLidas} rodape={cartaoUsuario} marca={<MarcaEmpresa tamanho={28} altura={32} className="text-claro" />} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-28 sm:px-[clamp(16px,3vw,40px)] lg:gap-7 lg:pt-6 lg:pb-12">
        {children}
      </main>
    </div>
  );
}
