"use client";

import { useEffect, useState } from "react";
import {
  EditorContent,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "next/image";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";

const buttonClass =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 border border-[#e5e7eb] px-2 text-xs text-[#344054] transition hover:border-[#b99658] hover:bg-[#fcfaf6] disabled:opacity-40";

const blockTypes = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "image",
  "table",
  "horizontalRule",
  "faqSection",
];

const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: blockTypes,
        attributes: {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) =>
              attributes.id ? { "data-block-id": attributes.id } : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const transaction = newState.tr;
          const usedIds = new Set();
          let changed = false;

          newState.doc.forEach((node, position) => {
            if (!blockTypes.includes(node.type.name)) {
              return;
            }

            let id = node.attrs.id;

            if (typeof id !== "string" || !id || usedIds.has(id)) {
              id = globalThis.crypto.randomUUID();

              while (usedIds.has(id)) {
                id = globalThis.crypto.randomUUID();
              }

              transaction.setNodeMarkup(position, undefined, {
                ...node.attrs,
                id,
              });

              changed = true;
            }

            usedIds.add(id);
          });

          return changed ? transaction : null;
        },
      }),
    ];
  },
});

function MediaImageView({ node, deleteNode }) {
  const { alt, caption, previewUrl } = node.attrs;

  return (
    <NodeViewWrapper
      as="figure"
      className="my-6 rounded-sm border border-[#e8e9ed] bg-[#fafbfc] p-3"
    >
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt={alt || ""}
          width={1200}
          height={800}
          unoptimized
          className="mx-auto max-h-[520px] w-auto max-w-full object-contain"
        />
      ) : (
        <div className="flex min-h-40 items-center justify-center bg-gray-100 text-xs text-gray-500">
          Image preview unavailable
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="truncate text-[10px] text-gray-500">
          {caption || alt || "Article image"}
        </span>

        <button
          type="button"
          onClick={deleteNode}
          className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700"
        >
          Remove
        </button>
      </div>
    </NodeViewWrapper>
  );
}

const MediaImageNode = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mediaId: { default: null },
      objectPath: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      previewUrl: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-media-image]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      {
        "data-media-image": "",
        "data-media-id": HTMLAttributes.mediaId,
        "data-object-path": HTMLAttributes.objectPath,
        "data-alt": HTMLAttributes.alt,
        "data-caption": HTMLAttributes.caption,
        "data-block-id": HTMLAttributes.id,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaImageView);
  },
});

