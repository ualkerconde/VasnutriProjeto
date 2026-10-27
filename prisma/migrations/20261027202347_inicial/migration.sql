-- CreateEnum
CREATE TYPE "Modulo" AS ENUM ('PAINEL', 'FUNIL', 'CLIENTES', 'VISITAS', 'SOLICITACOES', 'MAPA_COMERCIALIZACAO', 'CADASTROS', 'USUARIOS');

-- CreateEnum
CREATE TYPE "TipoContato" AS ENUM ('EMAIL_NF', 'EMAIL_RELATORIO', 'TELEFONE', 'RESPONSAVEL_LEGAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('A_ENVIAR', 'AGUARDANDO_APROVACAO', 'APROVADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('ETAPA_ALTERADA', 'PROCESSO_ATRIBUIDO', 'ORCAMENTO_PARADO', 'SOLICITACAO_PRAZO', 'VALIDACAO_PENDENTE', 'DOCUMENTO_VENCENDO', 'VISITA_ATRASADA', 'CONTRATO_VENCENDO');

-- CreateEnum
CREATE TYPE "StatusPlanoAcao" AS ENUM ('ABERTO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('EM_ABERTO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "CategoriaArquivo" AS ENUM ('FOTO', 'ANEXO');

-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_permissoes" (
    "perfil_id" UUID NOT NULL,
    "modulo" "Modulo" NOT NULL,

    CONSTRAINT "perfil_permissoes_pkey" PRIMARY KEY ("perfil_id","modulo")
);

-- CreateTable
CREATE TABLE "usuario_perfis" (
    "usuario_id" UUID NOT NULL,
    "perfil_id" UUID NOT NULL,

    CONSTRAINT "usuario_perfis_pkey" PRIMARY KEY ("usuario_id","perfil_id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "dispositivo" TEXT,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessos_log" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "email_informado" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sucesso" BOOLEAN NOT NULL,
    "ip" TEXT,
    "dispositivo" TEXT,

    CONSTRAINT "acessos_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "razao_social" TEXT,
    "nome_fantasia" TEXT NOT NULL,
    "cnpj" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" CHAR(2),
    "cep" TEXT,
    "observacao_nf" TEXT,
    "gestor_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_contatos" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "tipo" "TipoContato" NOT NULL,
    "valor" TEXT NOT NULL,
    "nome" TEXT,

    CONSTRAINT "cliente_contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_servicos" (
    "cliente_id" UUID NOT NULL,
    "servico_id" UUID NOT NULL,

    CONSTRAINT "cliente_servicos_pkey" PRIMARY KEY ("cliente_id","servico_id")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "final" BOOLEAN NOT NULL DEFAULT false,
    "exibe_valor_contrato" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "etapa_atual_id" INTEGER NOT NULL,
    "responsavel_id" UUID,
    "numero_orcamento" SERIAL NOT NULL,
    "status_orcamento" "StatusOrcamento" NOT NULL DEFAULT 'A_ENVIAR',
    "numero_contrato" TEXT,
    "plano" TEXT,
    "valor_mensal" DECIMAL(12,2),
    "dia_vencimento" INTEGER,
    "validade_contrato" DATE,
    "visitas_contratadas" INTEGER,
    "carga_horaria_visita" INTEGER,
    "inclui_fichas_tecnicas" BOOLEAN NOT NULL DEFAULT false,
    "inclui_info_nutricional" BOOLEAN NOT NULL DEFAULT false,
    "inclui_cardapios" BOOLEAN NOT NULL DEFAULT false,
    "email_relatorios" TEXT,
    "data_envio_orcamento" TIMESTAMP(3),
    "data_aprovacao" TIMESTAMP(3),
    "data_envio_assinatura" TIMESTAMP(3),
    "data_assinatura" TIMESTAMP(3),
    "motivo_recusa_id" UUID,
    "observacoes" TEXT,
    "pendencias" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_itens" (
    "id" UUID NOT NULL,
    "etapa_id" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "checklist_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processo_checklist" (
    "processo_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "concluido_em" TIMESTAMP(3),
    "concluido_por_id" UUID,

    CONSTRAINT "processo_checklist_pkey" PRIMARY KEY ("processo_id","item_id")
);

-- CreateTable
CREATE TABLE "processo_etapas_historico" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "etapa_id" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim" TIMESTAMP(3),
    "responsavel_id" UUID,
    "motivo" TEXT,

    CONSTRAINT "processo_etapas_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivos_recusa" (
    "id" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "motivos_recusa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_documentacao" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_documentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processo_documentacoes" (
    "processo_id" UUID NOT NULL,
    "tipo_documentacao_id" UUID NOT NULL,

    CONSTRAINT "processo_documentacoes_pkey" PRIMARY KEY ("processo_id","tipo_documentacao_id")
);

-- CreateTable
CREATE TABLE "processo_ciclos" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "inicio" DATE NOT NULL,
    "fim_previsto" DATE,
    "encerrado_em" TIMESTAMP(3),
    "encerrado_por_id" UUID,

    CONSTRAINT "processo_ciclos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT,
    "entidade" TEXT,
    "entidade_id" UUID,
    "lida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coletas_dados" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "ciclo_id" UUID,
    "data_preenchimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horario_publico" TEXT,
    "horario_producao" TEXT,
    "responsavel_legal_nome" TEXT,
    "responsavel_legal_cargo" TEXT,
    "responsavel_legal_rg" TEXT,
    "responsavel_legal_cpf" TEXT,
    "responsavel_legal_telefone" TEXT,
    "telefone_empresa" TEXT,
    "responsavel_relatorio" TEXT,
    "encarregados_setores" TEXT,
    "dedetizadora" TEXT,
    "fornecimento_agua" TEXT,
    "caixas_dagua" TEXT,
    "limpeza_caixa_dagua" TEXT,
    "coleta_lixo_comum" TEXT,
    "coleta_lixo_organico" TEXT,
    "coleta_oleo" TEXT,
    "medicina_seguranca_trabalho" TEXT,
    "responsaveis_higienizacao" TEXT,
    "materiais_limpeza" TEXT,
    "escala_limpeza" TEXT,
    "equipamentos_refrigeracao" TEXT,
    "principais_fornecedores" TEXT,
    "observacoes" TEXT,

    CONSTRAINT "coletas_dados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" UUID NOT NULL,
    "coleta_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "piso" TEXT,
    "parede" TEXT,
    "teto" TEXT,
    "portas" TEXT[],
    "janelas" TEXT[],
    "ralo" TEXT,
    "equipamentos" TEXT,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "ciclo_id" UUID,
    "tecnico_id" UUID,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "realizado" TEXT,
    "recebido_por" TEXT,
    "placas_coladas" BOOLEAN,
    "fichas_tecnicas" BOOLEAN,
    "info_nutricional" BOOLEAN,
    "cardapios" BOOLEAN,
    "teve_inconformidade" BOOLEAN NOT NULL DEFAULT false,
    "inconformidades" TEXT,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_acao" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "ciclo_id" UUID,
    "visita_id" UUID,
    "data" DATE NOT NULL,
    "prazo" DATE,
    "origem" TEXT,
    "descricao" TEXT NOT NULL,
    "status" "StatusPlanoAcao" NOT NULL DEFAULT 'ABERTO',

    CONSTRAINT "planos_acao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_placas" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "placa" TEXT NOT NULL,
    "setores" TEXT,
    "quantidade" INTEGER,
    "observacoes" TEXT,
    "atendida_em" DATE,

    CONSTRAINT "solicitacoes_placas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_documentos" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "ciclo_id" UUID,
    "data" DATE NOT NULL,
    "tipo_documento" TEXT NOT NULL,
    "realizado_em" DATE,

    CONSTRAINT "solicitacoes_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_escritorio" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "processo_id" UUID,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'EM_ABERTO',
    "data" DATE NOT NULL,
    "servico" TEXT NOT NULL,
    "descricao" TEXT,
    "responsavel_id" UUID,
    "prazo" DATE,
    "requer_validacao" BOOLEAN NOT NULL DEFAULT false,
    "validado_por_id" UUID,
    "concluido_em" DATE,
    "observacao" TEXT,

    CONSTRAINT "solicitacoes_escritorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_mapa" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "solicitado" BOOLEAN NOT NULL DEFAULT false,
    "data" DATE,

    CONSTRAINT "solicitacoes_mapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivos" (
    "id" UUID NOT NULL,
    "processo_id" UUID,
    "solicitacao_escritorio_id" UUID,
    "categoria" "CategoriaArquivo" NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT,
    "data" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validade" DATE,
    "caminho_storage" TEXT NOT NULL,
    "mime" TEXT,
    "tamanho_bytes" INTEGER,
    "enviado_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "status" "StatusTarefa" NOT NULL DEFAULT 'PENDENTE',
    "descricao" TEXT NOT NULL,
    "data" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazo" DATE,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "descricao" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_nome_key" ON "perfis"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_token_hash_key" ON "sessoes"("token_hash");

-- CreateIndex
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes"("usuario_id");

-- CreateIndex
CREATE INDEX "acessos_log_data_hora_idx" ON "acessos_log"("data_hora");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE INDEX "clientes_nome_fantasia_idx" ON "clientes"("nome_fantasia");

-- CreateIndex
CREATE INDEX "cliente_contatos_cliente_id_idx" ON "cliente_contatos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_nome_key" ON "servicos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_ordem_key" ON "etapas"("ordem");

-- CreateIndex
CREATE UNIQUE INDEX "processos_numero_orcamento_key" ON "processos"("numero_orcamento");

-- CreateIndex
CREATE INDEX "processos_cliente_id_idx" ON "processos"("cliente_id");

-- CreateIndex
CREATE INDEX "processos_etapa_atual_id_idx" ON "processos"("etapa_atual_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_itens_etapa_id_descricao_key" ON "checklist_itens"("etapa_id", "descricao");

-- CreateIndex
CREATE INDEX "processo_etapas_historico_processo_id_inicio_idx" ON "processo_etapas_historico"("processo_id", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "motivos_recusa_descricao_key" ON "motivos_recusa"("descricao");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documentacao_nome_key" ON "tipos_documentacao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "processo_ciclos_processo_id_numero_key" ON "processo_ciclos"("processo_id", "numero");

-- CreateIndex
CREATE INDEX "notificacoes_usuario_id_lida_em_idx" ON "notificacoes"("usuario_id", "lida_em");

-- CreateIndex
CREATE INDEX "coletas_dados_processo_id_idx" ON "coletas_dados"("processo_id");

-- CreateIndex
CREATE INDEX "setores_coleta_id_idx" ON "setores"("coleta_id");

-- CreateIndex
CREATE INDEX "visitas_processo_id_inicio_idx" ON "visitas"("processo_id", "inicio");

-- CreateIndex
CREATE INDEX "planos_acao_processo_id_idx" ON "planos_acao"("processo_id");

-- CreateIndex
CREATE INDEX "solicitacoes_placas_processo_id_idx" ON "solicitacoes_placas"("processo_id");

-- CreateIndex
CREATE INDEX "solicitacoes_documentos_processo_id_idx" ON "solicitacoes_documentos"("processo_id");

-- CreateIndex
CREATE INDEX "solicitacoes_escritorio_status_prazo_idx" ON "solicitacoes_escritorio"("status", "prazo");

-- CreateIndex
CREATE INDEX "arquivos_processo_id_idx" ON "arquivos"("processo_id");

-- CreateIndex
CREATE INDEX "arquivos_validade_idx" ON "arquivos"("validade");

-- AddForeignKey
ALTER TABLE "perfil_permissoes" ADD CONSTRAINT "perfil_permissoes_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_perfis" ADD CONSTRAINT "usuario_perfis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_perfis" ADD CONSTRAINT "usuario_perfis_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acessos_log" ADD CONSTRAINT "acessos_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_gestor_id_fkey" FOREIGN KEY ("gestor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_contatos" ADD CONSTRAINT "cliente_contatos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_servicos" ADD CONSTRAINT "cliente_servicos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_servicos" ADD CONSTRAINT "cliente_servicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_etapa_atual_id_fkey" FOREIGN KEY ("etapa_atual_id") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_motivo_recusa_id_fkey" FOREIGN KEY ("motivo_recusa_id") REFERENCES "motivos_recusa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_itens" ADD CONSTRAINT "checklist_itens_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_checklist" ADD CONSTRAINT "processo_checklist_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_checklist" ADD CONSTRAINT "processo_checklist_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "checklist_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_checklist" ADD CONSTRAINT "processo_checklist_concluido_por_id_fkey" FOREIGN KEY ("concluido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_etapas_historico" ADD CONSTRAINT "processo_etapas_historico_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_etapas_historico" ADD CONSTRAINT "processo_etapas_historico_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_etapas_historico" ADD CONSTRAINT "processo_etapas_historico_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_documentacoes" ADD CONSTRAINT "processo_documentacoes_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_documentacoes" ADD CONSTRAINT "processo_documentacoes_tipo_documentacao_id_fkey" FOREIGN KEY ("tipo_documentacao_id") REFERENCES "tipos_documentacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_ciclos" ADD CONSTRAINT "processo_ciclos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_ciclos" ADD CONSTRAINT "processo_ciclos_encerrado_por_id_fkey" FOREIGN KEY ("encerrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coletas_dados" ADD CONSTRAINT "coletas_dados_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coletas_dados" ADD CONSTRAINT "coletas_dados_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "processo_ciclos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setores" ADD CONSTRAINT "setores_coleta_id_fkey" FOREIGN KEY ("coleta_id") REFERENCES "coletas_dados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "processo_ciclos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "processo_ciclos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_acao" ADD CONSTRAINT "planos_acao_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visitas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_placas" ADD CONSTRAINT "solicitacoes_placas_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_documentos" ADD CONSTRAINT "solicitacoes_documentos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_documentos" ADD CONSTRAINT "solicitacoes_documentos_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "processo_ciclos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_escritorio" ADD CONSTRAINT "solicitacoes_escritorio_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_escritorio" ADD CONSTRAINT "solicitacoes_escritorio_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_escritorio" ADD CONSTRAINT "solicitacoes_escritorio_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_escritorio" ADD CONSTRAINT "solicitacoes_escritorio_validado_por_id_fkey" FOREIGN KEY ("validado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_mapa" ADD CONSTRAINT "solicitacoes_mapa_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_solicitacao_escritorio_id_fkey" FOREIGN KEY ("solicitacao_escritorio_id") REFERENCES "solicitacoes_escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
