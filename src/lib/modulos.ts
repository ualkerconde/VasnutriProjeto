import type { Modulo } from "@/generated/prisma/enums";

export type ItemMenu = {
  modulo: Modulo;
  rotulo: string;
  href: string;
};

/** Menu principal, na ordem em que aparece. Cada item só aparece para quem tem o módulo no perfil. */
export const MENU: ItemMenu[] = [
  { modulo: "PAINEL", rotulo: "Painel", href: "/" },
  { modulo: "FUNIL", rotulo: "Funil", href: "/funil" },
  { modulo: "CLIENTES", rotulo: "Clientes", href: "/clientes" },
  { modulo: "VISITAS", rotulo: "Visitas", href: "/visitas" },
  { modulo: "SOLICITACOES", rotulo: "Solicitações", href: "/solicitacoes" },
  { modulo: "MAPA_COMERCIALIZACAO", rotulo: "Mapa de comercialização", href: "/mapa" },
  { modulo: "CADASTROS", rotulo: "Cadastros", href: "/cadastros" },
  { modulo: "USUARIOS", rotulo: "Usuários", href: "/usuarios" },
];

export function menuPermitido(modulos: readonly Modulo[]): ItemMenu[] {
  const permitidos = new Set(modulos);
  return MENU.filter((item) => permitidos.has(item.modulo));
}

/** Junta os módulos de todos os perfis do usuário, sem repetir. */
export function modulosDosPerfis(perfis: { permissoes: { modulo: Modulo }[] }[]): Modulo[] {
  const modulos = new Set<Modulo>();
  for (const perfil of perfis) for (const p of perfil.permissoes) modulos.add(p.modulo);
  return MENU.map((item) => item.modulo).filter((m) => modulos.has(m));
}
