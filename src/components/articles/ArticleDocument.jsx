export default function ArticleDocument({ content }) {
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
        const key = `${block.type}-${index}`;

        if (block.type === "paragraph") {
          return (
            <p
              key={key}
              className="mb-6 text-[16px] leading-[1.95] text-[#374151]"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === "heading") {
          const Heading = block.level === "h3" ? "h3" : "h2";

          return (
            <Heading
              key={key}
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
            <blockquote
              key={key}
              className="my-9 border-l-4 border-[#b99658] bg-[#f8f6f1] px-6 py-5 font-serif text-xl leading-relaxed text-[#14243d]"
            >
              {block.text}
            </blockquote>
          );
        }

        if (block.type === "list") {
          const List = block.style === "number" ? "ol" : "ul";

          return (
            <List
              key={key}
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

        return null;
      })}
    </div>
  );
}
