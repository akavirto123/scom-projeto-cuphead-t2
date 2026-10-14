/**
 * Efeitos visuais que respondem ao usuário.
 *
 * Só são ativados com mouse/caneta (hover real) e quando o sistema não pede
 * movimento reduzido. Sem eles, a página funciona exatamente igual.
 */
const permiteMovimento = window.matchMedia('(prefers-reduced-motion: no-preference)');
const temPonteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)');

/**
 * Inclina o elemento em 3D na direção do ponteiro, como uma carta segurada
 * na mão, e move um reflexo de luz (variáveis CSS --rx, --ry, --brilho-x/y).
 */
export function inclinarAoPassar(elemento, { maximo = 9 } = {}) {
  if (!permiteMovimento.matches || !temPonteiroFino.matches) return;

  elemento.addEventListener('pointermove', (evento) => {
    const caixa = elemento.getBoundingClientRect();
    const x = (evento.clientX - caixa.left) / caixa.width;
    const y = (evento.clientY - caixa.top) / caixa.height;
    elemento.style.setProperty('--ry', `${((x - 0.5) * 2 * maximo).toFixed(2)}deg`);
    elemento.style.setProperty('--rx', `${((0.5 - y) * 2 * maximo).toFixed(2)}deg`);
    elemento.style.setProperty('--brilho-x', `${(x * 100).toFixed(1)}%`);
    elemento.style.setProperty('--brilho-y', `${(y * 100).toFixed(1)}%`);
    elemento.classList.add('inclinado');
  });

  elemento.addEventListener('pointerleave', () => {
    elemento.classList.remove('inclinado');
    elemento.style.setProperty('--rx', '0deg');
    elemento.style.setProperty('--ry', '0deg');
  });
}

/** Gira a moeda (checkbox de conquista) uma vez, ao ser marcada pelo usuário. */
export function girarMoeda(caixa) {
  if (!permiteMovimento.matches) return;
  caixa.classList.remove('moeda-girando');
  // Força o navegador a reiniciar a animação se o usuário clicar rápido.
  void caixa.offsetWidth;
  caixa.classList.add('moeda-girando');
  caixa.addEventListener('animationend', () => caixa.classList.remove('moeda-girando'), { once: true });
}
