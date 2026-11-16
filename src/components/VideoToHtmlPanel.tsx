import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  Code2,
  Copy,
  Download,
  FileVideo,
  Square,
  Upload,
} from 'lucide-react';
import {
  convertVideoToHtml,
  generateBuiltInSampleVideo,
  readVideoMetadata,
} from '../engines/videoToHtml';
import {
  GeneratedHtmlResult,
  VideoMetadata,
  VideoToHtmlMode,
  VideoToHtmlProgress,
  VideoToHtmlSettings,
} from '../types/converter';

interface VideoToHtmlPanelProps {
  incomingVideo: { blob: Blob; name: string; key: number } | null;
  onSendHtmlToVideo: (html: string) => void;
  triggerConvertRef: React.MutableRefObject<(() => void) | null>;
  onGeneratingStateChange?: (isGenerating: boolean) => void;
}

const OUTPUT_MODES: {
  id: VideoToHtmlMode;
  title: string;
  summary: string;
}[] = [
  {
    id: 'canvas-player',
    title: 'Canvas Frame Player',
    summary: 'Self-contained HTML5 canvas player with scrubber and controls.',
  },
  {
    id: 'css-sprite',
    title: 'Pure CSS Sprite Sheet',
    summary: 'Zero-JavaScript CSS @keyframes steps() sprite animation.',
  },
  {
    id: 'svg-mosaic',
    title: 'SVG Vector Mosaic',
    summary: 'Sampled grid of crisp geometric SVG <rect> elements.',
  },
  {
    id: 'ascii-art',
    title: 'Color ASCII Motion',
    summary: 'Monospaced colored ASCII character sequence animation.',
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const VideoToHtmlPanel: React.FC<VideoToHtmlPanelProps> = ({
  incomingVideo,
  onSendHtmlToVideo,
  triggerConvertRef,
  onGeneratingStateChange,
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const [settings, setSettings] = useState<VideoToHtmlSettings>({
    mode: 'canvas-player',
    fps: 12,
    outputWidth: 480,
    quality: 0.78,
    startTime: 0,
    endTime: 3,
    autoplay: true,
    loop: true,
    showControls: true,
    darkBackdrop: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<VideoToHtmlProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedHtmlResult | null>(null);
  const [viewTab, setViewTab] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onGeneratingStateChange?.(isGenerating);
  }, [isGenerating, onGeneratingStateChange]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const loadVideoBlob = async (blob: Blob, name: string) => {
    setErrorMsg(null);
    try {
      const { metadata: meta, objectUrl } = await readVideoMetadata(blob, name);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setMetadata(meta);
      setSettings((s) => ({
        ...s,
        startTime: 0,
        endTime: Number(Math.min(meta.durationSec, 8).toFixed(2)),
        outputWidth: Math.min(640, Math.max(240, meta.width)),
      }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to read video file.');
    }
  };

  useEffect(() => {
    if (incomingVideo) {
      void loadVideoBlob(incomingVideo.blob, incomingVideo.name);
    }
  }, [incomingVideo]);

  const handleLoadSample = async (kind: 'geometry' | 'spectrum') => {
    setLoadingSample(kind);
    setErrorMsg(null);
    try {
      const sampleFile = await generateBuiltInSampleVideo(kind);
      await loadVideoBlob(sampleFile, sampleFile.name);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create sample video.');
    } finally {
      setLoadingSample(null);
    }
  };

  const handleGenerateHtml = async () => {
    if (isGenerating) return;
    if (!videoUrl || !metadata) {
      setErrorMsg('Upload a video file or load a built-in sample video first.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const out = await convertVideoToHtml(
        videoUrl,
        metadata,
        settings,
        (p) => setProgress(p),
        controller.signal
      );
      setResult(out);
      setViewTab('preview');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMsg('Conversion cancelled.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Failed converting video to HTML.');
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    triggerConvertRef.current = handleGenerateHtml;
  });

  const handleCopyHtml = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.html);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadHtml = () => {
    if (!result) return;
    const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `framedom-${result.mode}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const estimatedFrames = useMemo(() => {
    const span = Math.max(0.1, settings.endTime - settings.startTime);
    return Math.min(180, Math.max(2, Math.round(span * settings.fps)));
  }, [settings.startTime, settings.endTime, settings.fps]);

  const sourceLines = useMemo(() => (result ? result.html.split('\n').length : 0), [result]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Column: Video Source & Conversion Engine Settings */}
      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        {/* Source Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Source Video Input</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loadingSample !== null}
              onClick={() => handleLoadSample('geometry')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loadingSample === 'geometry' ? 'Generating...' : 'Sample: Geometric'}
            </button>
            <button
              type="button"
              disabled={loadingSample !== null}
              onClick={() => handleLoadSample('spectrum')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loadingSample === 'spectrum' ? 'Generating...' : 'Sample: Spectrum'}
            </button>
          </div>
        </div>

        {/* Video Upload / Preview Area */}
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          {videoUrl && metadata ? (
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  muted
                  playsInline
                  className="max-h-[210px] w-auto max-w-full"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 truncate max-w-[180px]">
                    {metadata.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {metadata.width}×{metadata.height}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{metadata.durationSec.toFixed(2)}s</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatBytes(metadata.sizeBytes)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Replace Video
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void loadVideoBlob(file, file.name);
              }}
              className="border border-dashed border-slate-300 bg-white rounded-xl p-7 text-center"
            >
              <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2.5" />
              <h3 className="text-sm font-semibold text-slate-900">
                Drop an MP4, WebM, or MOV file
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Or load one of the built-in sample videos above to test immediately.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Choose Video File
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadVideoBlob(f, f.name);
            }}
          />
        </div>

        {/* Output Mode Selector & Extraction Options */}
        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-medium text-slate-600 mb-2">
                HTML Output Engine
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {OUTPUT_MODES.map((m) => {
                  const active = settings.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, mode: m.id }))}
                      className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'border-blue-600 bg-blue-50/60'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-900">{m.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {m.summary}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extraction Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">Start (sec)</span>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, (metadata?.durationSec || 10) - 0.2)}
                  step={0.1}
                  value={settings.startTime}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, startTime: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 tabular-nums"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">End (sec)</span>
                <input
                  type="number"
                  min={0.2}
                  max={metadata?.durationSec || 30}
                  step={0.1}
                  value={settings.endTime}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      endTime: Math.max(s.startTime + 0.2, Number(e.target.value) || 3),
                    }))
                  }
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 tabular-nums"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">Sample FPS</span>
                <select
                  value={settings.fps}
                  onChange={(e) => setSettings((s) => ({ ...s, fps: Number(e.target.value) }))}
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 tabular-nums"
                >
                  <option value={6}>6 fps</option>
                  <option value={10}>10 fps</option>
                  <option value={12}>12 fps</option>
                  <option value={15}>15 fps</option>
                  <option value={24}>24 fps</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">Width (px)</span>
                <select
                  value={settings.outputWidth}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, outputWidth: Number(e.target.value) }))
                  }
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 tabular-nums"
                >
                  <option value={240}>240 px</option>
                  <option value={360}>360 px</option>
                  <option value={480}>480 px</option>
                  <option value={640}>640 px</option>
                  <option value={720}>720 px</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoplay}
                    onChange={(e) => setSettings((s) => ({ ...s, autoplay: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  Autoplay
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.loop}
                    onChange={(e) => setSettings((s) => ({ ...s, loop: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  Loop
                </label>
                {settings.mode === 'canvas-player' && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showControls}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, showControls: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    Controls
                  </label>
                )}
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.darkBackdrop}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, darkBackdrop: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-blue-600"
                  />
                  Dark Stage
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                <span>{settings.mode === 'svg-mosaic' || settings.mode === 'ascii-art' ? 'Density' : 'Quality'}</span>
                <input
                  type="range"
                  min={0.35}
                  max={0.95}
                  step={0.05}
                  value={settings.quality}
                  onChange={(e) => setSettings((s) => ({ ...s, quality: Number(e.target.value) }))}
                  className="w-24 accent-blue-600"
                />
                <span>{Math.round(settings.quality * 100)}%</span>
              </label>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500 tabular-nums">
                {isGenerating && progress
                  ? `Extracting frame ${progress.currentFrame} of ${progress.totalFrames} · ${progress.percent}%`
                  : `Target: ~${estimatedFrames} frames · ${settings.fps} fps`}
              </span>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateHtml}
                  disabled={!videoUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                  Generate HTML
                </button>
              )}
            </div>

            {isGenerating && progress && (
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-150"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Right Column: Live HTML Output & Source Code */}
      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewTab('preview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live HTML Output
            </button>
            <button
              type="button"
              onClick={() => setViewTab('source')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewTab === 'source'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HTML Source Code
            </button>
          </div>

          {result && (
            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">
              {result.frameCount} frames · {formatBytes(result.byteSize)}
            </span>
          )}
        </div>

        <div className="flex-1 bg-slate-950 min-h-[420px] flex flex-col">
          {result ? (
            viewTab === 'preview' ? (
              <iframe
                key={`${result.mode}-${result.byteSize}-${result.generationTimeMs}`}
                title="Generated HTML output preview"
                sandbox="allow-scripts"
                srcDoc={result.html}
                className="w-full flex-1 min-h-[420px] border-0 bg-slate-950"
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 tabular-nums">
                  <span>Standalone .html Document</span>
                  <span>
                    {sourceLines} lines · {formatBytes(result.byteSize)}
                  </span>
                </div>
                <pre className="flex-1 p-5 overflow-auto text-[12px] leading-relaxed font-mono text-slate-200 max-h-[460px] whitespace-pre-wrap break-all">
                  {result.html}
                </pre>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <FileVideo className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-200">
                No generated HTML yet
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Upload a video or click Sample: Geometric on the left, then choose an HTML output engine and click Generate HTML.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
          {result ? (
            <>
              <div className="text-xs text-slate-600 tabular-nums flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">
                  {OUTPUT_MODES.find((m) => m.id === result.mode)?.title}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {result.width}×{result.height}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(result.byteSize)}</span>
                <span aria-hidden="true">·</span>
                <span>{(result.generationTimeMs / 1000).toFixed(2)}s</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSendHtmlToVideo(result.html)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Open in HTML → Video
                </button>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy HTML'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .html
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-xs text-slate-500">
              <span>Zero external dependencies in exported HTML</span>
              <span>Client-side frame extraction</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
