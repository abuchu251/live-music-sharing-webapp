import { useEffect, useState } from "react";

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => setHealth(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/25">
          <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            SyncTune
          </span>
        </h1>
        <p className="mb-10 text-lg text-gray-400">
          Listen together, in perfect sync.
        </p>

        {/* Health status */}
        <div className="mx-auto max-w-sm rounded-xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Server Connection
          </h2>
          {health ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span className="text-emerald-400">Connected</span>
              </div>
              <p className="text-xs text-gray-500">
                Uptime: {Math.floor(health.uptime)}s
              </p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
              <span className="text-red-400">Disconnected</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-500" />
              <span className="text-yellow-400">Connecting...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
