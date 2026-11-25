import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface border-t border-outline-variant py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-tertiary">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">
            S
          </div>
          <span className="font-semibold text-on-surface">SyncTune</span>
          <span>— Precision YouTube audio synchronization for desks, dorms, and studios.</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/abuchu251/live-music-sharing-webapp"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-on-surface transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/abuchu251/live-music-sharing-webapp/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-on-surface transition-colors"
          >
            Contribute
          </a>
          <span>© {new Date().getFullYear()} SyncTune</span>
        </div>
      </div>
    </footer>
  );
};
