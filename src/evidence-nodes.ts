const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
const heading = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
const control = 'a[href],button,[role~="button" i],[role~="tab" i]';

// A proof includes the fixed nodes that identify its headings and control
// relationships. This reads node identity/structure only, never editable values
// or body text. Equal-looking replacement is still a different source node.
export function evidenceNodes(dependencies: readonly Element[], fixedNames: readonly Element[] = []): Element[] | undefined {
  const decorations: Element[] = [];
  const parents: Element[] = [];
  const named = new Set(fixedNames);
  for (const node of dependencies) {
    if (node.matches(control)) {
      if (node.parentElement) parents.push(node.parentElement);
      const item = node.closest('li');
      if (item) parents.push(item);
    }
    if (!node.matches(heading) && !named.has(node)) continue;
    const pending = [...node.children];
    let visited = 0;
    while (pending.length) {
      const child = pending.pop()!;
      if (++visited > 64 || decorations.length >= 256) return;
      if (child.closest(editable)) continue;
      decorations.push(child);
      pending.push(...child.children);
    }
  }
  return [...new Set([...dependencies, ...parents, ...decorations])];
}
