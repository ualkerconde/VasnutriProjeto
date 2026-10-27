// Dados iniciais: etapas do funil, checklist, perfis, listas de apoio e o primeiro administrador.
// Pode rodar mais de uma vez: só cria o que ainda não existe.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Modulo } from "../src/generated/prisma/enums";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Aba "fluxo" do AppSheet. O valor do contrato só aparece até a etapa 4.
const ETAPAS = [
  "Elaboração do escopo",
  "Comercial",
  "Fechamento do contrato",
  "Assinatura",
  "Cadastro da empresa no Food Checker",
  "Pasta burocrática",
  "Agendamento de diagnóstico",
  "Coleta de dados",
  "Elaboração da documentação contratada",
  "Agendamento de treinamento",
  "Visitas técnicas",
  "Orçamentos recusados",
];

// Antigas colunas Sim/Não da aba baseprincipal, agora itens de checklist por etapa.
const CHECKLIST: Record<number, string[]> = {
  4: ["Assinatura realizada"],
  5: ["Cadastro no Food Checker"],
  6: ["Pasta burocrática ok", "Ata ok", "Pasta de visita ok", "Pasta de arquivo ok", "Pasta do armário ok"],
  7: ["Agendamento de diagnóstico"],
  9: ["Reunião de apresentação do diagnóstico", "Documentação concluída"],
  10: ["Treinamento realizado"],
};

const TODOS: Modulo[] = [
  "PAINEL",
  "FUNIL",
  "CLIENTES",
  "VISITAS",
  "SOLICITACOES",
  "MAPA_COMERCIALIZACAO",
  "CADASTROS",
  "USUARIOS",
];

const PERFIS: { nome: string; descricao: string; modulos: Modulo[] }[] = [
  { nome: "Administrador", descricao: "Acesso total, inclusive usuários e cadastros.", modulos: TODOS },
  {
    nome: "Comercial",
    descricao: "Orçamentos, contratos, clientes e solicitações.",
    modulos: ["PAINEL", "FUNIL", "CLIENTES", "SOLICITACOES", "MAPA_COMERCIALIZACAO"],
  },
  {
    nome: "Técnico",
    descricao: "Coleta de dados, visitas técnicas e solicitações.",
    modulos: ["PAINEL", "FUNIL", "CLIENTES", "VISITAS", "SOLICITACOES"],
  },
];

const SERVICOS = [
  "Assessoria em controle de qualidade",
  "Auditorias em boas práticas",
  "Treinamento de colaboradores",
  "Responsabilidade técnica",
];

const TIPOS_DOCUMENTACAO = ["MBPF e POP's", "PAC"];

async function main() {
  for (const [i, nome] of ETAPAS.entries()) {
    const id = i + 1;
    await db.etapa.upsert({
      where: { id },
      update: {},
      create: { id, ordem: id, nome, final: id === 12, exibeValorContrato: id <= 4 },
    });
  }

  for (const [etapa, itens] of Object.entries(CHECKLIST)) {
    for (const [ordem, descricao] of itens.entries()) {
      const etapaId = Number(etapa);
      await db.checklistItem.upsert({
        where: { etapaId_descricao: { etapaId, descricao } },
        update: {},
        create: { etapaId, descricao, ordem },
      });
    }
  }

  for (const perfil of PERFIS) {
    const criado = await db.perfil.upsert({
      where: { nome: perfil.nome },
      update: {},
      create: { nome: perfil.nome, descricao: perfil.descricao },
    });
    await db.perfilPermissao.createMany({
      data: perfil.modulos.map((modulo) => ({ perfilId: criado.id, modulo })),
      skipDuplicates: true,
    });
  }

  await db.servico.createMany({ data: SERVICOS.map((nome) => ({ nome })), skipDuplicates: true });
  await db.tipoDocumentacao.createMany({ data: TIPOS_DOCUMENTACAO.map((nome) => ({ nome })), skipDuplicates: true });

  await db.configuracao.upsert({
    where: { chave: "um_processo_ativo_por_cliente" },
    update: {},
    create: {
      chave: "um_processo_ativo_por_cliente",
      valor: true,
      descricao: "Impede abrir um segundo processo para um cliente que já tem um em andamento.",
    },
  });

  await criarAdministrador();
}

async function criarAdministrador() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA;
  if (!email || !senha) {
    console.log("ADMIN_EMAIL e ADMIN_SENHA não definidos: nenhum administrador criado.");
    return;
  }
  if (await db.usuario.findUnique({ where: { email } })) {
    console.log(`Administrador ${email} já existe.`);
    return;
  }
  if (senha.length < 10) throw new Error("ADMIN_SENHA precisa ter pelo menos 10 caracteres.");

  const admin = await db.perfil.findUniqueOrThrow({ where: { nome: "Administrador" } });
  await db.usuario.create({
    data: {
      nome: process.env.ADMIN_NOME?.trim() || "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, 12),
      perfis: { create: { perfilId: admin.id } },
    },
  });
  console.log(`Administrador ${email} criado.`);
}

main()
  .then(() => console.log("Seed concluído."))
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
