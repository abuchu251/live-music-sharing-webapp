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

export interface YouTubePlaylistResult {
  playlistId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
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

// 15-minute bounded caches to prevent redundant quota usage and cap RAM
const searchCache = new Map<
  string,
  { timestamp: number; results?: YouTubeSearchResult[]; playlists?: YouTubePlaylistResult[] }
>();
const playlistTracksCache = new Map<string, { timestamp: number; tracks: YouTubeSearchResult[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_SEARCH_CACHE_ENTRIES = 100;
const MAX_PLAYLIST_CACHE_ENTRIES = 50;

function setBoundedCache<T>(map: Map<string, T>, key: string, value: T, maxEntries: number): void {
  if (map.has(key)) map.delete(key);
  while (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
  map.set(key, value);
}

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

function extractYouTubePlaylistId(urlOrText: string): string | null {
  const clean = urlOrText.trim();
  if (/^(PL|UU|OLAK5uy_|FL)[a-zA-Z0-9_-]{10,}$/.test(clean)) return clean;
  try {
    const withProto = clean.startsWith("http://") || clean.startsWith("https://") ? clean : `https://${clean}`;
    const parsed = new URL(withProto);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) {
      return null;
    }
    const listId = parsed.searchParams.get("list");
    return listId && /^[a-zA-Z0-9_-]{10,}$/.test(listId) ? listId : null;
  } catch {
    return null;
  }
}

async function fetchPlaylistTracks(playlistId: string, maxResults = 25): Promise<YouTubeSearchResult[]> {
  if (playlistId.startsWith("RD")) {
    throw new Error(
      "YouTube auto-generated Mixes (RD...) are not supported by the YouTube Playlist API. Please paste a regular YouTube playlist link or search for playlists."
    );
  }

  const cached = playlistTracksCache.get(playlistId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.tracks;
  }

  if (!env.youtubeApiKey) {
    throw new Error("YouTube API key is not configured on the server.");
  }

  const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
    playlistId
  )}&maxResults=${maxResults}&key=${env.youtubeApiKey}`;

  const itemsRes = await fetch(itemsUrl, { signal: AbortSignal.timeout(6000) });
  if (!itemsRes.ok) {
    const errBody = await itemsRes.text();
    console.error("[YouTube Playlist API Error]:", itemsRes.status, errBody);
    throw new Error(
      itemsRes.status === 404
        ? "Playlist not found or is private."
        : `YouTube API returned status ${itemsRes.status}.`
    );
  }

  const itemsData = (await itemsRes.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        videoOwnerChannelTitle?: string;
        channelTitle?: string;
        resourceId?: { videoId?: string };
        thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
      };
      contentDetails?: { videoId?: string };
    }>;
  };

  const rawTracks = (itemsData.items || [])
    .map((item) => {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title || "";
      if (!videoId || title === "Deleted video" || title === "Private video") return null;
      return {
        videoId,
        title: cleanHtmlEntities(title || `YouTube Track (${videoId})`),
        channelTitle: cleanHtmlEntities(
          item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "YouTube Creator"
        ),
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    })
    .filter((t): t is Omit<YouTubeSearchResult, "duration"> => Boolean(t));

  if (rawTracks.length === 0) {
    return [];
  }

  // Batch-fetch durations & embeddability in 1 API call (1 unit)
  const videoIds = rawTracks.map((t) => t.videoId).join(",");
  const detailsMap = new Map<string, { duration?: number; embeddable: boolean }>();
  try {
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${videoIds}&key=${env.youtubeApiKey}`;
    const detailsRes = await fetch(detailsUrl, { signal: AbortSignal.timeout(5000) });
    if (detailsRes.ok) {
      const detailsData = (await detailsRes.json()) as {
        items?: Array<{
          id?: string;
          contentDetails?: { duration?: string };
          status?: { embeddable?: boolean };
        }>;
      };
      for (const item of detailsData.items || []) {
        if (item.id) {
          const dur = parseYouTubeDuration(item.contentDetails?.duration || "");
          detailsMap.set(item.id, {
            duration: dur > 0 ? dur : undefined,
            embeddable: item.status?.embeddable !== false,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[YouTube Playlist] Failed to fetch video details:", err);
  }

  const tracks: YouTubeSearchResult[] = rawTracks
    .filter((t) => detailsMap.get(t.videoId)?.embeddable !== false)
    .map((t) => ({
      ...t,
      duration: detailsMap.get(t.videoId)?.duration,
    }));

  setBoundedCache(playlistTracksCache, playlistId, { timestamp: Date.now(), tracks }, MAX_PLAYLIST_CACHE_ENTRIES);
  return tracks;
}

/**
 * GET /api/youtube/playlist?listId=...
 */
youtubeRouter.get("/playlist", async (req: Request, res: Response) => {
  const listId = (req.query["listId"] as string | undefined)?.trim();
  if (!listId) {
    res.status(400).json({ ok: false, error: "Playlist 'listId' parameter is required." });
    return;
  }
  try {
    const tracks = await fetchPlaylistTracks(listId);
    res.json({ ok: true, playlistId: listId, results: tracks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load YouTube playlist.";
    res.status(400).json({ ok: false, error: msg });
  }
});

/**
 * GET /api/youtube/search?q=...&type=video|playlist
 */
youtubeRouter.get("/search", async (req: Request, res: Response) => {
  const query = (req.query["q"] as string | undefined)?.trim();
  const searchType = req.query["type"] === "playlist" ? "playlist" : "video";
  if (!query) {
    res.status(400).json({ ok: false, error: "Search query 'q' parameter is required." });
    return;
  }

  // 1. Direct Playlist Link check (always handle /playlist?list=... or ?list=... when in playlist mode or no v=)
  const directPlaylistId = extractYouTubePlaylistId(query);
  const directId = extractYouTubeId(query);
  if (directPlaylistId && (searchType === "playlist" || !directId)) {
    try {
      const tracks = await fetchPlaylistTracks(directPlaylistId);
      res.json({ ok: true, kind: "playlist-tracks", playlistId: directPlaylistId, results: tracks });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load YouTube playlist.";
      res.status(400).json({ ok: false, error: msg });
    }
    return;
  }

  // 2. Direct YouTube video link check
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

  // 3. Keyword Search (videos or playlists)
  const cacheKey = `${searchType}:${query.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (searchType === "playlist") {
      res.json({ ok: true, kind: "playlists", playlists: cached.playlists || [] });
    } else {
      res.json({ ok: true, kind: "videos", results: cached.results || [] });
    }
    return;
  }

  if (!env.youtubeApiKey) {
    res.status(503).json({
      ok: false,
      error: "YouTube API key is not configured. Please add YOUTUBE_API_KEY in your server .env file, or paste a direct YouTube link.",
    });
    return;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=${searchType}&maxResults=5&q=${encodeURIComponent(
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

    if (searchType === "playlist") {
      const data = (await apiRes.json()) as {
        items?: Array<{
          id?: { playlistId?: string };
          snippet?: {
            title?: string;
            channelTitle?: string;
            thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
          };
        }>;
      };

      const playlists: YouTubePlaylistResult[] = (data.items || [])
        .filter((item) => Boolean(item.id?.playlistId))
        .map((item) => ({
          playlistId: item.id!.playlistId!,
          title: cleanHtmlEntities(item.snippet?.title || "Untitled Playlist"),
          channelTitle: cleanHtmlEntities(item.snippet?.channelTitle || "YouTube Creator"),
          thumbnailUrl:
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            "",
        }));

      setBoundedCache(searchCache, cacheKey, { timestamp: Date.now(), playlists }, MAX_SEARCH_CACHE_ENTRIES);
      res.json({ ok: true, kind: "playlists", playlists });
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

    setBoundedCache(searchCache, cacheKey, { timestamp: Date.now(), results }, MAX_SEARCH_CACHE_ENTRIES);
    res.json({ ok: true, kind: "videos", results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to search YouTube";
    console.error("[YouTube Search Exception]:", msg);
    res.status(500).json({ ok: false, error: msg });
  }
});
