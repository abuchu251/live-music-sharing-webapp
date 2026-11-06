// ─── YouTube IFrame API Script Loader ──────────────────────

let loadPromise: Promise<typeof YT> | null = null;

export function loadYouTubeIFrameAPI(): Promise<typeof YT> {
  // If already loaded on window, resolve immediately
  if (typeof window !== "undefined" && window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  // If loading is already in progress, return the existing promise
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<typeof YT>((resolve, reject) => {
    // If the script is already in the document, wait for callback
    const existingScript = document.getElementById("youtube-iframe-api");

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) previousReady();
      if (window.YT) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube API loaded but window.YT is not defined"));
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        loadPromise = null;
        reject(new Error("Failed to load YouTube IFrame API script."));
      };
      document.head.appendChild(script);
    }
  });

  return loadPromise;
}

