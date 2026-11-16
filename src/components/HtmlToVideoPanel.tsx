import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Download,
  Film,
  Play,
  RotateCcw,
  Square,
  Upload,
} from 'lucide-react';
import { HTML_TEMPLATES, RESOLUTION_PRESETS } from '../data/htmlTemplates';
import { normalizeHtmlDocument, renderHtmlToVideo } from '../engines/htmlToVideo';
import {
  HtmlToVideoProgress,
  HtmlToVideoSettings,
  RenderedVideoResult,
  VideoContainerFormat,
} from '../types/converter';

interface HtmlToVideoPanelProps {
  htmlCode: string;
  onChangeHtmlCode: (code: string) => void;
  onSendVideoToHtml: (videoBlob: Blob, suggestedName: string) => void;
  triggerRenderRef: React.MutableRefObject<(() => void) | null>;
  onRenderingStateChange?: (isRendering: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const HtmlToVideoPanel: React.FC<HtmlToVideoPanelProps> = ({
  htmlCode,
  onChangeHtmlCode,
  onSendVideoToHtml,
  triggerRenderRef,
  onRenderingStateChange,
}) => {
  const [sourceTab, setSourceTab] = useState<'editor' | 'upload'>('editor');
  const [stageTab, setStageTab] = useState<'preview' | 'output'>('preview');
  const [settings, setSettings] = useState<HtmlToVideoSettings>({
    width: 1280,
    height: 720,
    fps: 30,
    durationSec: 4,
    format: 'mp4',
    backgroundColor: '#0f172a',
  });

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<HtmlToVideoProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<RenderedVideoResult | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [stageScale, setStageScale] = useState(0.45);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onRenderingStateChange?.(isRendering);
  }, [isRendering, onRenderingStateChange]);

