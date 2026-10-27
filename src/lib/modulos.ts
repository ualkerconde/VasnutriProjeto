import type { Modulo } from "@/generated/prisma/enums";

export type ItemMenu = {
  modulo: Modulo;
  rotulo: string;
  href: string;
  /// Entrega do plano em que a tela fica pronta.
  entrega: number;
};

/** Menu principal, na ordem em que aparece. Cada item só aparece para quem tem o módulo no perfil. */
export const MENU: ItemMenu[] = [
  { modulo: "PAINEL", rotulo: "Painel", href: "/", entrega: 1 },
  { modulo: "FUNIL", rotulo: "Funil", href: "/funil", entrega: 3 },
  { modulo: "CLIENTES", rotulo: "Clientes", href: "/clientes", entrega: 1 },
  { modulo: "VISITAS", rotulo: "Visitas", href: "/visitas", entrega: 4 },
  { modulo: "SOLICITACOES", rotulo: "Solicitações", href: "/solicitacoes", entrega: 4 },
  { modulo: "MAPA_COMERCIALIZACAO", rotulo: "Mapa de comercialização", href: "/mapa", entrega: 4 },
  { modulo: "CADASTROS", rotulo: "Cadastros", href: "/cadastros", entrega: 1 },
  { modulo: "USUARIOS", rotulo: "Usuários", href: "/usuarios", entrega: 1 },
];

export function menuPermitido(modulos: readonly Modulo[]): ItemMenu[] {
  const permitidos = new Set(modulos);
  return MENU.filter((item) => permitidos.has(item.modulo));
}

export function itemPorHref(href: string): ItemMenu | undefined {
  return MENU.find((item) => item.href === href);
}

/** Junta os módulos de todos os perfis do usuário, sem repetir. */
export function modulosDosPerfis(perfis: { permissoes: { modulo: Modulo }[] }[]): Modulo[] {
  const modulos = new Set<Modulo>();
  for (const perfil of perfis) for (const p of perfil.permissoes) modulos.add(p.modulo);
  return MENU.map((item) => item.modulo).filter((m) => modulos.has(m));
}
