import { describe, expect, it } from "vitest";
import { capitalizar, cnpjValido, deBrasilApi, deReceitaWs } from "./cnpj";

describe("cnpj", () => {
  it("confere os dígitos verificadores", () => {
    expect(cnpjValido("00.000.000/0001-91")).toBe(true);
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cnpjValido("123")).toBe(false);
  });

  it("capitaliza mantendo preposições em minúsculas", () => {
    expect(capitalizar("RUA DAS FLORES DE SÃO JOÃO")).toBe("Rua das Flores de São João");
  });

  it("converte a resposta da BrasilAPI", () => {
    const dados = deBrasilApi({
      razao_social: "BANCO DO BRASIL SA",
      nome_fantasia: "DIRECAO GERAL",
      descricao_tipo_de_logradouro: "QUADRA",
      logradouro: "SAUN QUADRA 5 LOTE B TORRES I, II E III",
      numero: "SN",
      complemento: "  ",
      bairro: "ASA NORTE",
      municipio: "BRASILIA",
      uf: "df",
      cep: "70040912",
      descricao_situacao_cadastral: "ATIVA",
    });
    expect(dados).toEqual({
      razaoSocial: "BANCO DO BRASIL SA",
      nomeFantasia: "DIRECAO GERAL",
      logradouro: "Quadra Saun Quadra 5 Lote B Torres I, Ii e Iii",
      numero: "S/N",
      complemento: null,
      bairro: "Asa Norte",
      cidade: "Brasilia",
      uf: "DF",
      cep: "70040-912",
      situacao: "ATIVA",
    });
  });

  it("não repete o tipo do logradouro", () => {
    expect(deBrasilApi({ descricao_tipo_de_logradouro: "RUA", logradouro: "RUA XV" }).logradouro).toBe("Rua Xv");
  });

  it("converte a resposta da ReceitaWS", () => {
    const dados = deReceitaWs({ nome: "EMPRESA LTDA", fantasia: "", cep: "01.310-100", municipio: "SAO PAULO", situacao: "ATIVA" });
    expect(dados.razaoSocial).toBe("EMPRESA LTDA");
    expect(dados.nomeFantasia).toBeNull();
    expect(dados.cep).toBe("01310-100");
    expect(dados.cidade).toBe("Sao Paulo");
  });
});
