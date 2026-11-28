for (const root of document.querySelectorAll<HTMLElement>('[data-carousel]')) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-dot]'));
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  const pause = root.querySelector<HTMLButtonElement>('[data-pause]');
  let active = 0;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer: number | undefined;
  let startX: number | undefined;
  let swiped = false;

  function render() {
    const width = window.innerWidth;
    const near = width <= 600 ? 195 : width <= 1024 ? 310 : 390;
    const far = width <= 600 ? 330 : width <= 1024 ? 540 : 690;
    cards.forEach((card, index) => {
      let offset = index - active;
      if (offset > cards.length / 2) offset -= cards.length;
      if (offset < -cards.length / 2) offset += cards.length;
      const distance = Math.abs(offset);
      const shift = [0, near, far][distance] ?? far + 150;
      const scale = [1, 0.78, 0.6][distance] ?? 0.5;
      const opacity = [1, 0.85, width <= 600 ? 0 : 0.5][distance] ?? 0;
      card.style.transform = 'translate(-50%, -50%) translateX(' + Math.sign(offset) * shift + 'px) scale(' + scale + ')';
      card.style.opacity = String(opacity);
      card.style.zIndex = String([20, 15, 10][distance] ?? 1);
      card.style.pointerEvents = opacity > 0 ? 'auto' : 'none';
      card.setAttribute('aria-hidden', String(index !== active));
    });
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === active);
      dot.setAttribute('aria-current', String(index === active));
    });
    pause?.setAttribute('aria-pressed', String(paused));
    pause?.setAttribute('aria-label', paused ? 'เล่นสไลด์อัตโนมัติ' : 'หยุดสไลด์อัตโนมัติ');
    if (pause) pause.textContent = paused ? '▶' : 'Ⅱ';
  }

  function select(index: number) {
    active = (index + cards.length) % cards.length;
    render();
  }
  function restart() {
    window.clearInterval(timer);
    if (!paused && cards.length > 1 && !document.hidden && startX === undefined) {
      timer = window.setInterval(() => select(active + 1), 4000);
    }
  }
  function go(index: number) { select(index); restart(); }
  root.querySelector('[data-prev]')?.addEventListener('click', () => go(active - 1));
  root.querySelector('[data-next]')?.addEventListener('click', () => go(active + 1));
  pause?.addEventListener('click', () => { paused = !paused; render(); restart(); });
  dots.forEach((dot, index) => dot.addEventListener('click', () => go(index)));
  cards.forEach((card, index) => card.addEventListener('click', () => { if (!swiped) go(index); }));
  root.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'touch') root.setAttribute('data-touch-controls', '');
  });
  stage?.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest('button')) return;
    startX = event.clientX;
    swiped = false;
    restart();
  });
  window.addEventListener('pointerup', (event) => {
    if (!event.isPrimary || startX === undefined) return;
    const delta = startX - event.clientX;
    startX = undefined;
    swiped = Math.abs(delta) > 40;
    if (swiped) select(active + (delta > 0 ? 1 : -1));
    restart();
  });
  window.addEventListener('pointercancel', () => { startX = undefined; restart(); });
  window.addEventListener('resize', render);
  document.addEventListener('visibilitychange', restart);
  render();
  restart();
}
