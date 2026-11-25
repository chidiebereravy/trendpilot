import Image from "next/image";
import Link from "next/link";

import { getPublicAdPlacement } from "@/lib/public-advertising";

export default async function AdPlacement({ placementKey }) {
  const result = await getPublicAdPlacement(placementKey);

  if (!result?.advertisement) return null;

  const { placement, advertisement } = result;

  let imageUrl = null;

  if (advertisement.imageUrl) {
    try {
      const parsedImageUrl = new URL(advertisement.imageUrl);

      if (parsedImageUrl.protocol === "https:") {
        imageUrl = parsedImageUrl.toString();
      }
    } catch {
      imageUrl = null;
    }
  }

  return (
    <aside
      aria-label="Advertisement"
      className="container-main py-8"
      data-ad-placement={placement.key}
    >
      <div className="overflow-hidden border border-[#eeeae2] bg-[#fcfbf9]">
        <div className="flex items-center justify-between border-b border-[#eeeae2] px-5 py-3">
          <span className="text-[9px] font-bold tracking-[0.2em] text-[#a78348] uppercase">
            {advertisement.disclosureLabel}
          </span>

          <span className="text-[10px] text-gray-400">Sponsored content</span>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:p-7">
          <div className="min-w-0">
            <h2 className="text-xl leading-snug font-bold tracking-tight text-[#14243d] sm:text-2xl">
              {advertisement.headline}
            </h2>

            {advertisement.description && (
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                {advertisement.description}
              </p>
            )}

            <Link
              href={advertisement.href}
              rel="sponsored nofollow"
              className="mt-5 inline-flex items-center justify-center rounded-xs bg-[#14243d] px-6 py-3 text-xs font-bold !text-white transition hover:bg-[#263e59]"
            >
              {advertisement.callToActionText}
            </Link>
          </div>

          {imageUrl && (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#eeeae2] sm:w-56">
              <Image
                src={imageUrl}
                alt={advertisement.imageAltText || "Advertisement image"}
                fill
                sizes="(max-width: 640px) 100vw, 224px"
                unoptimized
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
