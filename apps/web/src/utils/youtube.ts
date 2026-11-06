// ─── YouTube URL Validation & Video ID Extraction ────────

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts and strictly validates an 11-character YouTube video ID
 * from a YouTube URL or standalone ID.
 * Returns null if the URL is invalid or from an untrusted host.
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();

  // 1. Direct 11-character video ID match
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // 2. URL parsing with strict hostname check
  try {
    // Add protocol if missing for URL parser
    const urlString = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    // Must belong to authorized YouTube domains
    const allowedHosts = [
      "youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtu.be",
      "youtube-nocookie.com",
    ];

    if (!allowedHosts.includes(hostname)) {
      return null;
    }

    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      // youtu.be/VIDEO_ID
      const pathname = url.pathname.slice(1);
      videoId = pathname.split("/")[0]?.split("?")[0] || null;
    } else if (url.pathname === "/watch") {
      // youtube.com/watch?v=VIDEO_ID
      videoId = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      // youtube.com/embed/VIDEO_ID
      videoId = url.pathname.slice("/embed/".length).split("/")[0]?.split("?")[0] || null;
    } else if (url.pathname.startsWith("/shorts/")) {
      // youtube.com/shorts/VIDEO_ID
      videoId = url.pathname.slice("/shorts/".length).split("/")[0]?.split("?")[0] || null;
    } else if (url.pathname.startsWith("/v/")) {
      // youtube.com/v/VIDEO_ID
      videoId = url.pathname.slice("/v/".length).split("/")[0]?.split("?")[0] || null;
    }

    if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
      return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Maps YouTube IFrame Player error codes to actionable user messages.
 */
export function getYouTubeErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case 2:
      return "The requested YouTube video ID contains an invalid parameter.";
    case 5:
      return "The requested content cannot be played in an HTML5 player.";
    case 100:
      return "The video was not found, has been removed, or has been marked as private.";
    case 101:
    case 150:
      return "The owner of this video does not allow it to be played in embedded players.";
    case 153:
      return "Embedding error: Access blocked due to missing origin/referrer configuration.";
    default:
      return `YouTube playback error (code ${errorCode}).`;
  }
}

