import { useCallback, useRef, useState } from 'react';
import { CapabilitiesSection } from './components/CapabilitiesSection';
import { HtmlToVideoPanel } from './components/HtmlToVideoPanel';
import { TemplatesGallery } from './components/TemplatesGallery';
import { TopBar } from './components/TopBar';
import { VideoToHtmlPanel } from './components/VideoToHtmlPanel';
import { HTML_TEMPLATES } from './data/htmlTemplates';
import { HtmlTemplate, WorkspaceMode } from './types/converter';

export default function App() {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('html-to-video');
  const [htmlCode, setHtmlCode] = useState<string>(HTML_TEMPLATES[0].html);
  const [incomingVideo, setIncomingVideo] = useState<{
    blob: Blob;
    name: string;
    key: number;
  } | null>(null);

  const [isHtmlRendering, setIsHtmlRendering] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const triggerHtmlRenderRef = useRef<(() => void) | null>(null);
  const triggerVideoConvertRef = useRef<(() => void) | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  const handleNavigateSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handlePrimaryAction = useCallback(() => {
    if (activeMode === 'html-to-video') {
      triggerHtmlRenderRef.current?.();
    } else {
      triggerVideoConvertRef.current?.();
    }
  }, [activeMode]);

  const handleSendVideoToHtml = useCallback(
    (blob: Blob, name: string) => {
      setIncomingVideo({ blob, name, key: Date.now() });
      setActiveMode('video-to-html');
      handleNavigateSection('studio');
      showNotice(`Loaded ${name} into Video to HTML studio.`);
    },
    [handleNavigateSection, showNotice]
  );

  const handleSendHtmlToVideo = useCallback(
    (html: string) => {
      setHtmlCode(html);
      setActiveMode('html-to-video');
      handleNavigateSection('studio');
      showNotice('Loaded generated HTML into HTML to Video studio.');
    },
    [handleNavigateSection, showNotice]
  );

  const handleSelectTemplate = useCallback(
    (template: HtmlTemplate) => {
      setHtmlCode(template.html);
      setActiveMode('html-to-video');
      handleNavigateSection('studio');
      showNotice(`Loaded template: ${template.title}.`);
    },
    [handleNavigateSection, showNotice]
  );

  const primaryLabel =
    activeMode === 'html-to-video'
      ? isHtmlRendering
        ? 'Rendering...'
        : 'Render Video'
      : isVideoGenerating
        ? 'Generating...'
        : 'Generate HTML';

  const primaryDisabled =
    activeMode === 'html-to-video' ? isHtmlRendering : isVideoGenerating;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        onNavigateSection={handleNavigateSection}
        onPrimaryAction={handlePrimaryAction}
        primaryLabel={primaryLabel}
        primaryDisabled={primaryDisabled}
      />

      <main id="studio" className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        {/* Studio Header & Bidirectional Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-7">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              Bidirectional HTML &amp; Video Converter
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1.5">
              Render animated HTML, CSS, SVG, and Canvas documents to MP4 or WebM video, or compile
              uploaded video clips into standalone HTML5 output.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode('html-to-video')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeMode === 'html-to-video'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HTML → Video
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('video-to-html')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeMode === 'video-to-html'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Video → HTML
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="mb-5 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center justify-between"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-blue-700 hover:text-blue-900 ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Keep both workspaces mounted so round-trip state & rendered outputs persist */}
        <div className={activeMode === 'html-to-video' ? 'block' : 'hidden'}>
          <HtmlToVideoPanel
            htmlCode={htmlCode}
            onChangeHtmlCode={setHtmlCode}
            onSendVideoToHtml={handleSendVideoToHtml}
            triggerRenderRef={triggerHtmlRenderRef}
            onRenderingStateChange={setIsHtmlRendering}
          />
        </div>

        <div className={activeMode === 'video-to-html' ? 'block' : 'hidden'}>
          <VideoToHtmlPanel
            incomingVideo={incomingVideo}
            onSendHtmlToVideo={handleSendHtmlToVideo}
            triggerConvertRef={triggerVideoConvertRef}
            onGeneratingStateChange={setIsVideoGenerating}
          />
        </div>

        <div className="mt-14 space-y-12">
          <TemplatesGallery onSelectTemplate={handleSelectTemplate} />
          <CapabilitiesSection />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>FrameDOM · Client-side HTML &amp; Video Conversion Studio</span>
          <span>Zero server uploads · MP4, WebM, Canvas, CSS Sprite, SVG &amp; ASCII</span>
        </div>
      </footer>
    </div>
  );
}
