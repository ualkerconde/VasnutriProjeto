-- Quem já trabalha com visitas (ou é administrador) passa a ver o Planejamento.
INSERT INTO "perfil_permissoes" ("perfil_id", "modulo")
SELECT DISTINCT "perfil_id", 'PLANEJAMENTO'::"Modulo" FROM "perfil_permissoes" WHERE "modulo" IN ('VISITAS', 'USUARIOS')
ON CONFLICT DO NOTHING;

-- Itens iniciais do checklist da visita (o administrador muda em Cadastros).
INSERT INTO "checklist_visita_itens" ("id", "descricao", "ordem") VALUES
  (gen_random_uuid(), 'Registros de temperatura conferidos', 0),
  (gen_random_uuid(), 'Higienização dos setores conferida', 1),
  (gen_random_uuid(), 'Armazenamento e validades conferidos', 2),
  (gen_random_uuid(), 'Placas e pasta de visita conferidas', 3),
  (gen_random_uuid(), 'Orientação à equipe realizada', 4)
ON CONFLICT DO NOTHING;
