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

export default function ArticleDocument({ content, affiliatePlacements = {} }) {
  const blocks = Array.isArray(content?.content) ? content.content : [];

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
        const key = block.id || `${block.type}-${index}`;
        let renderedBlock = null;

        if (block.type === "paragraph") {
          renderedBlock = (
            <p className="mb-6 text-[16px] leading-[1.95] text-[#374151]">
              {block.text}
            </p>
          );
        } else if (block.type === "heading") {
          const Heading = block.level === "h3" ? "h3" : "h2";

          renderedBlock = (
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
        } else if (block.type === "quote") {
          renderedBlock = (
            <blockquote className="my-9 border-l-4 border-[#b99658] bg-[#f8f6f1] px-6 py-5 font-serif text-xl leading-relaxed text-[#14243d]">
              {block.text}
            </blockquote>
          );
        } else if (block.type === "list") {
          const List = block.style === "number" ? "ol" : "ul";

          renderedBlock = (
            <List
              className={`mb-7 space-y-3 pl-7 text-[16px] leading-[1.9] text-[#374151] ${
                block.style === "number" ? "list-decimal" : "list-disc"
              }`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{item}</li>
              ))}
            </List>
          );
        }

        if (!renderedBlock) return null;

        return (
          <div key={key}>
            {renderedBlock}
            <AffiliateRecommendation
              placement={block.id ? affiliatePlacements[block.id] : null}
            />
          </div>
        );
      })}
    </div>
  );
}
