/**
 * Efeitos visuais que respondem ao usuário.
 *
 * Só são ativados quando o sistema não pede movimento reduzido (e, no caso
 * da inclinação, com mouse ou caneta). Sem eles, a página funciona igual.
 */
const permiteMovimento = window.matchMedia('(prefers-reduced-motion: no-preference)');
const temPonteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)');

const REPOUSO = Object.freeze({ rx: 0, ry: 0, z: 0, bx: 50, by: 50 });

/**
 * Inclina o elemento em 3D na direção do ponteiro, como uma carta segurada
 * na mão. O movimento é suavizado (interpolação a cada quadro), então a
 * carta "segue" o mouse com um pouco de inércia em vez de tremer.
 * Atualiza as variáveis CSS --rx, --ry, --z, --brilho-x, --brilho-y,
 * --sombra-x e --sombra-y.
 */
export function inclinarAoPassar(elemento, { maximo = 14, elevacao = 40 } = {}) {
  if (!permiteMovimento.matches || !temPonteiroFino.matches) return;

  const alvo = { ...REPOUSO };
  const atual = { ...REPOUSO };
  let quadro = null;

  function aplicar() {
    elemento.style.setProperty('--rx', `${atual.rx.toFixed(2)}deg`);
    elemento.style.setProperty('--ry', `${atual.ry.toFixed(2)}deg`);
    elemento.style.setProperty('--z', `${atual.z.toFixed(1)}px`);
    elemento.style.setProperty('--brilho-x', `${atual.bx.toFixed(1)}%`);
    elemento.style.setProperty('--brilho-y', `${atual.by.toFixed(1)}%`);
    // A sombra vai para o lado oposto da inclinação, como se a luz viesse de cima.
    elemento.style.setProperty('--sombra-x', `${(-atual.ry * 1.6).toFixed(1)}px`);
    elemento.style.setProperty('--sombra-y', `${(14 + atual.rx * 1.2 + atual.z * 0.35).toFixed(1)}px`);
  }

  function passo() {
    let emMovimento = false;
    for (const chave of Object.keys(atual)) {
      const diferenca = alvo[chave] - atual[chave];
      atual[chave] += diferenca * 0.14;
      if (Math.abs(diferenca) > 0.05) emMovimento = true;
    }
    aplicar();
    if (emMovimento) {
      quadro = requestAnimationFrame(passo);
    } else {
      quadro = null;
      if (alvo.z === 0) elemento.classList.remove('inclinado');
    }
  }

  const animar = () => { quadro ??= requestAnimationFrame(passo); };

  elemento.addEventListener('pointerenter', () => {
    elemento.classList.add('inclinado');
    alvo.z = elevacao;
    animar();
  });

  elemento.addEventListener('pointermove', (evento) => {
    const caixa = elemento.getBoundingClientRect();
    const x = (evento.clientX - caixa.left) / caixa.width;
    const y = (evento.clientY - caixa.top) / caixa.height;
    alvo.ry = (x - 0.5) * 2 * maximo;
    alvo.rx = (0.5 - y) * 2 * maximo;
    alvo.bx = x * 100;
    alvo.by = y * 100;
    animar();
  });

  elemento.addEventListener('pointerleave', () => {
    Object.assign(alvo, REPOUSO);
    animar();
  });
}

/**
 * "Distribui" as cartas: cada uma entra virada para baixo e gira até mostrar
 * a frente, uma depois da outra. Acontece ao carregar, filtrar ou trocar de
 * página, ou seja, sempre como resposta a uma ação.
 */
export function distribuirCartas(cartas) {
  if (!permiteMovimento.matches) return;
  cartas.forEach((carta, ordem) => {
    carta.style.setProperty('--ordem', ordem);
    carta.classList.add('distribuindo');
    carta.addEventListener('animationend', (evento) => {
      if (evento.animationName === 'carta-vira') carta.classList.remove('distribuindo');
    });
  });
}

/** Moeda (checkbox de conquista) pula girando e quica ao ser marcada. */
export function girarMoeda(caixa) {
  if (!permiteMovimento.matches) return;
  caixa.classList.remove('moeda-girando');
  // Força o navegador a reiniciar a animação se o usuário clicar rápido.
  void caixa.offsetWidth;
  caixa.classList.add('moeda-girando');
  caixa.addEventListener('animationend', () => caixa.classList.remove('moeda-girando'), { once: true });
}
