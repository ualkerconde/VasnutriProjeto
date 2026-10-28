import Link from "next/link";
import { Marca } from "@/components/marca";
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

  return (
    <div className="flex min-h-screen flex-col bg-fundo lg:flex-row">
      <nav
        aria-label="Menu principal"
        className="hidden min-w-0 flex-col bg-tinta px-4 text-claro-2 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[264px] lg:flex-none lg:gap-7 lg:py-6"
      >
        <Marca tamanho={30} className="px-2 text-claro" />
        <MenuLateral itens={itens} />
        <div className="mt-auto">{cartaoUsuario}</div>
      </nav>

      <NavegacaoCelular itens={itens} naoLidas={naoLidas} rodape={cartaoUsuario} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-28 sm:px-[clamp(16px,3vw,40px)] lg:gap-7 lg:pt-6 lg:pb-12">
        {children}
      </main>
    </div>
  );
}
