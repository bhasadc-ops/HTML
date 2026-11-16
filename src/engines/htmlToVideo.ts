import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import {
  HtmlToVideoProgress,
  HtmlToVideoSettings,
  RenderedVideoResult,
  VideoContainerFormat,
} from '../types/converter';

const VIRTUAL_TIME_SHIM = `
<script data-fd-shim="true">
(function() {
  var origPerfNow = performance.now.bind(performance);
  var origDateNow = Date.now.bind(Date);
  var origRAF = window.requestAnimationFrame.bind(window);
  var origCancelRAF = window.cancelAnimationFrame.bind(window);
  var baseDate = origDateNow();
  var nextRafId = 1;
  var rafQueue = new Map();

  window.__fdStepping = true;
  window.__fdNowMs = 0;

  performance.now = function() {
    return window.__fdStepping ? window.__fdNowMs : origPerfNow();
  };
  Date.now = function() {
    return window.__fdStepping ? (baseDate + window.__fdNowMs) : origDateNow();
  };
  window.requestAnimationFrame = function(cb) {
    if (!window.__fdStepping) return origRAF(cb);
    var id = nextRafId++;
    rafQueue.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = function(id) {
    if (!window.__fdStepping) return origCancelRAF(id);
    rafQueue.delete(id);
  };
  window.__fdStepTo = function(tMs, totalMs) {
    window.__fdNowMs = tMs;
    var pending = Array.from(rafQueue.entries());
    rafQueue.clear();
    for (var i = 0; i < pending.length; i++) {
      try { pending[i][1](tMs); } catch (e) {}
    }
    if (typeof window.renderFrame === 'function') {
      try { window.renderFrame(tMs / 1000, totalMs > 0 ? tMs / totalMs : 0); } catch (e) {}
    }
    if (typeof window.onRenderFrame === 'function') {
      try { window.onRenderFrame(tMs / 1000, totalMs > 0 ? tMs / totalMs : 0); } catch (e) {}
    }
  };
})();
</script>
`;

export function normalizeHtmlDocument(rawHtml: string, injectShim: boolean): string {
  const trimmed = rawHtml.trim();
  let docHtml = trimmed;

  if (!/<html[\s>]/i.test(docHtml)) {
    docHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
${docHtml}
</body>
</html>`;
  }

  if (!injectShim) return docHtml;

  if (/<head[^>]*>/i.test(docHtml)) {
    return docHtml.replace(/<head[^>]*>/i, (match) => `${match}\n${VIRTUAL_TIME_SHIM}`);
  }
  if (/<html[^>]*>/i.test(docHtml)) {
    return docHtml.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${VIRTUAL_TIME_SHIM}</head>`);
  }
  return `${VIRTUAL_TIME_SHIM}\n${docHtml}`;
}

