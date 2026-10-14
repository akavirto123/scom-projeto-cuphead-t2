/**
 * Validação e sanitização de entradas externas (body, query e params).
 *
 * Cada esquema descreve os campos aceitos. Campos não descritos no esquema
 * são descartados (proteção contra "mass assignment": um usuário não
 * consegue, por exemplo, enviar "perfil": "admin" no cadastro).
 *
 * Regras de cada campo:
 *   tipo         'texto' | 'inteiro' | 'email' | 'senha' | 'opcao'
 *   obrigatorio  true/false
 *   forte        (senha) exige 8+ caracteres com letras e números
 *   min / max    tamanho (texto) ou intervalo (inteiro)
 *   multilinha   permite quebras de linha (padrão: false)
 *   opcoes       valores aceitos (tipo 'opcao')
 *   padrao       valor usado quando o campo vem vazio
 *
 * Se houver qualquer erro, lança AppError 422 com a lista
 * [{ campo, mensagem }].
 */
import { AppError } from './AppError.js';

// Caracteres de controle (exceto \t e \n) e caracteres invisíveis de
// formatação usados para disfarçar conteúdo.
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠﻿]/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INTEIRO = /^-?\d{1,9}$/;

/** Sanitização de texto livre: normaliza Unicode, remove controles e espaços extras. */
export function sanitizarTexto(valor, { multilinha = false } = {}) {
  let texto = valor.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROLE, '');
  if (multilinha) {
    texto = texto
      .split('\n')
      .map((linha) => linha.replace(/[ \t]+/g, ' ').trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  } else {
    texto = texto.replace(/\s+/g, ' ');
  }
  return texto.trim();
}

function vazio(valor) {
  return valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '');
}

const validadores = {
  texto(valor, regra) {
    if (typeof valor !== 'string') return { erro: 'deve ser um texto.' };
    const texto = sanitizarTexto(valor, regra);
    if (regra.min !== undefined && texto.length < regra.min) return { erro: `deve ter no mínimo ${regra.min} caracteres.` };
    if (regra.max !== undefined && texto.length > regra.max) return { erro: `deve ter no máximo ${regra.max} caracteres.` };
    return { valor: texto };
  },

  inteiro(valor, regra) {
    let numero = valor;
    if (typeof valor === 'string' && INTEIRO.test(valor.trim())) numero = Number(valor.trim());
    if (typeof numero !== 'number' || !Number.isInteger(numero)) return { erro: 'deve ser um número inteiro.' };
    if (regra.min !== undefined && numero < regra.min) return { erro: `deve ser maior ou igual a ${regra.min}.` };
    if (regra.max !== undefined && numero > regra.max) return { erro: `deve ser menor ou igual a ${regra.max}.` };
    return { valor: numero };
  },

  email(valor) {
    if (typeof valor !== 'string') return { erro: 'deve ser um texto.' };
    const email = valor.trim().toLowerCase();
    if (email.length > 254) return { erro: 'deve ter no máximo 254 caracteres.' };
    if (!EMAIL.test(email)) return { erro: 'deve ser um e-mail válido.' };
    return { valor: email };
  },

  // A senha NÃO é sanitizada nem aparada: qualquer caractere é permitido.
  // Máximo de 72 bytes porque o bcrypt ignora o que passar disso.
  senha(valor, regra) {
    if (typeof valor !== 'string') return { erro: 'deve ser um texto.' };
    if (Buffer.byteLength(valor, 'utf8') > 72) return { erro: 'deve ter no máximo 72 bytes.' };
    if (regra.forte) {
      if (valor.length < 8) return { erro: 'deve ter no mínimo 8 caracteres.' };
      if (!/[A-Za-z]/.test(valor) || !/\d/.test(valor)) return { erro: 'deve conter letras e números.' };
    }
    return { valor };
  },

  opcao(valor, regra) {
    if (typeof valor !== 'string' || !regra.opcoes.includes(valor.trim())) {
      return { erro: `deve ser um dos valores: ${regra.opcoes.join(', ')}.` };
    }
    return { valor: valor.trim() };
  },
};

export function validar(dados, esquema) {
  const entrada = dados !== null && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
  const valores = {};
  const erros = [];

  for (const [campo, regra] of Object.entries(esquema)) {
    const bruto = entrada[campo];

    if (vazio(bruto)) {
      if (regra.obrigatorio) erros.push({ campo, mensagem: 'é obrigatório.' });
      else if (regra.padrao !== undefined) valores[campo] = regra.padrao;
      continue;
    }

    const resultado = validadores[regra.tipo](bruto, regra);
    if (resultado.erro) erros.push({ campo, mensagem: resultado.erro });
    else valores[campo] = resultado.valor;
  }

  if (erros.length) throw AppError.validacao(erros);
  return valores;
}

/** Valida o parâmetro de rota :id. */
export function validarId(valor, campo = 'id') {
  return validar({ [campo]: valor }, { [campo]: { tipo: 'inteiro', obrigatorio: true, min: 1, max: 2147483647 } })[campo];
}

/** Esquema de paginação reutilizado pelas listagens (?pagina=&limite=). */
export function validarPaginacao(query, { limitePadrao = 10, limiteMaximo = 50 } = {}) {
  const { pagina, limite } = validar(query, {
    pagina: { tipo: 'inteiro', min: 1, max: 100000, padrao: 1 },
    limite: { tipo: 'inteiro', min: 1, max: limiteMaximo, padrao: limitePadrao },
  });
  return { pagina, limite, deslocamento: (pagina - 1) * limite };
}