  // Cleanup blob URL when replaced or unmounted
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  // Compute responsive scale for exact target resolution preview
  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const sx = rect.width / settings.width;
      const sy = rect.height / settings.height;
      setStageScale(Math.min(sx, sy));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [settings.width, settings.height, stageTab]);

  const activePresetId = useMemo(() => {
    const found = RESOLUTION_PRESETS.find(
      (p) => p.width === settings.width && p.height === settings.height
    );
    return found ? found.id : 'custom';
  }, [settings.width, settings.height]);

  const handleRender = async () => {
    if (isRendering) return;
    if (!htmlCode.trim()) {
      setErrorMsg('Provide HTML markup in the editor before rendering.');
      return;
    }

    setErrorMsg(null);
    setIsRendering(true);
    setProgress({
      phase: 'preparing',
      currentFrame: 0,
      totalFrames: Math.round(settings.durationSec * settings.fps),
      percent: 0,
      elapsedMs: 0,
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const rendered = await renderHtmlToVideo(
        htmlCode,
        settings,
        (p) => setProgress(p),
        controller.signal
      );
      setResult((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return rendered;
      });
      setStageTab('output');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMsg('Render cancelled.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to render HTML to video.');
      }
    } finally {
      setIsRendering(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    triggerRenderRef.current = handleRender;
  });

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const text = await file.text();
    onChangeHtmlCode(text);
    setSourceTab('editor');
    setPreviewKey((k) => k + 1);
    setErrorMsg(null);
  };

  const handleDownloadVideo = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `framedom-render-${result.width}x${result.height}.${result.format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const lineCount = useMemo(() => htmlCode.split('\n').length, [htmlCode]);
  const previewSrcDoc = useMemo(() => normalizeHtmlDocument(htmlCode, false), [htmlCode]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Column: Source Input & Render Settings */}
      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        {/* Source Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSourceTab('editor')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sourceTab === 'editor'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Code Editor
            </button>
            <button
              type="button"
              onClick={() => setSourceTab('upload')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sourceTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload .html
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              aria-label="Load HTML starter template"
              value=""
              onChange={(e) => {
                const tpl = HTML_TEMPLATES.find((t) => t.id === e.target.value);
                if (tpl) {
                  onChangeHtmlCode(tpl.html);
                  setSettings((s) => ({ ...s, durationSec: tpl.recommendedDuration }));
                  setPreviewKey((k) => k + 1);
                  setSourceTab('editor');
                }
              }}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-blue-600 cursor-pointer"
            >
              <option value="" disabled>
                Load Starter Template...
              </option>
              {HTML_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Editor or Upload Body */}
        {sourceTab === 'editor' ? (
          <div className="flex-1 flex flex-col min-h-[340px]">
            <div className="px-5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 tabular-nums">
              <span>HTML / CSS / JS Document</span>
              <div className="flex items-center gap-2">
                <span>{lineCount} lines</span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(new Blob([htmlCode]).size)}</span>
              </div>
            </div>
            <textarea
              aria-label="HTML source code editor"
              spellCheck={false}
              value={htmlCode}
              onChange={(e) => onChangeHtmlCode(e.target.value)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFileUpload(file);
              }}
              placeholder="Paste full HTML document or snippet with CSS animations, SVG, or Canvas..."
              className="flex-1 w-full min-h-[300px] p-5 bg-slate-950 text-slate-100 font-mono text-[13px] leading-relaxed resize-none focus:outline-none"
            />
          </div>
        ) : (
          <div className="flex-1 min-h-[340px] p-6 flex items-center justify-center bg-slate-50">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFileUpload(file);
              }}
              className="w-full max-w-md border border-dashed border-slate-300 bg-white rounded-xl p-8 text-center"
            >
              <Upload className="w-7 h-7 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">
                Drop an HTML file here
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Accepts standalone .html or .htm documents with inline styles and scripts.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Choose HTML File
              </button>
            </div>
          </div>
        )}

        {/* Render Settings Grid */}
        <div className="p-5 border-t border-slate-200 bg-white space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">Resolution</span>
              <select
                value={activePresetId}
                onChange={(e) => {
                  const preset = RESOLUTION_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) {
                    setSettings((s) => ({ ...s, width: preset.width, height: preset.height }));
                  }
                }}
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                {RESOLUTION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.width}×{p.height} ({p.aspect})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">Frame Rate</span>
              <select
                value={settings.fps}
                onChange={(e) => setSettings((s) => ({ ...s, fps: Number(e.target.value) }))}
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">Duration (sec)</span>
              <input
                type="number"
                min={1}
                max={20}
                step={0.5}
                value={settings.durationSec}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    durationSec: Math.max(1, Math.min(20, Number(e.target.value) || 4)),
                  }))
                }
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-blue-600"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">Container</span>
              <select
                value={settings.format}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, format: e.target.value as VideoContainerFormat }))
                }
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <option value="mp4">MP4 (H.264)</option>
                <option value="webm">WebM (VP9)</option>
              </select>
            </label>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          {/* Render Action & Progress */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="text-xs text-slate-500 tabular-nums">
              {isRendering && progress ? (
                <span>
                  {progress.phase === 'muxing'
                    ? 'Finalizing container'
                    : `Frame ${progress.currentFrame} of ${progress.totalFrames}`}{' '}
                  · {progress.percent}% · {(progress.elapsedMs / 1000).toFixed(1)}s
                </span>
              ) : (
                <span>
                  Output: {Math.round(settings.durationSec * settings.fps)} total frames ·{' '}
                  {settings.width}×{settings.height}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {isRendering ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  Cancel Render
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRender}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Film className="w-4 h-4" />
                  Render Video
                </button>
              )}
            </div>
          </div>

          {isRendering && progress && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-150"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Right Column: Live Stage & Rendered Video Output */}
      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setStageTab('preview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live HTML Stage
            </button>
            <button
              type="button"
              onClick={() => setStageTab('output')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageTab === 'output'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rendered Video {result ? `(${result.format.toUpperCase()})` : ''}
            </button>
          </div>

          {stageTab === 'preview' ? (
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Replay Stage
            </button>
          ) : (
            result && (
              <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                {result.width}×{result.height} · {formatBytes(result.blob.size)}
              </span>
            )
          )}
        </div>

        {/* Viewport Body */}
        <div className="flex-1 bg-slate-950 p-5 flex items-center justify-center min-h-[380px]">
          {stageTab === 'preview' ? (
            <div
              ref={stageContainerRef}
              className="w-full h-full min-h-[340px] flex items-center justify-center overflow-hidden"
            >
              <div
                style={{
                  width: `${settings.width}px`,
                  height: `${settings.height}px`,
                  transform: `scale(${stageScale})`,
                  transformOrigin: 'center center',
                }}
                className="shrink-0 bg-slate-900 shadow-2xl overflow-hidden rounded-sm ring-1 ring-white/10"
              >
                <iframe
                  key={previewKey}
                  title="Live HTML animation preview"
                  sandbox="allow-scripts"
                  srcDoc={previewSrcDoc}
                  style={{ width: `${settings.width}px`, height: `${settings.height}px` }}
                  className="border-0 block"
                />
              </div>
            </div>
          ) : result ? (
            <div className="w-full flex flex-col items-center justify-center gap-4">
              <video
                key={result.url}
                src={result.url}
                controls
                loop
                playsInline
                autoPlay
                className="max-h-[380px] w-auto max-w-full rounded-lg border border-slate-800 bg-black"
              />
            </div>
          ) : (
            <div className="text-center max-w-xs py-12">
              <Play className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-200">
                No rendered video yet
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Click Render Video to rasterize every frame from the HTML stage into an MP4 or WebM file.
              </p>
              <button
                type="button"
                onClick={handleRender}
                disabled={isRendering}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Render Video Now
              </button>
            </div>
          )}
        </div>

        {/* Output Telemetry & Export Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
          {result ? (
            <>
              <div className="text-xs text-slate-600 tabular-nums flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{result.codec}</span>
                <span aria-hidden="true">·</span>
                <span>{result.totalFrames} frames at {result.fps} fps</span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(result.blob.size)}</span>
                <span aria-hidden="true">·</span>
                <span>Rendered in {(result.renderTimeMs / 1000).toFixed(2)}s</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onSendVideoToHtml(
                      result.blob,
                      `framedom-render.${result.format}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Convert to HTML
                </button>
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download {result.format.toUpperCase()}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between text-xs text-slate-500 tabular-nums">
              <span>Stage Aspect: {settings.width}×{settings.height}</span>
              <span>Deterministic Web Animations + Canvas2D capture</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
