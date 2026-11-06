import { describe, it, expect } from "vitest";
import { extractYouTubeVideoId, getYouTubeErrorMessage } from "../apps/web/src/utils/youtube";

describe("YouTube URL & ID Extraction", () => {
  it("extracts ID from standard watch URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("http://youtube.com/watch?v=jfKfPfyJRdk&t=120s")).toBe("jfKfPfyJRdk");
  });

  it("extracts ID from shortened youtu.be URLs", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("youtu.be/dQw4w9WgXcQ?si=abcdef12345")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from embed URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube-nocookie.com/embed/jfKfPfyJRdk")).toBe("jfKfPfyJRdk");
  });

  it("extracts ID from YouTube Shorts and Music URLs", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("accepts valid standalone 11-char IDs", () => {
    expect(extractYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("jfKfPfyJRdk")).toBe("jfKfPfyJRdk");
  });

  it("strictly rejects invalid URLs, phishing domains, and malformed inputs", () => {
    expect(extractYouTubeVideoId("https://evil-youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeVideoId("https://vimeo.com/123456789")).toBeNull();
    expect(extractYouTubeVideoId("https://youtube.com/watch?v=short")).toBeNull();
    expect(extractYouTubeVideoId("")).toBeNull();
    expect(extractYouTubeVideoId("not a url")).toBeNull();
    expect(extractYouTubeVideoId("<script>alert(1)</script>")).toBeNull();
  });
});

describe("YouTube Error Code Translation", () => {
  it("translates common YouTube Player error codes", () => {
    expect(getYouTubeErrorMessage(2)).toContain("invalid parameter");
    expect(getYouTubeErrorMessage(5)).toContain("HTML5 player");
    expect(getYouTubeErrorMessage(100)).toContain("not found");
    expect(getYouTubeErrorMessage(101)).toContain("embedded players");
    expect(getYouTubeErrorMessage(150)).toContain("embedded players");
    expect(getYouTubeErrorMessage(153)).toContain("origin/referrer");
    expect(getYouTubeErrorMessage(999)).toContain("code 999");
  });
});

