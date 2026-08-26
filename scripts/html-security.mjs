import { parse } from 'parse5';

export function inspectHtml(html) {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const scripts = [];
  const eventHandlers = [];

  function visit(node) {
    const attributes = new Map((node.attrs || []).map(attribute => [attribute.name, attribute.value]));
    const location = node.sourceCodeLocation;

    for (const name of attributes.keys()) {
      if (!name.startsWith('on')) continue;
      eventHandlers.push({
        name,
        line: location?.attrs?.[name]?.startLine || location?.startLine || 1,
      });
    }

    if (node.nodeName === 'script') {
      const body = location?.startTag && location?.endTag
        ? html.slice(location.startTag.endOffset, location.endTag.startOffset)
        : (node.childNodes || []).map(child => child.value || '').join('');
      scripts.push({
        body,
        hasSrc: attributes.has('src'),
        line: location?.startLine || 1,
        type: (attributes.get('type') || '').trim().toLowerCase(),
      });
    }

    for (const child of node.childNodes || []) visit(child);
  }

  visit(document);
  return { eventHandlers, scripts };
}
