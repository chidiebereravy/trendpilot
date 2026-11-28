function createId() {
  return globalThis.crypto.randomUUID();
}

function createTextContent(text) {
  return text ? [{ type: "text", text }] : [];
}

function convertLegacyBlock(block) {
  const id = block.id || createId();

  if (block.type === "paragraph") {
    return {
      type: "paragraph",
      attrs: { id },
      content: createTextContent(block.text || ""),
    };
  }

  if (block.type === "heading") {
    return {
      type: "heading",
      attrs: {
        id,
        level: block.level === "h3" ? 3 : 2,
      },
      content: createTextContent(block.text || ""),
    };
  }

  if (block.type === "quote") {
    return {
      type: "blockquote",
      attrs: { id },
      content: [
        {
          type: "paragraph",
          content: createTextContent(block.text || ""),
        },
      ],
    };
  }

  if (block.type === "list") {
    return {
      type: block.style === "number" ? "orderedList" : "bulletList",
      attrs: { id },
      content: (block.items || []).map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: createTextContent(item),
          },
        ],
      })),
    };
  }

  return {
    ...block,
    attrs: {
      ...(block.attrs || {}),
      id: block.attrs?.id || id,
    },
  };
}

export function normalizeArticleContent(content) {
  const blocks = Array.isArray(content?.content) ? content.content : [];

  const usedIds = new Set();

  const normalizedBlocks = blocks.map((block) => {
    const isLegacyBlock =
      (block.type === "paragraph" && typeof block.text === "string") ||
      (block.type === "heading" && typeof block.text === "string") ||
      (block.type === "quote" && typeof block.text === "string") ||
      (block.type === "list" && Array.isArray(block.items));

    const normalized = isLegacyBlock
      ? convertLegacyBlock(block)
      : {
          ...block,
          attrs: {
            ...(block.attrs || {}),
            id: block.attrs?.id || block.id || createId(),
          },
        };

    const candidateId = normalized.attrs?.id || normalized.id;

    let uniqueId = candidateId;

    if (!uniqueId || usedIds.has(uniqueId)) {
      uniqueId = createId();

      while (usedIds.has(uniqueId)) {
        uniqueId = createId();
      }
    }

    usedIds.add(uniqueId);

    const result = {
      ...normalized,
      attrs: {
        ...(normalized.attrs || {}),
        id: uniqueId,
      },
    };

    delete result.id;

    return result;
  });

  return {
    type: "doc",
    version: 2,
    content: normalizedBlocks,
  };
}
export function stripEditorOnlyAttributes(document) {
  const copy = JSON.parse(JSON.stringify(document));

  function clean(node) {
    if (!node || typeof node !== "object") return;

    if (node.attrs) {
      delete node.attrs.previewUrl;
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(clean);
    }
  }

  clean(copy);

  return copy;
}

export function getArticleWordCount(document) {
  const words = [];

  function visit(node) {
    if (!node || typeof node !== "object") return;

    if (typeof node.text === "string") {
      words.push(node.text);
    }

    if (node.type === "faqSection" && Array.isArray(node.attrs?.items)) {
      node.attrs.items.forEach((item) => {
        words.push(item.question || "");
        words.push(item.answer || "");
      });
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  }

  visit(document);

  const text = words.join(" ").trim();

  return text ? text.split(/\s+/).length : 0;
}