function FAQSectionView({ node, updateAttributes, deleteNode }) {
  const items = node.attrs.items ?? [];

  function updateItem(index, field, value) {
    updateAttributes({
      items: items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    });
  }

  function addItem() {
    updateAttributes({
      items: [...items, { question: "", answer: "" }],
    });
  }

  function removeItem(index) {
    updateAttributes({
      items: items.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  return (
    <NodeViewWrapper
      as="section"
      className="my-6 border border-[#e8e9ed] bg-[#fafbfc] p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#14243d]">
            Frequently Asked Questions
          </h3>
          <p className="mt-1 text-[10px] text-gray-500">
            Add questions and answers for this article.
          </p>
        </div>

        <button
          type="button"
          onClick={deleteNode}
          className="text-xs font-semibold text-red-600"
        >
          Remove section
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="border border-[#e8e9ed] bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-[#9a8055] uppercase">
                Question {index + 1}
              </span>

              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Remove question ${index + 1}`}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <input
              value={item.question}
              onChange={(event) =>
                updateItem(index, "question", event.target.value)
              }
              maxLength={500}
              placeholder="Enter the question..."
              className="w-full border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#b99658]"
            />

            <textarea
              value={item.answer}
              onChange={(event) =>
                updateItem(index, "answer", event.target.value)
              }
              maxLength={5000}
              rows={3}
              placeholder="Write the answer..."
              className="mt-2 w-full resize-y border border-[#e5e7eb] px-3 py-2 text-sm leading-6 outline-none focus:border-[#b99658]"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="mt-4 inline-flex items-center gap-2 border border-[#dfe2e8] px-3 py-2 text-xs font-semibold text-[#344054] hover:border-[#b99658]"
      >
        <Plus size={13} />
        Add question
      </button>
    </NodeViewWrapper>
  );
}

const FAQSectionNode = Node.create({
  name: "faqSection",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-faq-section]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      {
        "data-faq-section": "",
        "data-faq-items": JSON.stringify(HTMLAttributes.items ?? []),
        "data-block-id": HTMLAttributes.id,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FAQSectionView);
  },
});

function ToolbarButton({ editor, action, title, children, active = false }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={!editor}
      onClick={action}
      className={`${buttonClass} ${active ? "border-[#b99658] bg-[#fcfaf6] text-[#9a8055]" : ""}`}
    >
      {children}
    </button>
  );
}

export default function RichArticleEditor({
  content,
  onChange,
  mediaItems = [],
  mediaLoading = false,
  mediaError = "",
}) {
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start writing your article...",
      }),
      BlockId,
      MediaImageNode,
      FAQSectionNode,
    ],

    content: content ?? { type: "doc", content: [] },

    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        ...currentEditor.getJSON(),
        version: 2,
      });
    },

    editorProps: {
      attributes: {
        class:
          "article-rich-editor min-h-[360px] px-4 py-5 text-sm leading-8 text-[#26354a] outline-none sm:px-6",
      },
    },
  });

  useEffect(() => {
    if (!editor || !content) return;

    const currentJSON = editor.getJSON();
    const incomingJSON = content;

    if (JSON.stringify(currentJSON) !== JSON.stringify(incomingJSON)) {
      editor.commands.setContent(incomingJSON, {
        emitUpdate: false,
      });
    }
  }, [editor, content]);

  const filteredMedia = mediaItems.filter((item) => {
    const search = imageSearch.trim().toLowerCase();

    if (!search) return true;

    return (
      item.original_filename?.toLowerCase().includes(search) ||
      item.alt_text?.toLowerCase().includes(search) ||
      item.caption?.toLowerCase().includes(search)
    );
  });

  function insertMediaImage(asset) {
    if (!editor || !asset?.id || !asset?.object_path) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          mediaId: asset.id,
          objectPath: asset.object_path,
          alt: asset.alt_text || "",
          caption: asset.caption || "",
          previewUrl: asset.preview_url || null,
        },
      })
      .run();

    setImagePickerOpen(false);
    setImageSearch("");
  }

  function insertLink() {
    if (!editor) return;

    const currentHref = editor.getAttributes("link").href || "";
    const href = window.prompt("Enter the link URL", currentHref);

    if (href === null) return;

    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: href.trim() }).run();
  }

  if (!editor) {
    return (
      <div className="min-h-[400px] animate-pulse border border-[#e8e9ed] bg-white" />
    );
  }

  return (
    <section className="border border-[#e8e9ed] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f2] px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-[#14243d]">Article content</h2>
          <p className="mt-1 text-[11px] text-gray-500">
            Write and format your article using the rich-text editor.
          </p>
        </div>

        <span className="text-[11px] font-medium text-gray-400">Rich text</span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[#edf0f2] bg-[#fafbfc] p-3">
        <ToolbarButton
          editor={editor}
          title="Bold"
          active={editor.isActive("bold")}
          action={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Italic"
          active={editor.isActive("italic")}
          action={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Underline"
          active={editor.isActive("underline")}
          action={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Inline code"
          active={editor.isActive("code")}
          action={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          action={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={16} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          action={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Bullet list"
          active={editor.isActive("bulletList")}
          action={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Numbered list"
          active={editor.isActive("orderedList")}
          action={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Block quote"
          active={editor.isActive("blockquote")}
          action={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Insert or edit link"
          active={editor.isActive("link")}
          action={insertLink}
        >
          <Link2 size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Insert table"
          action={() =>
            editor
              .chain()
              .focus()
              .insertTable({
                rows: 3,
                cols: 3,
                withHeaderRow: true,
              })
              .run()
          }
        >
          <TableIcon size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Insert horizontal divider"
          action={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Insert article image"
          action={() => setImagePickerOpen((open) => !open)}
        >
          <ImagePlus size={15} />
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          title="Insert FAQ section"
          action={() =>
            editor
              .chain()
              .focus()
              .insertContent({
                type: "faqSection",
                attrs: { items: [] },
              })
              .run()
          }
        >
          <span className="font-bold">FAQ</span>
        </ToolbarButton>
      </div>

      {imagePickerOpen && (
        <div className="border-b border-[#edf0f2] bg-[#fcfaf6] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-[#14243d]">
                Insert an article image
              </h3>
              <p className="mt-1 text-[10px] text-gray-500">
                Choose an eligible image from your media library.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setImagePickerOpen(false)}
              className="text-xs font-semibold text-gray-500 hover:text-[#14243d]"
            >
              Close
            </button>
          </div>

          <input
            value={imageSearch}
            onChange={(event) => setImageSearch(event.target.value)}
            placeholder="Search your media..."
            className="mt-3 w-full border border-[#dfe2e8] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#b99658]"
          />

          {mediaLoading ? (
            <p className="py-5 text-center text-xs text-gray-500">
              Loading media library...
            </p>
          ) : mediaError ? (
            <p className="py-5 text-xs text-red-600">{mediaError}</p>
          ) : filteredMedia.length === 0 ? (
            <p className="py-5 text-center text-xs text-gray-500">
              No eligible images found. Upload or publish an image in the media
              library first.
            </p>
          ) : (
            <div className="mt-3 grid max-h-64 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {filteredMedia.map((asset) => (
                <button
                  type="button"
                  key={asset.id}
                  onClick={() => insertMediaImage(asset)}
                  className="overflow-hidden border border-[#e5e7eb] bg-white text-left transition hover:border-[#b99658]"
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {asset.preview_url && (
                      <Image
                        src={asset.preview_url}
                        alt={asset.alt_text || ""}
                        fill
                        unoptimized
                        sizes="180px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p className="truncate p-2 text-[10px] font-medium text-[#344054]">
                    {asset.original_filename}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0f2] px-4 py-3">
        <p className="text-[10px] text-gray-400">
          Select text to format it. Use the toolbar to insert images, tables and
          FAQs.
        </p>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
          className="text-[10px] font-semibold text-gray-500 hover:text-[#14243d]"
        >
          Clear formatting
        </button>
      </div>

      <style jsx global>{`
        .article-rich-editor p {
          margin: 0.85rem 0;
        }

        .article-rich-editor h2 {
          margin: 2rem 0 0.85rem;
          color: #14243d;
          font-size: 1.45rem;
          font-weight: 750;
          line-height: 1.35;
        }

        .article-rich-editor h3 {
          margin: 1.5rem 0 0.65rem;
          color: #14243d;
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.4;
        }

        .article-rich-editor ul,
        .article-rich-editor ol {
          margin: 1rem 0;
          padding-left: 1.6rem;
        }

        .article-rich-editor ul {
          list-style: disc;
        }

        .article-rich-editor ol {
          list-style: decimal;
        }

        .article-rich-editor li {
          padding-left: 0.25rem;
        }

        .article-rich-editor blockquote {
          margin: 1.5rem 0;
          border-left: 3px solid #b99658;
          background: #faf8f3;
          padding: 0.8rem 1rem;
          color: #475467;
        }

        .article-rich-editor a {
          color: #9a8055;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .article-rich-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }

        .article-rich-editor th,
        .article-rich-editor td {
          min-width: 90px;
          border: 1px solid #dfe2e8;
          padding: 0.6rem;
          text-align: left;
          vertical-align: top;
        }

        .article-rich-editor th {
          background: #f6f1e7;
          color: #14243d;
          font-weight: 700;
        }

        .article-rich-editor hr {
          margin: 2rem 0;
          border: 0;
          border-top: 1px solid #e5e7eb;
        }

        .article-rich-editor code {
          border-radius: 3px;
          background: #f1f3f5;
          padding: 0.15rem 0.3rem;
          font-size: 0.9em;
        }

        .article-rich-editor p.is-editor-empty:first-child::before {
          float: left;
          height: 0;
          color: #9ca3af;
          content: attr(data-placeholder);
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}
