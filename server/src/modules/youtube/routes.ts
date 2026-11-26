import { Router, type Request, type Response } from "express";
import { env } from "../../config/env.js";

export const youtubeRouter: Router = Router();

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: number;
}

export function parseYouTubeDuration(isoDuration: string): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// 15-minute query cache to prevent redundant quota usage
const searchCache = new Map<string, { timestamp: number; results: YouTubeSearchResult[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractYouTubeId(urlOrText: string): string | null {
  const clean = urlOrText.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * GET /api/youtube/search?q=...
 */
youtubeRouter.get("/search", async (req: Request, res: Response) => {
  const query = (req.query["q"] as string | undefined)?.trim();
  if (!query) {
    res.status(400).json({ ok: false, error: "Search query 'q' parameter is required." });
    return;
  }

  // 1. Direct YouTube link check
  const directId = extractYouTubeId(query);
  if (directId) {
    if (env.youtubeApiKey) {
      try {
        const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${directId}&key=${env.youtubeApiKey}`;
        const vidRes = await fetch(vidUrl, { signal: AbortSignal.timeout(4000) });
        if (vidRes.ok) {
          const vidData = (await vidRes.json()) as {
            items?: Array<{
              snippet?: { title?: string; channelTitle?: string };
              contentDetails?: { duration?: string };
            }>;
          };
          const item = vidData.items?.[0];
          if (item) {
            const dur = parseYouTubeDuration(item.contentDetails?.duration || "");
            res.json({
              ok: true,
              results: [
                {
                  videoId: directId,
                  title: cleanHtmlEntities(item.snippet?.title || `YouTube Video (${directId})`),
                  channelTitle: cleanHtmlEntities(item.snippet?.channelTitle || "YouTube Creator"),
                  thumbnailUrl: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
                  duration: dur > 0 ? dur : undefined,
                },
              ],
            });
            return;
          }
        }
      } catch {
        // Fallback to oEmbed below
      }
    }

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directId}&format=json`,
        { signal: AbortSignal.timeout(4000) }
      );

      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        res.json({
          ok: true,
          results: [
            {
              videoId: directId,
              title: data.title || `YouTube Video (${directId})`,
              channelTitle: data.author_name || "YouTube Creator",
              thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
            },
          ],
        });
        return;
      }
    } catch {
      // Fallback if oEmbed is unreachable
    }

    res.json({
      ok: true,
      results: [
        {
          videoId: directId,
          title: `YouTube Video (${directId})`,
          channelTitle: "YouTube Creator",
          thumbnailUrl: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
        },
      ],
    });
    return;
  }

  // 2. Keyword Search
  const cacheKey = query.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.json({ ok: true, results: cached.results });
    return;
  }

  if (!env.youtubeApiKey) {
    res.status(503).json({
      ok: false,
      error: "YouTube API key is not configured. Please add YOUTUBE_API_KEY in your server .env file, or paste a direct YouTube video link.",
    });
    return;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(
      query
    )}&key=${env.youtubeApiKey}`;

    const apiRes = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      console.error("[YouTube API Error]:", apiRes.status, errBody);
      res.status(apiRes.status).json({
        ok: false,
        error: `YouTube API returned status ${apiRes.status}. Check API quota or key.`,
      });
      return;
    }

    const data = (await apiRes.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        };
      }>;
    };

    const videoIds = (data.items || [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id))
      .join(",");

    const durationMap = new Map<string, number>();
    if (videoIds && env.youtubeApiKey) {
      try {
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${env.youtubeApiKey}`;
        const detailsRes = await fetch(detailsUrl, { signal: AbortSignal.timeout(4000) });
        if (detailsRes.ok) {
          const detailsData = (await detailsRes.json()) as {
            items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
          };
          for (const item of detailsData.items || []) {
            if (item.id && item.contentDetails?.duration) {
              const dur = parseYouTubeDuration(item.contentDetails.duration);
              if (dur > 0) durationMap.set(item.id, dur);
            }
          }
        }
      } catch (err) {
        console.warn("[YouTube API] Failed to fetch contentDetails for search results:", err);
      }
    }

    const results: YouTubeSearchResult[] = (data.items || [])
      .filter((item) => Boolean(item.id?.videoId))
      .map((item) => ({
        videoId: item.id!.videoId!,
        title: cleanHtmlEntities(item.snippet?.title || "Untitled Track"),
        channelTitle: cleanHtmlEntities(item.snippet?.channelTitle || "YouTube Artist"),
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          `https://img.youtube.com/vi/${item.id!.videoId!}/hqdefault.jpg`,
        duration: durationMap.get(item.id!.videoId!),
      }));

    // Cache results (max 100 queries)
    if (searchCache.size > 100) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }
    searchCache.set(cacheKey, { timestamp: Date.now(), results });

    res.json({ ok: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to search YouTube";
    console.error("[YouTube Search Exception]:", msg);
    res.status(500).json({ ok: false, error: msg });
  }
});
