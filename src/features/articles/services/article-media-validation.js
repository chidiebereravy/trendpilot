import { AuthError } from "@/lib/auth/session";

const STAGING_BUCKET = "trendpilot-media-staging";
const PUBLIC_BUCKET = "trendpilot-media";

function collectArticleImages(content) {
  const images = [];

  function visit(node) {
    if (!node || typeof node !== "object") return;

    if (node.type === "image") {
      const mediaId = node.attrs?.mediaId;
      const objectPath = node.attrs?.objectPath;

      if (
        typeof mediaId !== "string" ||
        typeof objectPath !== "string" ||
        !mediaId ||
        !objectPath
      ) {
        throw new AuthError(
          "An article image is missing its media reference.",
          422,
          "ARTICLE_IMAGE_REFERENCE_INVALID",
        );
      }

      images.push({ mediaId, objectPath });
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  }

  visit(content);
  return images;
}

function throwInvalidMedia() {
  throw new AuthError(
    "One or more selected images are unavailable or cannot be used in this article.",
    422,
    "ARTICLE_MEDIA_INVALID",
  );
}

function validateMediaRecord(media, user, role) {
  if (!media || media.purpose !== "article") {
    return false;
  }

  if (role === "author") {
    return (
      media.owner_id === user.id &&
      media.status === "staged" &&
      media.bucket_id === STAGING_BUCKET
    );
  }

  if (role === "editor" || role === "admin") {
    return media.status === "published" && media.bucket_id === PUBLIC_BUCKET;
  }

  return false;
}

function selectFeaturedMedia(records) {
  return (
    [...records].sort((a, b) => {
      const aPriority =
        a.status === "published" && a.bucket_id === PUBLIC_BUCKET ? 0 : 1;

      const bPriority =
        b.status === "published" && b.bucket_id === PUBLIC_BUCKET ? 0 : 1;

      return aPriority - bPriority || a.id.localeCompare(b.id);
    })[0] ?? null
  );
}

export async function validateArticleMedia({
  supabase,
  user,
  role,
  content,
  featuredImagePath,
  validateContent = true,
  validateFeaturedImage = true,
}) {
  if (validateContent) {
    const images = collectArticleImages(content);
    const mediaIds = [...new Set(images.map((image) => image.mediaId))];

    if (mediaIds.length > 0) {
      const { data, error } = await supabase
        .from("media_assets")
        .select("id, owner_id, bucket_id, object_path, purpose, status")
        .in("id", mediaIds);

      if (error) throw error;

      const mediaById = new Map((data || []).map((media) => [media.id, media]));

      for (const image of images) {
        const media = mediaById.get(image.mediaId);

        if (
          !media ||
          media.object_path !== image.objectPath ||
          !validateMediaRecord(media, user, role)
        ) {
          throwInvalidMedia();
        }
      }
    }
  }

  if (validateFeaturedImage && featuredImagePath) {
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, owner_id, bucket_id, object_path, purpose, status")
      .eq("object_path", featuredImagePath)
      .in("bucket_id", [STAGING_BUCKET, PUBLIC_BUCKET]);

    if (error) throw error;

    const featuredMedia = selectFeaturedMedia(data || []);

    if (!validateMediaRecord(featuredMedia, user, role)) {
      throwInvalidMedia();
    }
  }
}
