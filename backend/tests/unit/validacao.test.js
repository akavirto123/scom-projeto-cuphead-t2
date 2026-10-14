import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizarTexto, validar, validarId, validarPaginacao } from '../../src/utils/validacao.js';
import { esquemaRegistro } from '../../src/validators/authEsquemas.js';
import { esquemaChefe } from '../../src/validators/chefeEsquemas.js';

const capturar = (fn) => {
  try {
    fn();
  } catch (erro) {
    return erro;
  }
  assert.fail('era esperado um erro de validação');
};

describe('Validação e sanitização de entradas', () => {
  it('sanitiza texto: remove caracteres de controle e espaços repetidos', () => {
    assert.equal(sanitizarTexto('  Hilda\u0000   Berg​  '), 'Hilda Berg');
  });

  it('preserva quebras de linha em campos multilinha', () => {
    assert.equal(sanitizarTexto('Fase 1\r\n\r\n\r\n\r\nFase  2', { multilinha: true }), 'Fase 1\n\nFase 2');
  });

  it('aceita um cadastro válido e normaliza o e-mail', () => {
    const dados = validar({ nome: ' Mugman ', email: ' MUG@Man.com ', senha: 'xicara123' }, esquemaRegistro);
    assert.deepEqual(dados, { nome: 'Mugman', email: 'mug@man.com', senha: 'xicara123' });
  });

  it('descarta campos fora do esquema (mass assignment)', () => {
    const dados = validar({ nome: 'Mugman', email: 'mug@man.com', senha: 'xicara123', perfil: 'admin' }, esquemaRegistro);
    assert.equal('perfil' in dados, false);
  });

  it('rejeita tipos e tamanhos inválidos com erros por campo', () => {
    const erro = capturar(() => validar({ nome: 42, email: 'invalido', senha: 'curta' }, esquemaRegistro));
    assert.equal(erro.status, 422);
    assert.equal(erro.codigo, 'VALIDACAO');
    assert.deepEqual(erro.detalhes.map((d) => d.campo), ['nome', 'email', 'senha']);
  });

  it('exige senha com letras e números', () => {
    const erro = capturar(() => validar({ nome: 'Mugman', email: 'mug@man.com', senha: 'somenteletras' }, esquemaRegistro));
    assert.match(erro.detalhes[0].mensagem, /letras e números/);
  });

  it('converte inteiros vindos como texto e valida o intervalo', () => {
    const chefe = { nome: 'Novo', fase: 'Fase', ilhaId: '2', estrategia: 'Estratégia com mais de vinte letras.', dificuldade: '5' };
    assert.equal(validar(chefe, esquemaChefe).ilhaId, 2);
    const erro = capturar(() => validar({ ...chefe, dificuldade: 6 }, esquemaChefe));
    assert.equal(erro.detalhes[0].campo, 'dificuldade');
  });

  it('rejeita id de rota que não é inteiro positivo (ex.: tentativa de injeção)', () => {
    assert.equal(validarId('15'), 15);
    assert.equal(capturar(() => validarId('1 OR 1=1')).status, 422);
    assert.equal(capturar(() => validarId('0')).status, 422);
  });

  it('aplica padrões e limites de paginação', () => {
    assert.deepEqual(validarPaginacao({}), { pagina: 1, limite: 10, deslocamento: 0 });
    assert.deepEqual(validarPaginacao({ pagina: '3', limite: '5' }), { pagina: 3, limite: 5, deslocamento: 10 });
    assert.equal(capturar(() => validarPaginacao({ limite: '1000' })).status, 422);
  });
});
