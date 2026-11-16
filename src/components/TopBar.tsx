import React from 'react';
import { WorkspaceMode } from '../types/converter';

interface TopBarProps {
  activeMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  onNavigateSection: (sectionId: string) => void;
  onPrimaryAction: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeMode,
  onSelectMode,
  onNavigateSection,
  onPrimaryAction,
  primaryLabel,
  primaryDisabled = false,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark only */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 rounded-sm"
        >
          FrameDOM
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => {
              onSelectMode('html-to-video');
              onNavigateSection('studio');
            }}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
              activeMode === 'html-to-video'
                ? 'text-slate-900 border-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            HTML to Video
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectMode('video-to-html');
              onNavigateSection('studio');
            }}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
              activeMode === 'video-to-html'
                ? 'text-slate-900 border-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Video to HTML
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('templates')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('architecture')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            Pipeline
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={primaryDisabled}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </header>
  );
};
