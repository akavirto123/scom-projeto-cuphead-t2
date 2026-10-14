/**
 * Tratamento centralizado de erros.
 *
 * Toda falha da aplicação termina aqui e vira uma resposta JSON no formato:
 *
 *   { "erro": { "status", "codigo", "mensagem", "detalhes"?, "requisicaoId",
 *               "tecnico"? } }
 *
 * O bloco "tecnico" (nome, mensagem original e stack trace) só é incluído
 * quando NODE_ENV=development, e apenas para erros inesperados. Em produção o cliente recebe apenas a
 * mensagem legível e o id da requisição, que permite achar o erro no log.
 */
import { AppError } from '../utils/AppError.js';

/** Converte erros conhecidos (body-parser, PostgreSQL) em AppError. */
function normalizar(erro) {
  if (erro instanceof AppError) return erro;

  if (erro.type === 'entity.parse.failed') {
    return new AppError(400, 'JSON_INVALIDO', 'O corpo da requisição não é um JSON válido.');
  }
  if (erro.type === 'entity.too.large') {
    return new AppError(413, 'CORPO_MUITO_GRANDE', 'O corpo da requisição excede o tamanho permitido.');
  }

  // Violações de constraint do PostgreSQL (última linha de defesa:
  // os services já validam antes de chegar ao banco).
  switch (erro.code) {
    case '23505':
      return AppError.conflito('Já existe um registro com esses dados.');
    case '23503':
      return AppError.conflito('Operação viola uma referência entre registros.');
    case '23514':
    case '22001':
    case '22P02':
      return AppError.validacao([{ campo: erro.column ?? null, mensagem: 'Valor rejeitado pelas regras do banco de dados.' }]);
    default:
      return null;
  }
}

export function rotaNaoEncontrada(req, res, next) {
  next(new AppError(404, 'ROTA_NAO_ENCONTRADA', 'A rota solicitada não existe.'));
}

export function criarTratadorDeErros({ logger, emDesenvolvimento }) {
  // O Express reconhece um tratador de erros pela assinatura de 4 parâmetros.
  return (erro, req, res, next) => {
    const conhecido = normalizar(erro);
    const status = conhecido?.status ?? 500;

    if (!conhecido) {
      logger.erro('erro.interno', {
        requisicaoId: req.id,
        metodo: req.method,
        rota: req.path,
        usuarioId: req.usuario?.id ?? null,
        mensagem: erro.message,
        stack: erro.stack,
      });
    }

    const corpo = {
      status,
      codigo: conhecido?.codigo ?? 'ERRO_INTERNO',
      mensagem: conhecido?.message ?? 'Ocorreu um erro interno. Tente novamente mais tarde.',
      requisicaoId: req.id,
    };
    if (conhecido?.detalhes) corpo.detalhes = conhecido.detalhes;

    // Erros esperados (AppError) não precisam de stack; os demais sim.
    if (emDesenvolvimento && !(erro instanceof AppError)) {
      corpo.tecnico = { nome: erro.name, mensagem: erro.message, codigoBanco: erro.code, stack: erro.stack?.split('\n') };
    }

    res.status(status).json({ erro: corpo });
  };
}
