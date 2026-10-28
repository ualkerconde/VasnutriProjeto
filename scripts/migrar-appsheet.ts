// Migração dos dados do AppSheet para o sistema novo.
//
// Entrada: a planilha do AppSheet baixada como .xlsx (Google Planilhas > Arquivo > Fazer download > .xlsx).
// A planilha original nunca é alterada: o script só lê o arquivo baixado.
//
//   npm run migrar -- caminho/planilha.xlsx            simula e mostra o relatório, sem gravar nada
//   npm run migrar -- caminho/planilha.xlsx --aplicar  grava no banco
//
// Com --somente-clientes, traz só o cadastro das empresas (nome, razão social, CNPJ, endereço,
// e-mails e telefone) das abas Clientes e baseprincipal. Pode rodar de novo sem duplicar:
// quem já existe (mesmo CNPJ, ou mesmo nome quando não há CNPJ) é mantido.
//
// Senhas do AppSheet não são migradas: cada usuário recebe uma senha nova pelo administrador.
// Fotos e anexos: o banco guarda o caminho; os arquivos precisam ser copiados para
// armazenamento/appsheet/ (veja o README).
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { StatusOrcamento, TipoContato } from "../src/generated/prisma/enums";
import {
  acharUsuario,
  cepDe,
  cnpjDe,
  type Celula,
  chaveNome,
  dataDe,
  dataHoraDe,
  diaDe,
  emailsDe,
  horaDe,
  inteiroDe,
  listaDe,
  mimeDe,
  nomeDoEmail,
  numeroDe,
  semAcento,
  simNao,
  textoDe,
  textoLongoDe,
} from "../src/lib/migracao/conversao";

const CHAVE_MIGRACAO = "_migracao_appsheet";
const PASTA_ARQUIVOS = "appsheet";

type Linha = Record<string, Celula>;
type Tx = Prisma.TransactionClient;
type UsuarioMin = { id: string; nome: string; email: string };

class Simulacao extends Error {}

// ---------- leitura do .xlsx ----------

function valorCelula(v: ExcelJS.CellValue): Celula {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== "object") return v as Celula;
  if ("richText" in v) return v.richText.map((p) => p.text).join("");
  if ("text" in v) return String(v.text);
  if ("result" in v) return valorCelula(v.result as ExcelJS.CellValue);
  if ("error" in v) return null;
  return null;
}

function chaveColuna(t: string) {
  return semAcento(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

class Aba {
  constructor(
    readonly nome: string,
    readonly linhas: Linha[],
  ) {}

  /** Lê uma coluna pelo cabeçalho, ignorando acentos, maiúsculas e espaços sobrando. */
  static valor(linha: Linha, coluna: string): Celula {
    return linha[chaveColuna(coluna)];
  }
}

async function lerPlanilha(arquivo: string) {
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.readFile(arquivo);
  const abas = new Map<string, Aba>();
  livro.eachSheet((folha) => {
    const cabecalho: string[] = [];
    folha.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
      cabecalho[col] = chaveColuna(String(valorCelula(c.value) ?? ""));
    });
    const linhas: Linha[] = [];
    for (let r = 2; r <= folha.rowCount; r++) {
      const row = folha.getRow(r);
      const linha: Linha = {};
      let vazia = true;
      row.eachCell({ includeEmpty: false }, (c, col) => {
        const chave = cabecalho[col];
        if (!chave || chave === "senha") return; // senhas nunca são lidas
        const v = valorCelula(c.value);
        if (textoDe(v) !== null) vazia = false;
        linha[chave] = v;
      });
      if (!vazia) linhas.push(linha);
    }
    abas.set(chaveColuna(folha.name), new Aba(folha.name, linhas));
  });
  return abas;
}

// ---------- relatório ----------