const ANIMATABLE_PROPS = [
  'transform',
  'transformOrigin',
  'opacity',
  'filter',
  'clipPath',
  'backgroundColor',
  'backgroundImage',
  'backgroundPosition',
  'backgroundSize',
  'color',
  'width',
  'height',
  'top',
  'left',
  'right',
  'bottom',
  'borderRadius',
  'borderColor',
  'borderWidth',
  'boxShadow',
  'letterSpacing',
  'fontSize',
  'strokeDashoffset',
  'strokeDasharray',
  'fill',
  'stroke',
  'strokeWidth',
  'visibility',
] as const;

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function loadSvgImage(svgMarkup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch {
        // decode may throw on some SVG data URLs even when loaded
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to rasterize SVG frame snapshot'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  });
}

async function captureIframeFrameToCanvas(
  iframe: HTMLIFrameElement,
  targetCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  tMs: number,
  totalMs: number,
  backgroundColor: string
): Promise<void> {
  const win = iframe.contentWindow as (Window & { __fdStepTo?: (t: number, total: number) => void }) | null;
  const doc = iframe.contentDocument;
  if (!win || !doc || !doc.documentElement) {
    throw new Error('Render stage document is unavailable.');
  }

  // 1. Advance virtual clock + RAF + user hooks
  if (typeof win.__fdStepTo === 'function') {
    win.__fdStepTo(tMs, totalMs);
  }

  // 2. Seek all CSS / Web Animations deterministically
  const anims = typeof doc.getAnimations === 'function' ? doc.getAnimations() : [];
  const animatedElementProps = new Map<Element, { pseudo: string | null; cssText: string }[]>();

  for (const anim of anims) {
    try {
      if (anim.playState !== 'paused') {
        anim.pause();
      }
      anim.currentTime = tMs;
    } catch {
      // Ignore animations whose timelines do not support seeking
    }
  }

  // Force layout & style flush at timestamp tMs
  void doc.documentElement.offsetHeight;

  for (const anim of anims) {
    const effect = anim.effect;
    if (effect && 'target' in effect) {
      const kf = effect as KeyframeEffect;
      const target = kf.target;
      if (target && target instanceof doc.defaultView!.Element) {
        const pseudo = kf.pseudoElement || null;
        const cs = win.getComputedStyle(target, pseudo);
        let cssText = '';
        for (const prop of ANIMATABLE_PROPS) {
          const kebab = camelToKebab(prop);
          const val = cs.getPropertyValue(kebab);
          if (val) {
            cssText += `${kebab}:${val};`;
          }
        }
        const list = animatedElementProps.get(target) || [];
        list.push({ pseudo, cssText });
        animatedElementProps.set(target, list);
      }
    }
  }

  // 3. Snapshot all <canvas> elements in live DOM
  const origCanvases = Array.from(doc.querySelectorAll('canvas'));
  const canvasSnapshots = origCanvases.map((c) => {
    const cs = win.getComputedStyle(c);
    let dataUrl = '';
    try {
      dataUrl = c.toDataURL('image/png');
    } catch {
      dataUrl = '';
    }
    return {
      dataUrl,
      width: c.width,
      height: c.height,
      cssText: cs.cssText || `width:${cs.width};height:${cs.height};display:${cs.display};`,
    };
  });

  // 4. Clone DOM cleanly
  const cloneRoot = doc.documentElement.cloneNode(true) as HTMLElement;

  // Walk original & clone elements in parallel to apply frozen animated styles
  const origAll = Array.from(doc.documentElement.querySelectorAll('*'));
  const cloneAll = Array.from(cloneRoot.querySelectorAll('*'));

  const pseudoRules: string[] = [];
  let pseudoCounter = 0;

  if (animatedElementProps.has(doc.documentElement)) {
    const entries = animatedElementProps.get(doc.documentElement)!;
    for (const entry of entries) {
      if (!entry.pseudo) {
        cloneRoot.setAttribute('style', `${cloneRoot.getAttribute('style') || ''};${entry.cssText}`);
      }
    }
  }

  for (let i = 0; i < origAll.length && i < cloneAll.length; i++) {
    const origEl = origAll[i];
    const cloneEl = cloneAll[i] as HTMLElement;
    const entries = animatedElementProps.get(origEl);
    if (entries) {
      for (const entry of entries) {
        if (!entry.pseudo) {
          cloneEl.setAttribute('style', `${cloneEl.getAttribute('style') || ''};${entry.cssText}`);
        } else {
          const pid = `fd-p-${pseudoCounter++}`;
          cloneEl.setAttribute('data-fd-pseudo', pid);
          pseudoRules.push(`[data-fd-pseudo="${pid}"]${entry.pseudo} { ${entry.cssText} }`);
        }
      }
    }
  }

  // Replace cloned <canvas> nodes with <img> snapshots
  const cloneCanvases = Array.from(cloneRoot.querySelectorAll('canvas'));
  for (let i = 0; i < cloneCanvases.length && i < canvasSnapshots.length; i++) {
    const cNode = cloneCanvases[i];
    const snap = canvasSnapshots[i];
    if (snap.dataUrl) {
      const imgEl = doc.createElement('img');
      imgEl.setAttribute('src', snap.dataUrl);
      const existingStyle = cNode.getAttribute('style') || '';
      const existingClass = cNode.getAttribute('class') || '';
      if (existingClass) imgEl.setAttribute('class', existingClass);
      imgEl.setAttribute('style', `${snap.cssText};${existingStyle}`);
      cNode.parentNode?.replaceChild(imgEl, cNode);
    }
  }

  // Strip scripts so XML serialization & SVG foreignObject stay clean
  cloneRoot.querySelectorAll('script, noscript').forEach((el) => el.remove());

  // Freeze CSS animations/transitions in the serialized frame
  const freezeStyle = doc.createElement('style');
  freezeStyle.textContent = `
    html, body { width: ${width}px; height: ${height}px; margin: 0; padding: 0; overflow: hidden; }
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
    ${pseudoRules.join('\n')}
  `;
  const cloneHead = cloneRoot.querySelector('head');
  if (cloneHead) {
    cloneHead.appendChild(freezeStyle);
  } else {
    cloneRoot.insertBefore(freezeStyle, cloneRoot.firstChild);
  }

  cloneRoot.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const serializedHtml = new XMLSerializer().serializeToString(cloneRoot);

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="100%" height="100%">
    ${serializedHtml}
  </foreignObject>
</svg>`;

  const img = await loadSvgImage(svgMarkup);
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable.');
  ctx.fillStyle = backgroundColor || '#0f172a';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
}

function createHiddenRenderIframe(html: string, width: number, height: number): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.style.position = 'fixed';
    iframe.style.left = '-99999px';
    iframe.style.top = '0px';
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.border = 'none';
    iframe.style.opacity = '1';
    iframe.style.pointerEvents = 'none';

    const timeout = window.setTimeout(() => {
      reject(new Error('Timed out waiting for HTML stage to load.'));
    }, 8000);

    iframe.onload = () => {
      window.clearTimeout(timeout);
      // Allow initial scripts/fonts a brief tick to initialize
      window.setTimeout(() => resolve(iframe), 60);
    };

    iframe.srcdoc = normalizeHtmlDocument(html, true);
    document.body.appendChild(iframe);
  });
}

async function pickWebCodecsConfig(
  format: VideoContainerFormat,
  width: number,
  height: number,
  fps: number
): Promise<{
  format: VideoContainerFormat;
  webCodecsCodec: string;
  muxerCodec: string;
  bitrate: number;
} | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }

  const pixels = width * height;
  const bitrate = Math.min(12_000_000, Math.max(2_500_000, Math.round(pixels * fps * 0.14)));

  const candidates =
    format === 'mp4'
      ? [
          { format: 'mp4' as const, webCodecsCodec: 'avc1.4d002a', muxerCodec: 'avc' },
          { format: 'mp4' as const, webCodecsCodec: 'avc1.42001f', muxerCodec: 'avc' },
          { format: 'mp4' as const, webCodecsCodec: 'avc1.640028', muxerCodec: 'avc' },
        ]
      : [
          { format: 'webm' as const, webCodecsCodec: 'vp09.00.10.08', muxerCodec: 'V_VP9' },
          { format: 'webm' as const, webCodecsCodec: 'vp8', muxerCodec: 'V_VP8' },
        ];

  for (const c of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: c.webCodecsCodec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (support.supported) {
        return { ...c, bitrate };
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

export async function renderHtmlToVideo(
  html: string,
  settings: HtmlToVideoSettings,
  onProgress?: (progress: HtmlToVideoProgress) => void,
  abortSignal?: AbortSignal
): Promise<RenderedVideoResult> {
  const startTime = performance.now();
  const safeWidth = settings.width % 2 === 0 ? settings.width : settings.width - 1;
  const safeHeight = settings.height % 2 === 0 ? settings.height : settings.height - 1;
  const fps = Math.max(1, Math.min(60, Math.round(settings.fps)));
  const totalFrames = Math.max(2, Math.round(settings.durationSec * fps));
  const totalMs = settings.durationSec * 1000;

  onProgress?.({
    phase: 'preparing',
    currentFrame: 0,
    totalFrames,
    percent: 0,
    elapsedMs: 0,
  });

  const iframe = await createHiddenRenderIframe(html, safeWidth, safeHeight);
  const canvas = document.createElement('canvas');
  canvas.width = safeWidth;
  canvas.height = safeHeight;

  try {
    let codecConfig = await pickWebCodecsConfig(settings.format, safeWidth, safeHeight, fps);
    // If MP4 H.264 isn't supported in WebCodecs, try WebM VP9/VP8 via WebCodecs before MediaRecorder fallback
    if (!codecConfig && settings.format === 'mp4') {
      codecConfig = await pickWebCodecsConfig('webm', safeWidth, safeHeight, fps);
    }

    if (codecConfig) {
      return await encodeWithWebCodecs({
        iframe,
        canvas,
        width: safeWidth,
        height: safeHeight,
        fps,
        totalFrames,
        totalMs,
        durationSec: settings.durationSec,
        backgroundColor: settings.backgroundColor,
        codecConfig,
        startTime,
        onProgress,
        abortSignal,
      });
    }

    return await encodeWithMediaRecorder({
      iframe,
      canvas,
      width: safeWidth,
      height: safeHeight,
      fps,
      totalFrames,
      totalMs,
      durationSec: settings.durationSec,
      requestedFormat: settings.format,
      backgroundColor: settings.backgroundColor,
      startTime,
      onProgress,
      abortSignal,
    });
  } finally {
    iframe.remove();
  }
}

async function encodeWithWebCodecs(params: {
  iframe: HTMLIFrameElement;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  totalMs: number;
  durationSec: number;
  backgroundColor: string;
  codecConfig: {
    format: VideoContainerFormat;
    webCodecsCodec: string;
    muxerCodec: string;
    bitrate: number;
  };
  startTime: number;
  onProgress?: (p: HtmlToVideoProgress) => void;
  abortSignal?: AbortSignal;
}): Promise<RenderedVideoResult> {
  const {
    iframe,
    canvas,
    width,
    height,
    fps,
    totalFrames,
    totalMs,
    durationSec,
    backgroundColor,
    codecConfig,
    startTime,
    onProgress,
    abortSignal,
  } = params;

  const isMp4 = codecConfig.format === 'mp4';
  const mp4Target = isMp4 ? new Mp4ArrayBufferTarget() : null;
  const webmTarget = !isMp4 ? new WebmArrayBufferTarget() : null;

  const mp4Muxer = isMp4
    ? new Mp4Muxer({
        target: mp4Target!,
        video: {
          codec: 'avc',
          width,
          height,
          frameRate: fps,
        },
        fastStart: 'in-memory',
      })
    : null;

  const webmMuxer = !isMp4
    ? new WebmMuxer({
        target: webmTarget!,
        video: {
          codec: codecConfig.muxerCodec,
          width,
          height,
          frameRate: fps,
        },
      })
    : null;

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      if (mp4Muxer) {
        mp4Muxer.addVideoChunk(chunk, meta);
      } else if (webmMuxer) {
        webmMuxer.addVideoChunk(chunk, meta);
      }
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  encoder.configure({
    codec: codecConfig.webCodecsCodec,
    width,
    height,
    bitrate: codecConfig.bitrate,
    framerate: fps,
  });

  const frameDurationUs = Math.round(1_000_000 / fps);

  for (let i = 0; i < totalFrames; i++) {
    if (abortSignal?.aborted) {
      encoder.close();
      throw new DOMException('Render cancelled by user', 'AbortError');
    }
    if (encoderError) {
      throw encoderError;
    }

    const tMs = (i / fps) * 1000;
    await captureIframeFrameToCanvas(iframe, canvas, width, height, tMs, totalMs, backgroundColor);

    while (encoder.encodeQueueSize > 8) {
      await new Promise((r) => setTimeout(r, 4));
    }

    const timestampUs = Math.round(i * (1_000_000 / fps));
    const vf = new VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: frameDurationUs,
    });
    encoder.encode(vf, { keyFrame: i % Math.max(1, fps) === 0 });
    vf.close();

    onProgress?.({
      phase: 'rendering',
      currentFrame: i + 1,
      totalFrames,
      percent: Math.round(((i + 1) / totalFrames) * 94),
      elapsedMs: performance.now() - startTime,
    });

    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.({
    phase: 'muxing',
    currentFrame: totalFrames,
    totalFrames,
    percent: 97,
    elapsedMs: performance.now() - startTime,
  });

  await encoder.flush();
  encoder.close();

  if (mp4Muxer && mp4Target) {
    mp4Muxer.finalize();
    const blob = new Blob([mp4Target.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    return {
      blob,
      url,
      format: 'mp4',
      codec: `H.264 (${codecConfig.webCodecsCodec})`,
      width,
      height,
      fps,
      durationSec,
      totalFrames,
      renderTimeMs: performance.now() - startTime,
      encoderBackend: 'webcodecs',
    };
  }

  webmMuxer!.finalize();
  const blob = new Blob([webmTarget!.buffer], { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  return {
    blob,
    url,
    format: 'webm',
    codec: codecConfig.muxerCodec === 'V_VP9' ? 'VP9' : 'VP8',
    width,
    height,
    fps,
    durationSec,
    totalFrames,
    renderTimeMs: performance.now() - startTime,
    encoderBackend: 'webcodecs',
  };
}

async function encodeWithMediaRecorder(params: {
  iframe: HTMLIFrameElement;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  totalMs: number;
  durationSec: number;
  requestedFormat: VideoContainerFormat;
  backgroundColor: string;
  startTime: number;
  onProgress?: (p: HtmlToVideoProgress) => void;
  abortSignal?: AbortSignal;
}): Promise<RenderedVideoResult> {
  const {
    iframe,
    canvas,
    width,
    height,
    fps,
    totalFrames,
    totalMs,
    durationSec,
    requestedFormat,
    backgroundColor,
    startTime,
    onProgress,
    abortSignal,
  } = params;

  const mimeCandidates =
    requestedFormat === 'mp4'
      ? ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

  const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const actualFormat: VideoContainerFormat = mimeType.includes('mp4') ? 'mp4' : 'webm';

  const stream = canvas.captureStream(fps);
  const track = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);
  const frameIntervalMs = 1000 / fps;

  for (let i = 0; i < totalFrames; i++) {
    if (abortSignal?.aborted) {
      recorder.stop();
      throw new DOMException('Render cancelled by user', 'AbortError');
    }

    const tMs = (i / fps) * 1000;
    const fStart = performance.now();
    await captureIframeFrameToCanvas(iframe, canvas, width, height, tMs, totalMs, backgroundColor);
    track?.requestFrame?.();

    onProgress?.({
      phase: 'rendering',
      currentFrame: i + 1,
      totalFrames,
      percent: Math.round(((i + 1) / totalFrames) * 95),
      elapsedMs: performance.now() - startTime,
    });

    const spent = performance.now() - fStart;
    const wait = Math.max(0, frameIntervalMs - spent);
    await new Promise((r) => setTimeout(r, wait));
  }

  onProgress?.({
    phase: 'muxing',
    currentFrame: totalFrames,
    totalFrames,
    percent: 98,
    elapsedMs: performance.now() - startTime,
  });

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    format: actualFormat,
    codec: mimeType,
    width,
    height,
    fps,
    durationSec,
    totalFrames,
    renderTimeMs: performance.now() - startTime,
    encoderBackend: 'mediarecorder',
  };
}
