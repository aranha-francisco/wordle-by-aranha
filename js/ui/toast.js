const el = () => document.getElementById('toast');
let timer = null;

export function toast(message, ms = 1200) {
  const node = el();
  if (!node) return;
  node.textContent = message;
  node.dataset.show = 'true';
  clearTimeout(timer);
  timer = setTimeout(() => { node.dataset.show = 'false'; }, ms);
}
