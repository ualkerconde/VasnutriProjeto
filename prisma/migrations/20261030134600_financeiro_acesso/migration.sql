-- Todo perfil lança as próprias despesas; quem gere usuários vê o financeiro e os indicadores.
INSERT INTO "perfil_permissoes" ("perfil_id", "modulo")
SELECT "id", 'DESPESAS'::"Modulo" FROM "perfis"
ON CONFLICT DO NOTHING;

INSERT INTO "perfil_permissoes" ("perfil_id", "modulo")
SELECT DISTINCT "perfil_id", m."modulo" FROM "perfil_permissoes"
CROSS JOIN (VALUES ('FINANCEIRO'::"Modulo"), ('INDICADORES'::"Modulo")) AS m("modulo")
WHERE "perfil_permissoes"."modulo" = 'USUARIOS'
ON CONFLICT DO NOTHING;

-- Categorias iniciais (editáveis em Cadastros).
INSERT INTO "categorias_despesa" ("id", "nome") VALUES
  (gen_random_uuid(), 'Combustível'),
  (gen_random_uuid(), 'Alimentação'),
  (gen_random_uuid(), 'Hospedagem'),
  (gen_random_uuid(), 'Pedágio e estacionamento'),
  (gen_random_uuid(), 'Material'),
  (gen_random_uuid(), 'Outros')
ON CONFLICT DO NOTHING;
