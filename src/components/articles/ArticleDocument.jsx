import Image from "next/image";
import Link from "next/link";

function AffiliateRecommendation({ placement }) {
  if (!placement) return null;

  return (
    <p className="my-5 text-sm leading-relaxed text-gray-600">
      <span className="mr-2 text-xs font-medium text-[#9b7842]">
        {placement.disclosureLabel || "Affiliate link"}
      </span>

      <Link
        href={placement.href}
        rel="sponsored nofollow"
        className="font-semibold text-[#14243d] underline decoration-[#b99658] decoration-1 underline-offset-4 transition-colors hover:text-[#b99658]"
      >
        {placement.title}
      </Link>

      {placement.description && (
        <span className="ml-1">{placement.description}</span>
      )}
    </p>
  );
}

function getNodeId(node, index) {
  return node.attrs?.id || node.id || `${node.type}-${index}`;
}

function renderMarks(children, marks = [], key = "text") {
  return marks.reduceRight((content, mark, index) => {
    const markKey = `${key}-mark-${index}`;

    switch (mark.type) {
      case "bold":
        return <strong key={markKey}>{content}</strong>;

      case "italic":
        return <em key={markKey}>{content}</em>;

      case "underline":
        return <u key={markKey}>{content}</u>;

      case "strike":
        return <s key={markKey}>{content}</s>;

      case "code":
        return (
          <code
            key={markKey}
            className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-[#14243d]"
          >
            {content}
          </code>
        );

      case "link": {
        const href = mark.attrs?.href;

        if (
          typeof href !== "string" ||
          (!(href.startsWith("/") && !href.startsWith("//")) &&
            !/^https?:\/\//i.test(href) &&
            !/^mailto:/i.test(href))
        ) {
          return content;
        }

        const external = /^https?:\/\//i.test(href);

        return (
          <a
            key={markKey}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="font-medium text-[#14243d] underline decoration-[#b99658] underline-offset-4 transition-colors hover:text-[#b99658]"
          >
            {content}
          </a>
        );
      }

      default:
        return content;
    }
  }, children);
}

function renderInlineContent(nodes = [], parentKey = "inline") {
  return nodes.map((node, index) => {
    const key = `${parentKey}-${index}`;

    if (node.type === "text") {
      return (
        <span key={key}>{renderMarks(node.text || "", node.marks, key)}</span>
      );
    }

    if (node.type === "hardBreak") {
      return <br key={key} />;
    }

    return <span key={key}>{renderNode(node, key)}</span>;
  });
}

function renderTable(node, key) {
  const rows = node.content || [];

  return (
    <div
      key={key}
      className="my-8 w-full overflow-x-auto rounded-sm border border-gray-200"
    >
      <table className="w-full border-collapse text-left text-sm">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={`${key}-row-${rowIndex}`}
              className="border-b border-gray-200 last:border-0"
            >
              {(row.content || []).map((cell, cellIndex) => {
                const isHeader = cell.type === "tableHeader";
                const Cell = isHeader ? "th" : "td";

                return (
                  <Cell
                    key={`${key}-cell-${rowIndex}-${cellIndex}`}
                    colSpan={cell.attrs?.colspan || 1}
                    rowSpan={cell.attrs?.rowspan || 1}
                    className={
                      isHeader
                        ? "bg-[#f6f1e7] px-4 py-3 font-semibold text-[#14243d]"
                        : "px-4 py-3 leading-7 text-[#374151]"
                    }
                  >
                    {renderInlineContent(
                      cell.content?.flatMap(
                        (paragraph) => paragraph.content || [],
                      ) || [],
                      `${key}-${rowIndex}-${cellIndex}`,
                    )}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderFaqSection(node, key) {
  const items = Array.isArray(node.attrs?.items) ? node.attrs.items : [];

  if (!items.length) return null;

  return (
    <section key={key} className="my-10 border-t border-gray-200 pt-7">
      <h2 className="mb-5 text-2xl font-bold tracking-tight text-[#14243d]">
        Frequently Asked Questions
      </h2>

      <div className="divide-y divide-gray-200">
        {items.map((item, index) => (
          <details key={`${key}-faq-${index}`} className="group py-5">
            <summary className="cursor-pointer list-none pr-6 text-base leading-7 font-semibold text-[#14243d] marker:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl text-[#b99658] transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>

            <div className="mt-3 text-[15px] leading-[1.9] whitespace-pre-line text-[#4b5563]">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function renderNode(node, key) {
  if (!node) return null;

  const children = node.content || [];

  switch (node.type) {
    case "doc":
      return children.map((child, index) =>
        renderNode(child, `${key}-${index}`),
      );

    case "paragraph":
      return (
        <p key={key} className="mb-6 text-[16px] leading-[1.95] text-[#374151]">
          {renderInlineContent(children, key)}
        </p>
      );

    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      const Heading = level === 3 ? "h3" : "h2";

      return (
        <Heading
          key={key}
          className={
            level === 3
              ? "mt-9 mb-4 text-xl font-bold tracking-tight text-[#14243d]"
              : "mt-12 mb-5 text-2xl font-bold tracking-tight text-[#14243d] sm:text-3xl"
          }
        >
          {renderInlineContent(children, key)}
        </Heading>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-9 border-l-4 border-[#b99658] bg-[#f8f6f1] px-6 py-5 font-serif text-xl leading-relaxed text-[#14243d]"
        >
          {children.map((child, index) => renderNode(child, `${key}-${index}`))}
        </blockquote>
      );

    case "bulletList":
    case "orderedList": {
      const List = node.type === "orderedList" ? "ol" : "ul";

      return (
        <List
          key={key}
          className={`mb-7 space-y-3 pl-7 text-[16px] leading-[1.9] text-[#374151] ${
            node.type === "orderedList" ? "list-decimal" : "list-disc"
          }`}
        >
          {children.map((item, index) => renderNode(item, `${key}-${index}`))}
        </List>
      );
    }

    case "listItem":
      return (
        <li key={key}>
          {children.map((child, index) => renderNode(child, `${key}-${index}`))}
        </li>
      );

    case "horizontalRule":
      return (
        <hr key={key} className="my-10 border-0 border-t border-gray-200" />
      );

    case "table":
      return renderTable(node, key);

    case "image": {
      const src = node.attrs?.src;

      if (!src) return null;

      return (
        <figure key={key} className="my-9">
          <Image
            src={src}
            alt={node.attrs?.alt || ""}
            width={1600}
            height={1000}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto max-h-[650px] w-full rounded-sm object-contain"
          />

          {node.attrs?.caption && (
            <figcaption className="mt-3 text-center text-sm leading-6 text-gray-500">
              {node.attrs.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "faqSection":
      return renderFaqSection(node, key);

    default:
      return null;
  }
}

function renderLegacyBlock(block, key) {
  if (block.type === "paragraph") {
    return (
      <p className="mb-6 text-[16px] leading-[1.95] text-[#374151]">
        {block.text}
      </p>
    );
  }

  if (block.type === "heading") {
    const Heading = block.level === "h3" ? "h3" : "h2";

    return (
      <Heading
        className={
          block.level === "h3"
            ? "mt-9 mb-4 text-xl font-bold tracking-tight text-[#14243d]"
            : "mt-12 mb-5 text-2xl font-bold tracking-tight text-[#14243d] sm:text-3xl"
        }
      >
        {block.text}
      </Heading>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className="my-9 border-l-4 border-[#b99658] bg-[#f8f6f1] px-6 py-5 font-serif text-xl leading-relaxed text-[#14243d]">
        {block.text}
      </blockquote>
    );
  }

  if (block.type === "list") {
    const List = block.style === "number" ? "ol" : "ul";

    return (
      <List
        className={`mb-7 space-y-3 pl-7 text-[16px] leading-[1.9] text-[#374151] ${
          block.style === "number" ? "list-decimal" : "list-disc"
        }`}
      >
        {(block.items || []).map((item, index) => (
          <li key={`${key}-${index}`}>{item}</li>
        ))}
      </List>
    );
  }

  return null;
}

export default function ArticleDocument({
  content,
  title,
  affiliatePlacements = {},
}) {
  const blocks = Array.isArray(content?.content) ? content.content : [];
  const normalizedTitle = title?.trim().replace(/\s+/g, " ").toLowerCase();

  if (!blocks.length) {
    return (
      <p className="text-gray-500">
        This article does not have any published content yet.
      </p>
    );
  }

  return (
    <div className="article-document">
      {blocks.map((block, index) => {
        const key = `${getNodeId(block, index)}-${index}`;

        const headingText =
          block.type === "heading"
            ? (block.content || [])
                .map((node) => node.text || "")
                .join("")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase()
            : "";

        if (normalizedTitle && headingText === normalizedTitle && index > 0) {
          return null;
        }

        const isLegacy =
          (block.type === "paragraph" && typeof block.text === "string") ||
          (block.type === "heading" && typeof block.text === "string") ||
          (block.type === "quote" && typeof block.text === "string") ||
          (block.type === "list" && Array.isArray(block.items));

        const renderedBlock = isLegacy
          ? renderLegacyBlock(block, key)
          : renderNode(block, key);

        if (!renderedBlock) return null;

        const blockId = block.attrs?.id || block.id;

        return (
          <div key={key}>
            {renderedBlock}

            <AffiliateRecommendation
              placement={blockId ? affiliatePlacements[blockId] : null}
            />
          </div>
        );
      })}
    </div>
  );
}
