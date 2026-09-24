// Tiny DOM helpers for HUD markup (all markup strings are static, authored in this codebase).

export function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

// Collect [data-ref="name"] children into an object.
export function refs(root) {
  const out = {};
  for (const node of root.querySelectorAll('[data-ref]')) out[node.dataset.ref] = node;
  return out;
}

// Write only when the value changes (avoids layout work every frame).
export function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
