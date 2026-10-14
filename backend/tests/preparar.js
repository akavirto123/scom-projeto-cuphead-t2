// Carregado antes de cada arquivo de teste (node --import): garante que a
// configuração use o banco de testes (DB_NAME_TEST) e o log de testes.
process.env.NODE_ENV = 'test';
