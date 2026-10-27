import { notFound, redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth/sessao";
import { itemPorHref } from "@/lib/modulos";

// Telas das próximas entregas. Cada uma ganha sua própria rota quando ficar pronta.
export default async function ModuloEmBreve({ params }: PageProps<"/[modulo]">) {
  const { modulo } = await params;
  const item = itemPorHref(`/${modulo}`);
  if (!item || item.entrega === 1) notFound();

  const usuario = await exigirUsuario();
  if (!usuario.modulos.includes(item.modulo)) redirect("/?sem-acesso=1");

  return (
    <section className="animate-subir flex max-w-xl flex-col gap-3 rounded-[22px] border border-linha bg-superficie p-8">
      <p className="font-mono text-xs tracking-[0.1em] text-verde">ENTREGA {item.entrega}</p>
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.035em]">{item.rotulo}</h1>
      <p className="text-suave">Esta tela chega na entrega {item.entrega} do plano.</p>
    </section>
  );
}
