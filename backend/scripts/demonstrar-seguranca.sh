#!/usr/bin/env bash
# ----------------------------------------------------------------------
# Demonstração manual dos testes de segurança (evidências do relatório).
#
# Pré-requisitos: servidor rodando (npm start), curl e node no PATH.
# No Windows, execute no Git Bash:   bash scripts/demonstrar-seguranca.sh
#
# Usa o administrador definido no .env (ADMIN_EMAIL / ADMIN_SENHA) e cria
# um jogador descartável. Nenhuma credencial fica escrita neste arquivo.
# Atenção: o teste 7 aciona o rate limit do login por 15 minutos
# (reinicie o servidor para liberar).
# ----------------------------------------------------------------------
cd "$(dirname "$0")/.." || exit 1
set -a; . ./.env; set +a
B=http://localhost:${PORT:-3000}/api
H='Content-Type: application/json'
js(){ node -pe "JSON.parse(require('fs').readFileSync(0)).$1"; }
sessao(){ local j=$1; curl -s -c $j -b $j $B/auth/sessao | js dados.csrfToken; }
login(){ local j=$1 t=$2; curl -s -c $j -b $j -X POST $B/auth/login -H "$H" -H "X-CSRF-Token: $t" -d "{\"email\":\"$3\",\"senha\":\"$4\"}" | js dados.csrfToken; }
mostra(){ echo "\$ $1"; }
fmt(){ node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=s.lastIndexOf("\nHTTP ");const corpo=s.slice(0,i),st=s.slice(i+1);try{const o=JSON.parse(corpo);if(o.erro)delete o.erro.requisicaoId;console.log(JSON.stringify(o,null,1).split("\n").slice(0,14).join("\n"))}catch{if(corpo)console.log(corpo)}console.log(st)})'; }
c(){ curl -s -w "\nHTTP %{http_code}" "$@" | fmt; }

JV=$(mktemp); JJ=$(mktemp); JA=$(mktemp)
TV=$(sessao $JV); TJ=$(sessao $JJ); TA=$(sessao $JA)
SUFIXO=$(date +%s)
JOG_EMAIL="jogador.demo.$SUFIXO@teste.local"; JOG_SENHA="demo${SUFIXO}x"
curl -s -o /dev/null -c $JJ -b $JJ -X POST $B/auth/registro -H "$H" -H "X-CSRF-Token: $TJ" \
  -d "{\"nome\":\"Jogador Demo\",\"email\":\"$JOG_EMAIL\",\"senha\":\"$JOG_SENHA\"}"
TJ=$(login $JJ $TJ "$JOG_EMAIL" "$JOG_SENHA"); TA=$(login $JA $TA "$ADMIN_EMAIL" "$ADMIN_SENHA")

echo "=== TESTE 1: SQL Injection no login ==="
mostra "curl -X POST $B/auth/login -d '{\"email\":\"$ADMIN_EMAIL'\'' OR '\''1'\''='\''1'\'' --\",\"senha\":\"x\"}'"
c -b $JV -X POST $B/auth/login -H "$H" -H "X-CSRF-Token: $TV" -d "{\"email\":\"$ADMIN_EMAIL' OR '1'='1' --\",\"senha\":\"x\"}"
mostra "curl -X POST $B/auth/login -d '{\"email\":\"$ADMIN_EMAIL'\''--\",\"senha\":\"'\'' OR '\''1'\''='\''1\"}'   # passa na validação e chega ao banco"
c -b $JV -X POST $B/auth/login -H "$H" -H "X-CSRF-Token: $TV" -d "{\"email\":\"$ADMIN_EMAIL'--\",\"senha\":\"' OR '1'='1\"}"
echo
echo "=== TESTE 1b: SQL Injection na busca de chefes ==="
mostra "curl \"$B/chefes?busca=';%20DROP%20TABLE%20chefes;%20--\""
c "$B/chefes?busca=%27%3B%20DROP%20TABLE%20chefes%3B%20--"
mostra "curl \"$B/chefes?limite=1\"   # a tabela continua intacta"
curl -s "$B/chefes?limite=1" | node -pe 'const o=JSON.parse(require("fs").readFileSync(0));"total de chefes: "+o.paginacao.total'
echo
echo "=== TESTE 2: XSS (armazenado e refletido) ==="
mostra "curl -X POST $B/taticas -d '{\"chefeId\":19,\"conteudo\":\"<script>alert(document.cookie)</script> Fique no meio da tela.\"}'"
c -b $JJ -X POST $B/taticas -H "$H" -H "X-CSRF-Token: $TJ" -d '{"chefeId":19,"conteudo":"<script>alert(document.cookie)</script> Fique no meio da tela na última fase."}'
mostra "curl -i \"$B/chefes?busca=<img src=x onerror=alert(1)>\"   # cabeçalhos"
curl -s -D - -o /dev/null "$B/chefes?busca=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E" | grep -iE "^HTTP|content-type|x-content-type|content-security" | sed 's/\r//'
echo
echo "=== TESTE 3: CSRF (requisição sem o token) ==="
mostra "curl -b cookies_jogador.txt -X POST $B/taticas -d '{...}'   # sem X-CSRF-Token"
c -b $JJ -X POST $B/taticas -H "$H" -d '{"chefeId":1,"conteudo":"Requisição forjada por outro site."}'
echo
echo "=== TESTE 4: Acesso sem login ==="
mostra "curl $B/taticas/minhas"
c $B/taticas/minhas
echo
echo "=== TESTE 5: Perfil insuficiente (jogador tentando ação de admin) ==="
mostra "curl -b cookies_jogador.txt -X DELETE $B/chefes/1 -H 'X-CSRF-Token: <token>'"
c -b $JJ -X DELETE $B/chefes/1 -H "X-CSRF-Token: $TJ"
mostra "curl -b cookies_jogador.txt $B/usuarios"
c -b $JJ $B/usuarios
echo
echo "=== TESTE 6: Reutilização de sessão após logout ==="
cp $JA $JA.antigo
mostra "curl -b cookies_admin.txt -X POST $B/auth/logout -H 'X-CSRF-Token: <token>'"
c -b $JA -c $JA -X POST $B/auth/logout -H "X-CSRF-Token: $TA"
mostra "curl -b cookies_admin_ANTIGO.txt $B/usuarios   # mesmo cookie de antes do logout"
c -b $JA.antigo $B/usuarios
echo
echo "=== TESTE 7: Rate limiting (força bruta no login) ==="
echo "# limite: 5 falhas por IP a cada 15 min; as 2 tentativas do Teste 1 já contaram"
JR=$(mktemp); TR=$(sessao $JR)
for i in 1 2 3 4 5 6; do
  printf "tentativa %s -> " $i
  curl -s -o /dev/null -w "HTTP %{http_code}\n" -b $JR -c $JR -X POST $B/auth/login -H "$H" -H "X-CSRF-Token: $TR" -d "{\"email\":\"$ADMIN_EMAIL\",\"senha\":\"chute123\"}"
done
c -b $JR -X POST $B/auth/login -H "$H" -H "X-CSRF-Token: $TR" -d "{\"email\":\"$ADMIN_EMAIL\",\"senha\":\"chute123\"}"
