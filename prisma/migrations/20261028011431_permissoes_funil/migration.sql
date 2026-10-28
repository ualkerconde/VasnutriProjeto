-- CreateTable
CREATE TABLE "etapa_perfis" (
    "etapa_id" INTEGER NOT NULL,
    "perfil_id" UUID NOT NULL,

    CONSTRAINT "etapa_perfis_pkey" PRIMARY KEY ("etapa_id","perfil_id")
);

-- CreateTable
CREATE TABLE "campos_processo" (
    "chave" TEXT NOT NULL,
    "etapas_editaveis" INTEGER[],
    "sensivel" BOOLEAN NOT NULL DEFAULT false,
    "perfis_visiveis" UUID[],

    CONSTRAINT "campos_processo_pkey" PRIMARY KEY ("chave")
);

-- AddForeignKey
ALTER TABLE "etapa_perfis" ADD CONSTRAINT "etapa_perfis_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_perfis" ADD CONSTRAINT "etapa_perfis_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bancos que já existiam continuam como antes: todo perfil pode alterar processos em todas as etapas.
INSERT INTO "etapa_perfis" ("etapa_id", "perfil_id")
SELECT e."id", p."id" FROM "etapas" e CROSS JOIN "perfis" p
ON CONFLICT DO NOTHING;
