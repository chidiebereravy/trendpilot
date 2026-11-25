import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function redirectResponse(destinationUrl) {
  const response = NextResponse.redirect(destinationUrl, 302);

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  return response;
}

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export async function GET(request, { params }) {
  try {
    const { campaignId } = await params;
    const requestUrl = new URL(request.url);
    const placementKey = requestUrl.searchParams.get("placement");

    if (!isUuid(campaignId)) {
      return new NextResponse("Advertisement not found.", { status: 404 });
    }

    if (
      typeof placementKey !== "string" ||
      !/^[a-z0-9][a-z0-9_-]{1,79}$/.test(placementKey)
    ) {
      return new NextResponse("Invalid advertisement placement.", {
        status: 400,
      });
    }

    const supabase = createSupabaseAdminClient();

    const { data: destinationUrl, error } = await supabase.rpc(
      "record_public_ad_click",
      {
        p_campaign_id: campaignId,
        p_placement_key: placementKey,
      },
    );

    if (error) {
      console.error("Advertisement click recording failed:", error);
      throw error;
    }

    if (
      typeof destinationUrl !== "string" ||
      !/^https?:\/\//i.test(destinationUrl)
    ) {
      return new NextResponse("Advertisement is unavailable.", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    let parsedDestination;

    try {
      parsedDestination = new URL(destinationUrl);
    } catch {
      return new NextResponse("Advertisement is unavailable.", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    if (
      !["http:", "https:"].includes(parsedDestination.protocol) ||
      !parsedDestination.hostname
    ) {
      return new NextResponse("Advertisement is unavailable.", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    return redirectResponse(parsedDestination.toString());
  } catch (error) {
    console.error("Advertisement redirect failed:", error);

    return new NextResponse("Unable to process this advertisement.", {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
}
