// Usuários de teste, um por perfil, para experimentar o sistema no computador.
// Não rode em produção: as senhas estão no README.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env (veja o README).");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Usuários de teste não podem ser criados em produção.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const USUARIOS = [
  { nome: "Teste Administrador", email: "teste.admin@vasnutri.local", senha: "teste-admin-123", perfil: "Administrador" },
  { nome: "Teste Comercial", email: "teste.comercial@vasnutri.local", senha: "teste-comercial-123", perfil: "Comercial" },
  { nome: "Teste Técnico", email: "teste.tecnico@vasnutri.local", senha: "teste-tecnico-123", perfil: "Técnico" },
];

async function main() {
  for (const u of USUARIOS) {
    const perfil = await db.perfil.findUnique({ where: { nome: u.perfil } });
    if (!perfil) throw new Error(`Perfil ${u.perfil} não existe. Rode antes: npm run db:seed`);
    const senhaHash = await bcrypt.hash(u.senha, 12);
    // Se já existe, volta para a senha de teste e reativa.
    const usuario = await db.usuario.upsert({
      where: { email: u.email },
      update: { senhaHash, ativo: true },
      create: { nome: u.nome, email: u.email, senhaHash },
    });
    await db.usuarioPerfil.upsert({
      where: { usuarioId_perfilId: { usuarioId: usuario.id, perfilId: perfil.id } },
      update: {},
      create: { usuarioId: usuario.id, perfilId: perfil.id },
    });
    console.log(`${u.perfil.padEnd(14)} ${u.email}  senha: ${u.senha}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