class Relatorio {
  contagem = new Map<string, number>();
  avisos: string[] = [];
  conta(o: string, n = 1) {
    this.contagem.set(o, (this.contagem.get(o) ?? 0) + n);
  }
  aviso(t: string) {
    this.avisos.push(t);
  }
  texto(aplicado: boolean) {
    const linhas = [
      `Migração do AppSheet: ${aplicado ? "GRAVADA no banco" : "SIMULAÇÃO (nada foi gravado)"}`,
      `Data: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      "",
      "Registros:",
      ...[...this.contagem].map(([k, v]) => `  ${k}: ${v}`),
      "",
      `Avisos (${this.avisos.length}):`,
      ...(this.avisos.length ? this.avisos.map((a) => `  - ${a}`) : ["  nenhum"]),
    ];
    if (!aplicado) linhas.push("", "Para gravar, rode o mesmo comando com --aplicar no final.");
    return linhas.join("\n");
  }
}

// ---------- migração ----------

const STATUS: Record<string, StatusOrcamento> = {
  "a enviar": "A_ENVIAR",
  "aguardando aprovacao": "AGUARDANDO_APROVACAO",
  aprovado: "APROVADO",
  recusado: "RECUSADO",
};

/** Colunas Sim/Não da baseprincipal → item de checklist (etapa, descrição do seed). */
const CHECKLIST: [coluna: string, etapa: number, item: string][] = [
  ["Assinatura realizada?", 4, "Assinatura realizada"],
  ["Cadastro foi realizado no food checker?", 5, "Cadastro no Food Checker"],
  ["Pasta burocrática ok?", 6, "Pasta burocrática ok"],
  ["Ata ok??", 6, "Ata ok"],
  ["Pasta de visita ok?", 6, "Pasta de visita ok"],
  ["Pasta de arquivo ok?", 6, "Pasta de arquivo ok"],
  ["Pasta do armario ok?", 6, "Pasta do armário ok"],
  ["Foi realizado o agendamento de diagnostico?", 7, "Agendamento de diagnóstico"],
  ["Foi agendado a reunião de apresentação do diagnostico?", 9, "Reunião de apresentação do diagnóstico"],
  ["Elaboração da documentação concluída?", 9, "Documentação concluída"],
  ["Foi realizado o treinamento?", 10, "Treinamento realizado"],
];

const ETAPA_VISITAS = 11;
const ETAPA_RECUSADOS = 12;

async function migrar(tx: Tx, abas: Map<string, Aba>, rel: Relatorio, somenteClientes = false) {
  const aba = (nome: string) => abas.get(chaveColuna(nome))?.linhas ?? [];
  const v = Aba.valor;
  const t = (l: Linha, c: string) => textoDe(v(l, c));
  const longo = (l: Linha, c: string) => textoLongoDe(v(l, c));

  // ----- usuários -----
  const perfis = new Map((await tx.perfil.findMany()).map((p) => [p.nome, p.id]));
  for (const l of somenteClientes ? [] : aba("usuarios")) {
    const email = emailsDe(v(l, "Email"))[0];
    if (!email) continue;
    if (await tx.usuario.findUnique({ where: { email } })) {
      rel.conta("Usuários já existentes (mantidos)");
      continue;
    }
    const telas = chaveNome(t(l, "Telas") ?? "");
    const perfil = telas.includes("gestao dos usuarios") ? "Administrador" : telas.includes("comercial") ? "Comercial" : "Técnico";
    const senhaHash = await bcrypt.hash(randomBytes(24).toString("base64url"), 10);
    await tx.usuario.create({
      data: {
        nome: nomeDoEmail(email),
        email,
        senhaHash,
        perfis: perfis.get(perfil) ? { create: { perfilId: perfis.get(perfil)! } } : undefined,
      },
    });
    rel.conta("Usuários criados");
    rel.aviso(`Usuário ${email} criado com perfil ${perfil}. Defina uma senha em Usuários > ${nomeDoEmail(email)} > Redefinir senha.`);
  }
  const usuarios: UsuarioMin[] = await tx.usuario.findMany({ select: { id: true, nome: true, email: true } });
  const pessoa = (texto: string | null) => acharUsuario(texto, usuarios);

  // ----- clientes -----
  const clientes = new Map<string, string>(); // chave (cnpj ou nome) → id
  const chaveCliente = (cnpj: string | null, nome: string | null) => cnpj ?? `nome:${chaveNome(nome ?? "")}`;
  const contatosExistentes = new Set(
    (await tx.clienteContato.findMany()).map((c) => `${c.clienteId}|${c.tipo}|${c.valor.toLowerCase()}`),
  );

  async function contato(clienteId: string, tipo: TipoContato, valor: string) {
    const k = `${clienteId}|${tipo}|${valor.toLowerCase()}`;
    if (contatosExistentes.has(k)) return;
    contatosExistentes.add(k);
    await tx.clienteContato.create({ data: { clienteId, tipo, valor } });
    rel.conta("Contatos de clientes");
  }

  async function garantirCliente(dados: {
    cnpj: Celula;
    nome: string | null;
    razao?: string | null;
    endereco?: string | null;
    gestor?: string | null;
    origem: string;
  }) {
    const cnpj = cnpjDe(dados.cnpj);
    const nome = dados.nome ?? dados.razao;
    if (!nome) return null;
    const chave = chaveCliente(cnpj, nome);
    const existente =
      clientes.get(chave) ??
      (cnpj
        ? (await tx.cliente.findUnique({ where: { cnpj } }))?.id
        : (await tx.cliente.findFirst({ where: { cnpj: null, nomeFantasia: { equals: nome, mode: "insensitive" } } }))?.id);
    if (existente) {
      if (!clientes.has(chave)) rel.conta("Clientes já existentes (mantidos)");
      clientes.set(chave, existente);
      if (dados.razao) await tx.cliente.updateMany({ where: { id: existente, razaoSocial: null }, data: { razaoSocial: dados.razao } });
      const gestorExistente = pessoa(dados.gestor ?? null);
      if (gestorExistente) await tx.cliente.updateMany({ where: { id: existente, gestorId: null }, data: { gestorId: gestorExistente.id } });
      return existente;
    }
    if (!cnpj && textoDe(dados.cnpj)) rel.aviso(`Cliente "${nome}" (${dados.origem}): CNPJ "${textoDe(dados.cnpj)}" inválido, cadastrado sem CNPJ.`);
    const gestor = pessoa(dados.gestor ?? null);
    if (dados.gestor && !gestor) rel.aviso(`Cliente "${nome}": gestor "${dados.gestor}" não é um usuário do sistema, ficou sem gestor.`);
    const criado = await tx.cliente.create({
      data: {
        nomeFantasia: nome,
        razaoSocial: dados.razao ?? null,
        cnpj,
        logradouro: dados.endereco ?? null,
        cep: cepDe(dados.endereco ?? null),
        gestorId: gestor?.id ?? null,
      },
    });
    rel.conta(`Clientes criados (${dados.origem})`);
    clientes.set(chave, criado.id);
    return criado.id;
  }

  /** Dados de contrato que só existem na aba Clientes, aplicados ao processo do cliente depois. */
  const contratoDaAbaClientes = new Map<
    string,
    { nome: string; valor: number | null; dia: number | null; validade: Date | null; descricao: string | null }
  >();

  for (const l of aba("Clientes")) {
    const id = await garantirCliente({
      cnpj: v(l, "CNPJ"),
      nome: t(l, "NOME"),
      endereco: t(l, "ENDEREÇO PARA NF."),
      gestor: t(l, "Gestor"),
      origem: "aba Clientes",
    });
    if (!id) continue;
    for (const email of emailsDe(v(l, "EMAIL"))) await contato(id, "EMAIL_NF", email);
    const telefone = t(l, "TELEFONE");
    if (telefone) await contato(id, /\d{4}/.test(telefone) ? "TELEFONE" : "OUTRO", telefone);
    const extra = {
      nome: t(l, "NOME") ?? "",
      valor: numeroDe(v(l, "VALOR")),
      dia: diaDe(v(l, "VENCIMENTO")),
      validade: dataDe(v(l, "VALIDADE DO CONTRATO")),
      descricao: t(l, "DESCRIÇÃO DO SERVIÇO"),
    };
    if (extra.valor !== null || extra.dia !== null || extra.validade || extra.descricao) contratoDaAbaClientes.set(id, extra);
  }

  if (somenteClientes) {
    // Só o cadastro das empresas que aparecem no funil, sem os processos.
    for (const l of aba("baseprincipal")) {
      const id = await garantirCliente({
        cnpj: v(l, "CNPJ"),
        nome: t(l, "Nome fantasia"),
        razao: t(l, "Razão social"),
        endereco: t(l, "Endereço completo"),
        origem: "aba baseprincipal",
      });
      if (id) for (const email of emailsDe(v(l, "E-mail para envio de NF"))) await contato(id, "EMAIL_NF", email);
    }
    return;
  }

  // ----- processos (baseprincipal) -----
  const etapas = new Set((await tx.etapa.findMany({ select: { id: true } })).map((e) => e.id));
  const itens = new Map((await tx.checklistItem.findMany()).map((i) => [`${i.etapaId}|${i.descricao}`, i.id]));
  const processos = new Map<string, { id: string; etapa: number; responsavelId: string | null; criadoEm: Date; clienteId: string }>();

  const base = aba("baseprincipal");
  const numerosUsados = new Set<number>();
  let maiorNumero = 0;
  for (const l of base) {
    const n = inteiroDe(v(l, "Nº do orçamento"));
    if (n && n > 0) maiorNumero = Math.max(maiorNumero, n);
  }

  for (const l of base) {
    const idAntigo = t(l, "id");
    if (!idAntigo) continue;
    const etapa = inteiroDe(v(l, "id da etapa"));
    if (!etapa || !etapas.has(etapa)) {
      rel.aviso(`Processo ${idAntigo}: etapa "${t(l, "id da etapa")}" desconhecida, não migrado.`);
      continue;
    }
    const clienteId = await garantirCliente({
      cnpj: v(l, "CNPJ"),
      nome: t(l, "Nome fantasia"),
      razao: t(l, "Razão social"),
      endereco: t(l, "Endereço completo"),
      origem: "aba baseprincipal",
    });
    if (!clienteId) {
      rel.aviso(`Processo ${idAntigo}: sem nome de cliente, não migrado.`);
      continue;
    }
    for (const email of emailsDe(v(l, "E-mail para envio de NF"))) await contato(clienteId, "EMAIL_NF", email);

    let numero = inteiroDe(v(l, "Nº do orçamento"));
    if (!numero || numero <= 0 || numerosUsados.has(numero)) {
      const novo = ++maiorNumero;
      if (numero) rel.aviso(`Processo ${idAntigo}: nº do orçamento ${numero} repetido, recebeu o nº ${novo}.`);
      numero = novo;
    }
    numerosUsados.add(numero);

    const statusTexto = chaveNome(t(l, "Status do orçamento") ?? "");
    const status: StatusOrcamento =
      STATUS[statusTexto] ?? (etapa === ETAPA_RECUSADOS ? "RECUSADO" : etapa >= 3 ? "APROVADO" : "A_ENVIAR");

    const responsavelTexto = t(l, "Responsável");
    const responsavel = pessoa(responsavelTexto);
    const notas = [
      longo(l, "Observações"),
      t(l, "Motivo") && `Motivo (AppSheet): ${t(l, "Motivo")}`,
      responsavelTexto && !responsavel && `Responsável no AppSheet: ${responsavelTexto}`,
    ].filter(Boolean);

    const motivoTexto = t(l, "Motiva da recusa da proposta");
    const motivo = motivoTexto
      ? await tx.motivoRecusa.upsert({ where: { descricao: motivoTexto }, update: {}, create: { descricao: motivoTexto } })
      : null;

    const criadoEm = dataDe(v(l, "Data")) ?? new Date();
    const valor = numeroDe(v(l, "Valor (R$)"));
    const processo = await tx.processo.create({
      data: {
        clienteId,
        etapaAtualId: etapa,
        responsavelId: responsavel?.id ?? null,
        numeroOrcamento: numero,
        statusOrcamento: status,
        numeroContrato: t(l, "Nº do contrato"),
        plano: t(l, "Plano escolhido"),
        valorMensal: valor,
        diaVencimento: diaDe(v(l, "Melhor data para vencimento")),
        validadeContrato: dataDe(v(l, "Validade do contrato")),
        visitasContratadas: inteiroDe(v(l, "Numeros de visitas contratadas")),
        cargaHorariaVisita: inteiroDe(v(l, "Qual a carga horária de cada visita")),
        incluiFichasTecnicas: simNao(v(l, "Contém elaboração de fichas tecnicas?")) ?? false,
        incluiInfoNutricional: simNao(v(l, "Contém elaboração de informação nutricional?")) ?? false,
        incluiCardapios: simNao(v(l, "Contém elaboração de cardapios?")) ?? false,
        emailRelatorios: emailsDe(v(l, "E-mail para envio de relatórios técnicos")).join(", ") || null,
        dataEnvioOrcamento: dataDe(v(l, "Data do envio do orçamento")),
        dataAprovacao: dataDe(v(l, "Data da aprovação do orçamento")),
        dataEnvioAssinatura: dataDe(v(l, "Data de envio p/ assinatura")),
        dataAssinatura: dataDe(v(l, "Data de assinatura")),
        motivoRecusaId: motivo?.id ?? null,
        observacoes: notas.join("\n") || null,
        pendencias: longo(l, "Pendências"),
        criadoEm,
      },
    });
    processos.set(idAntigo, { id: processo.id, etapa, responsavelId: responsavel?.id ?? null, criadoEm, clienteId });
    rel.conta("Processos");

    for (const [coluna, etapaItem, descricao] of CHECKLIST) {
      if (!simNao(v(l, coluna))) continue;
      const itemId = itens.get(`${etapaItem}|${descricao}`);
      if (!itemId) {
        rel.aviso(`Item de checklist "${descricao}" não existe no cadastro; resposta do processo nº ${numero} ignorada.`);
        continue;
      }
      await tx.processoChecklist.create({ data: { processoId: processo.id, itemId, concluido: true, concluidoEm: criadoEm } });
      rel.conta("Itens de checklist marcados");
    }

    for (const nome of listaDe(v(l, "Qual documentação foi contratada?"))) {
      const tipo = await tx.tipoDocumentacao.upsert({ where: { nome }, update: {}, create: { nome } });
      await tx.processoDocumentacao.create({ data: { processoId: processo.id, tipoDocumentacaoId: tipo.id } });
      rel.conta("Documentações contratadas");
    }
  }

  // Dados de contrato da aba Clientes completam o processo mais recente do cliente.
  for (const [clienteId, extra] of contratoDaAbaClientes) {
    const proc = [...processos.values()].filter((p) => p.clienteId === clienteId).sort((a, b) => +b.criadoEm - +a.criadoEm)[0];
    if (!proc) {
      if (extra.valor !== null || extra.descricao) {
        rel.aviso(`Cliente "${extra.nome}" tem valor/serviço na aba Clientes mas nenhum processo no funil; esses dados não foram migrados.`);
      }
      continue;
    }
    const atual = await tx.processo.findUniqueOrThrow({ where: { id: proc.id } });
    await tx.processo.update({
      where: { id: proc.id },
      data: {
        valorMensal: atual.valorMensal ?? extra.valor,
        diaVencimento: atual.diaVencimento ?? extra.dia,
        validadeContrato: atual.validadeContrato ?? extra.validade,
        observacoes: extra.descricao ? [atual.observacoes, `Serviço (aba Clientes): ${extra.descricao}`].filter(Boolean).join("\n") : atual.observacoes,
      },
    });
  }

  // ----- histórico de etapas -----
  const historicoPorProcesso = new Map<string, { etapa: number; inicio: Date; fim: Date | null; responsavel: string | null; motivo: string | null }[]>();
  for (const l of aba("historico")) {
    const ref = t(l, "id ref");
    const etapa = inteiroDe(v(l, "id da etapa"));
    const inicio = dataHoraDe(v(l, "Data hora"));
    if (!ref || !processos.has(ref)) {
      rel.aviso(`Histórico ${t(l, "id")}: processo "${ref}" não existe na baseprincipal, ignorado.`);
      continue;
    }
    if (!etapa || !etapas.has(etapa) || !inicio) {
      rel.aviso(`Histórico ${t(l, "id")}: etapa ou data inválida, ignorado.`);
      continue;
    }
    const lista = historicoPorProcesso.get(ref) ?? [];
    lista.push({ etapa, inicio, fim: dataHoraDe(v(l, "Data hora fim")), responsavel: t(l, "Responsável"), motivo: t(l, "Motivo") });
    historicoPorProcesso.set(ref, lista);
  }
  for (const [ref, proc] of processos) {
    const lista = (historicoPorProcesso.get(ref) ?? []).sort((a, b) => +a.inicio - +b.inicio);
    // Só a última passagem fica aberta; as outras terminam quando a seguinte começa.
    for (let i = 0; i < lista.length - 1; i++) lista[i].fim ??= lista[i + 1].inicio;
    const ultima = lista.at(-1);
    if (ultima && ultima.etapa === proc.etapa) ultima.fim = null;
    else {
      const inicio = ultima ? (ultima.fim ?? ultima.inicio) : proc.criadoEm;
      if (ultima) ultima.fim ??= inicio;
      lista.push({ etapa: proc.etapa, inicio, fim: null, responsavel: null, motivo: null });
    }
    for (const h of lista) {
      const resp = pessoa(h.responsavel);
      const motivo = [h.motivo, h.responsavel && !resp && `Responsável no AppSheet: ${h.responsavel}`].filter(Boolean).join(" · ");
      await tx.processoEtapaHistorico.create({
        data: { processoId: proc.id, etapaId: h.etapa, inicio: h.inicio, fim: h.fim, responsavelId: resp?.id ?? proc.responsavelId, motivo: motivo || null },
      });
      rel.conta("Passagens pelo histórico de etapas");
    }
    // Responsável do processo: se a baseprincipal não tinha, usa o último do histórico.
    if (!proc.responsavelId) {
      const ultimoResp = [...lista].reverse().map((h) => pessoa(h.responsavel)).find(Boolean);
      if (ultimoResp) {
        await tx.processo.update({ where: { id: proc.id }, data: { responsavelId: ultimoResp.id } });
        proc.responsavelId = ultimoResp.id;
      }
    }
  }

  // ----- ciclo do contrato para quem já está nas visitas técnicas -----
  const ciclos = new Map<string, { id: string; inicio: Date }>(); // processoId → ciclo
  for (const [ref, proc] of processos) {
    if (proc.etapa !== ETAPA_VISITAS) continue;
    const p = await tx.processo.findUniqueOrThrow({ where: { id: proc.id } });
    const entrada = (historicoPorProcesso.get(ref) ?? []).filter((h) => h.etapa === ETAPA_VISITAS).at(-1)?.inicio;
    const inicio = dataDe(entrada ?? p.dataAssinatura ?? proc.criadoEm)!;
    const umAno = new Date(Date.UTC(inicio.getUTCFullYear() + 1, inicio.getUTCMonth(), inicio.getUTCDate()));
    const fimPrevisto = p.validadeContrato && p.validadeContrato > inicio ? p.validadeContrato : umAno;
    const ciclo = await tx.processoCiclo.create({ data: { processoId: proc.id, numero: 1, inicio, fimPrevisto } });
    ciclos.set(proc.id, { id: ciclo.id, inicio });
    rel.conta("Ciclos de contrato abertos");
  }
  const cicloDe = (processoId: string, data: Date | null) => {
    const c = ciclos.get(processoId);
    return c && data && data >= c.inicio ? c.id : null;
  };

  const refProcesso = (l: Linha, onde: string) => {
    const ref = t(l, "id ref");
    const proc = ref ? processos.get(ref) : undefined;
    if (!proc) rel.aviso(`${onde} ${t(l, "id") ?? ""}: processo "${ref ?? ""}" não existe na baseprincipal, ignorado.`);
    return proc;
  };

  // ----- coleta de dados e setores -----
  const coletas = new Map<string, string>();
  for (const l of aba("coletadedados")) {
    const proc = refProcesso(l, "Coleta de dados");
    if (!proc) continue;
    const data = dataDe(v(l, "Data de preenchimento")) ?? new Date();
    const [nomeLegal, ...cargo] = (t(l, "Nome e cargo responsável legal") ?? "").split(/\s+-\s+/);
    const coleta = await tx.coletaDados.create({
      data: {
        processoId: proc.id,
        cicloId: cicloDe(proc.id, data),
        dataPreenchimento: data,
        horarioPublico: horaDe(v(l, "Horário de funcionamento ao público")),
        horarioProducao: horaDe(v(l, "Horário de funcionamento de produção")),
        responsavelLegalNome: nomeLegal || null,
        responsavelLegalCargo: cargo.join(" - ") || null,
        responsavelLegalRg: t(l, "Documento de identidade responsável legal"),
        responsavelLegalCpf: t(l, "Número do cpf responsável legal"),
        responsavelLegalTelefone: t(l, "Telefone responsável legal"),
        telefoneEmpresa: t(l, "Telefone empresa"),
        responsavelRelatorio: t(l, "Responsável para envio relatório"),
        encarregadosSetores: longo(l, "Nome dos encarregados de cada setor"),
        dedetizadora: t(l, "Dedetizadora responsável"),
        fornecimentoAgua: t(l, "Responsável pelo fornecimento da água (demsur, copasa, poço artesiano, etc)"),
        caixasDagua: t(l, "Quantidade de caixas d'águas (coloque quantos litros cada uma possui)"),
        limpezaCaixaDagua: t(l, "Responsável limpeza caixa d'água"),
        coletaLixoComum: longo(l, "Responsável e horário da coleta de lixo comum"),
        coletaLixoOrganico: longo(l, "Responsável e horário da coleta de lixo orgânico / frequência de coleta / destino de utilização do lixo"),
        coletaOleo: longo(l, "Responsável e horário da coleta de óleo / frequência de coleta / destino de utilização do óleo"),
        medicinaSegurancaTrabalho: longo(l, "Responsável pela medicina e segurança do trabalho (conferir elaboração e vencimento do pcmso e ppra)"),
        responsaveisHigienizacao: longo(l, "Responsáveis pela higienização (colocar nome e setor), detalhe o mais especificado possível"),
        materiaisLimpeza: longo(l, "Materiais de limpeza utilizados e forma de diluição dos mesmos (materias para limpeza de estrutura física e equipamento)"),
        escalaLimpeza: longo(l, "Escala de limpeza de cada setor"),
        equipamentosRefrigeracao: longo(l, "Descrição dos equipamentos refrigerados e aquecimento"),
        principaisFornecedores: longo(l, "Detalhar os principais fornecedores locais"),
        observacoes: longo(l, "Observações"),
      },
    });
    const id = t(l, "id");
    if (id) coletas.set(id, coleta.id);
    rel.conta("Coletas de dados");
  }
  for (const l of aba("setores")) {
    const coletaId = coletas.get(t(l, "id ref") ?? "");
    const nome = t(l, "Setor");
    if (!coletaId || !nome) {
      rel.aviso(`Setor ${t(l, "id") ?? ""}: coleta "${t(l, "id ref") ?? ""}" não encontrada ou setor sem nome, ignorado.`);
      continue;
    }
    await tx.setor.create({
      data: {
        coletaId,
        nome,
        piso: t(l, "Tipo de piso"),
        parede: t(l, "Tipo de parede"),
        teto: t(l, "Tipo de teto"),
        portas: listaDe(v(l, "Tipo de porta")),
        janelas: listaDe(v(l, "Tipo de janela")),
        ralo: t(l, "Tipo de ralo"),
        equipamentos: longo(l, "Lista de equipamentos"),
      },
    });
    rel.conta("Setores");
  }

  // ----- visitas -----
  for (const l of aba("visitas")) {
    const proc = refProcesso(l, "Visita");
    if (!proc) continue;
    const inicio = dataHoraDe(v(l, "Data hora inicio"));
    if (!inicio) {
      rel.aviso(`Visita ${t(l, "id")}: sem data de início, ignorada.`);
      continue;
    }
    await tx.visita.create({
      data: {
        processoId: proc.id,
        cicloId: cicloDe(proc.id, inicio),
        inicio,
        fim: dataHoraDe(v(l, "Data hora fim")),
        realizado: longo(l, "O que foi realizado na visita?"),
        recebidoPor: t(l, "Quem foi o responsável pelo recebimento?"),
        placasColadas: simNao(v(l, "Placas foram coladas?")),
        fichasTecnicas: simNao(v(l, "Foi feito a elaboração de fichas tecnicas?")),
        infoNutricional: simNao(v(l, "Foi feito a elaboração de informação nutricional?")),
        cardapios: simNao(v(l, "Foi feito a elaboração de cardapios?")),
        teveInconformidade: simNao(v(l, "Foi encontrado inconformidades na visita?")) ?? false,
        inconformidades: longo(l, "Quais inconformidades?"),
      },
    });
    rel.conta("Visitas");
  }

  // ----- plano de ação -----
  for (const l of aba("PlanodeAcao")) {
    const proc = refProcesso(l, "Plano de ação");
    const descricao = longo(l, "Plano de ação");
    if (!proc || !descricao) continue;
    const data = dataDe(v(l, "Data")) ?? dataDe(new Date())!;
    await tx.planoAcao.create({
      data: { processoId: proc.id, cicloId: cicloDe(proc.id, data), data, prazo: dataDe(v(l, "Prazo")), origem: t(l, "Origem"), descricao },
    });
    rel.conta("Planos de ação");
  }

  // ----- solicitações de placas e de documentos (ligadas ao processo) -----
  for (const l of aba("solicitacaodeplacas")) {
    const proc = refProcesso(l, "Solicitação de placa");
    const placa = t(l, "Qual placa?");
    if (!proc || !placa) continue;
    await tx.solicitacaoPlaca.create({
      data: {
        processoId: proc.id,
        data: dataDe(v(l, "Data da solicitação")) ?? dataDe(new Date())!,
        placa,
        setores: t(l, "Para quais setores?"),
        quantidade: inteiroDe(v(l, "Quantidade")),
        observacoes: longo(l, "Observações"),
        atendidaEm: simNao(v(l, "Foi atendido a solicitação?")) ? dataDe(v(l, "Data de atendimento")) : null,
      },
    });
    rel.conta("Solicitações de placas");
  }
  for (const l of aba("solicitacaodoc")) {
    const proc = refProcesso(l, "Solicitação de documento");
    const tipoDocumento = t(l, "Qual documento?");
    if (!proc || !tipoDocumento) continue;
    const data = dataDe(v(l, "Data da solicitação")) ?? dataDe(new Date())!;
    await tx.solicitacaoDocumento.create({
      data: {
        processoId: proc.id,
        cicloId: cicloDe(proc.id, data),
        data,
        tipoDocumento,
        realizadoEm: simNao(v(l, "Realizado?")) ? (dataDe(v(l, "Data de realização")) ?? data) : null,
      },
    });
    rel.conta("Solicitações de documentos");
  }

  // ----- solicitações do escritório -----
  const solicitacoes = new Map<string, string>();
  for (const l of aba("solicitacaoEscritorio")) {
    const servico = t(l, "Nome do serviço");
    const clienteId = await garantirCliente({
      cnpj: v(l, "CNPJ"),
      nome: t(l, "Cliente"),
      endereco: t(l, "Endereço completo"),
      origem: "aba solicitacaoEscritorio",
    });
    if (!clienteId || !servico) {
      rel.aviso(`Solicitação do escritório ${t(l, "id") ?? ""}: sem cliente ou sem serviço, ignorada.`);
      continue;
    }
    const respTexto = t(l, "Responsável");
    const valTexto = t(l, "Quem realizou a validação?");
    const resp = pessoa(respTexto);
    const val = pessoa(valTexto);
    const notas = [
      longo(l, "Observação"),
      respTexto && !resp && `Responsável no AppSheet: ${respTexto}`,
      valTexto && !val && `Validação no AppSheet: ${valTexto}`,
    ].filter(Boolean);
    const concluido = chaveNome(t(l, "Status") ?? "").startsWith("conclu");
    const s = await tx.solicitacaoEscritorio.create({
      data: {
        clienteId,
        processoId: processos.get(t(l, "id ref") ?? "")?.id ?? null,
        status: concluido ? "CONCLUIDO" : "EM_ABERTO",
        data: dataDe(v(l, "Data de solicitação")) ?? dataDe(new Date())!,
        servico,
        descricao: longo(l, "Descrição do serviço"),
        responsavelId: resp?.id ?? null,
        prazo: dataDe(v(l, "Prazo")),
        requerValidacao: simNao(v(l, "Necessita de validação?")) ?? false,
        validadoPorId: val?.id ?? null,
        concluidoEm: dataDe(v(l, "Data de conclusão")),
        observacao: notas.join("\n") || null,
      },
    });
    const id = t(l, "id");
    if (id) {
      if (solicitacoes.has(id)) rel.aviso(`Solicitação do escritório: id ${id} repetido na planilha; anexos ligados à primeira.`);
      else solicitacoes.set(id, s.id);
    }
    rel.conta("Solicitações do escritório");
  }

  // ----- mapa de comercialização -----
  const mapa = new Map<string, { solicitado: boolean; data: Date | null }>();
  for (const l of aba("SolicitacaoMapaComercializacao")) {
    const cnpj = cnpjDe(v(l, "CNPJ"));
    const nome = t(l, "Cliente");
    const clienteId =
      clientes.get(chaveCliente(cnpj, nome)) ?? (cnpj ? (await tx.cliente.findUnique({ where: { cnpj } }))?.id : undefined);
    if (!clienteId) {
      rel.aviso(`Mapa de comercialização: cliente "${nome}" (${t(l, "CNPJ") ?? "sem CNPJ"}) não está cadastrado, linha ignorada.`);
      continue;
    }
    const linha = { solicitado: simNao(v(l, "Foi solicitado ou não?")) ?? false, data: dataDe(v(l, "Data da solicitação")) };
    const atual = mapa.get(clienteId);
    if (!atual || (linha.data && (!atual.data || linha.data > atual.data))) mapa.set(clienteId, linha);
  }
  for (const [clienteId, m] of mapa) {
    await tx.solicitacaoMapa.create({ data: { clienteId, solicitado: m.solicitado, data: m.solicitado ? m.data : null } });
    rel.conta("Mapa de comercialização");
  }

  // ----- anexos e fotos -----
  const raiz = path.resolve(process.env.ARQUIVOS_DIR || "armazenamento");
  let faltando = 0;
  async function arquivo(l: Linha, categoria: "ANEXO" | "FOTO", coluna: string, onde: string) {
    const caminho = t(l, coluna);
    if (!caminho) return;
    const ref = t(l, "id ref") ?? "";
    const processoId = processos.get(ref)?.id ?? null;
    const solicitacaoEscritorioId = processoId ? null : (solicitacoes.get(ref) ?? null);
    if (!processoId && !solicitacaoEscritorioId) {
      rel.aviso(`${onde} ${t(l, "id") ?? ""} (${caminho}): registro "${ref}" não encontrado, ignorado.`);
      return;
    }
    const relativo = `${PASTA_ARQUIVOS}/${caminho.replace(/\\/g, "/").replace(/^\/+/, "")}`;
    if (relativo.split("/").includes("..")) {
      rel.aviso(`${onde} ${t(l, "id") ?? ""}: caminho inválido "${caminho}", ignorado.`);
      return;
    }
    if (!existsSync(path.join(raiz, relativo))) faltando++;
    await tx.arquivo.create({
      data: {
        processoId,
        solicitacaoEscritorioId,
        categoria,
        tipo: categoria === "ANEXO" ? t(l, "Tipo de anexo") : null,
        descricao: categoria === "FOTO" ? t(l, "Descrição") : null,
        data: dataDe(v(l, "Data do anexo")) ?? processos.get(ref)?.criadoEm ?? dataDe(new Date())!,
        validade: dataDe(v(l, "Validade do documento")),
        caminhoStorage: relativo,
        mime: mimeDe(caminho),
      },
    });
    rel.conta(categoria === "FOTO" ? "Fotos" : "Anexos");
  }
  for (const l of aba("anexos")) await arquivo(l, "ANEXO", "Anexo", "Anexo");
  for (const l of aba("fotos")) await arquivo(l, "FOTO", "foto", "Foto");
  if (faltando) {
    rel.aviso(
      `${faltando} foto(s)/anexo(s) ainda não estão em ${path.join(raiz, PASTA_ARQUIVOS)}. ` +
        "Copie para lá as pastas do AppSheet (por exemplo anexos_Files_, anexos_Images, fotos_Images) do Google Drive.",
    );
  }

  // ----- atividades (tarefas pessoais) -----
  for (const l of aba("Atividades")) {
    const descricao = longo(l, "O que?");
    const usuario = usuarios.find((u) => u.email === emailsDe(v(l, "Email"))[0]);
    if (!descricao) continue;
    if (!usuario) {
      rel.aviso(`Atividade ${t(l, "ID") ?? ""}: e-mail "${t(l, "Email") ?? ""}" não é usuário, ignorada.`);
      continue;
    }
    await tx.tarefa.create({
      data: {
        usuarioId: usuario.id,
        descricao,
        status: chaveNome(t(l, "Status") ?? "").startsWith("conclu") ? "CONCLUIDA" : "PENDENTE",
        data: dataDe(v(l, "Data")) ?? dataDe(new Date())!,
        prazo: dataDe(v(l, "Prazo")),
      },
    });
    rel.conta("Atividades");
  }

  // Próximos orçamentos continuam a numeração da planilha.
  await tx.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('processos', 'numero_orcamento'), GREATEST((SELECT COALESCE(MAX(numero_orcamento), 0) FROM processos), 1))`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const aplicar = args.includes("--aplicar");
  const somenteClientes = args.includes("--somente-clientes");
  const arquivo = args.find((a) => !a.startsWith("--"));
  if (!arquivo) {
    console.error("Uso: npm run migrar -- caminho/da/planilha.xlsx [--somente-clientes] [--aplicar]");
    process.exit(1);
  }
  if (!existsSync(arquivo)) {
    console.error(`Arquivo não encontrado: ${arquivo}`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida. Copie .env.example para .env (veja o README).");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    if (!somenteClientes && (await db.configuracao.findUnique({ where: { chave: CHAVE_MIGRACAO } }))) {
      console.error("A migração do AppSheet já foi gravada neste banco. Para refazer, comece de um banco vazio (npx prisma migrate reset).");
      process.exit(1);
    }
    if (!(await db.etapa.count())) {
      console.error("O banco ainda não tem as etapas do funil. Rode antes: npm run db:seed");
      process.exit(1);
    }
    const existentes = somenteClientes ? 0 : await db.processo.count();
    if (existentes) {
      console.error(`O banco já tem ${existentes} processo(s) cadastrados. A migração precisa de um funil vazio para não duplicar dados.`);
      process.exit(1);
    }

    console.log(`Lendo ${arquivo}...`);
    const abas = await lerPlanilha(arquivo);
    const rel = new Relatorio();
    const faltam = (somenteClientes ? ["baseprincipal", "Clientes"] : ["baseprincipal", "Clientes", "historico"]).filter((a) => !abas.has(chaveColuna(a)));
    if (faltam.length) {
      console.error(`A planilha não tem as abas: ${faltam.join(", ")}. Confira se é o arquivo baixado do AppSheet.`);
      process.exit(1);
    }

    try {
      await db.$transaction(
        async (tx) => {
          await migrar(tx, abas, rel, somenteClientes);
          if (!aplicar) throw new Simulacao();
          if (somenteClientes) return;
          await tx.configuracao.create({
            data: { chave: CHAVE_MIGRACAO, valor: { em: new Date().toISOString(), arquivo: path.basename(arquivo) }, descricao: "Controle interno: migração do AppSheet já feita." },
          });
        },
        { timeout: 10 * 60_000, maxWait: 30_000 },
      );
    } catch (e) {
      if (!(e instanceof Simulacao)) throw e;
    }

    const texto = rel.texto(aplicar);
    console.log(`\n${texto}`);
    await writeFile("migracao-relatorio.txt", texto + "\n", "utf8");
    console.log("\nRelatório salvo em migracao-relatorio.txt");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
