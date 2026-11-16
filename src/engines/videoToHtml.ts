import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import {
  GeneratedHtmlResult,
  VideoMetadata,
  VideoToHtmlProgress,
  VideoToHtmlSettings,
} from '../types/converter';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toCompactHex(r: number, g: number, b: number): string {
  const hr = Math.round(r / 17).toString(16);
  const hg = Math.round(g / 17).toString(16);
  const hb = Math.round(b / 17).toString(16);
  return `#${hr}${hg}${hb}`;
}

export async function readVideoMetadata(file: File | Blob, name = 'video.webm'): Promise<{
  metadata: VideoMetadata;
  objectUrl: string;
}> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Timed out reading video metadata.'));
    }, 10000);

    video.onloadedmetadata = async () => {
      if (!Number.isFinite(video.duration) || video.duration === 0) {
        // Probe duration for WebM blobs lacking header duration
        video.currentTime = 1e6;
        await new Promise<void>((r) => {
          const onSeek = () => {
            video.removeEventListener('seeked', onSeek);
            r();
          };
          video.addEventListener('seeked', onSeek);
          window.setTimeout(r, 800);
        });
        video.currentTime = 0;
      }
      window.clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Could not decode video file. Please try an MP4 or WebM file.'));
    };
  });

  const durationSec = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 3;
  return {
    objectUrl,
    metadata: {
      name: file instanceof File ? file.name : name,
      sizeBytes: file.size,
      durationSec,
      width: video.videoWidth || 640,
      height: video.videoHeight || 360,
      mimeType: file.type || 'video/webm',
    },
  };
}

export async function generateBuiltInSampleVideo(kind: 'geometry' | 'spectrum'): Promise<File> {
  const width = 640;
  const height = 360;
  const fps = 24;
  const durationSec = 3;
  const totalFrames = fps * durationSec;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const drawFrame = (idx: number) => {
    const t = idx / fps;
    const p = idx / totalFrames;

    if (kind === 'geometry') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Subtle architectural grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Orbiting geometric shapes
      const cx = width * 0.5;
      const cy = height * 0.5;
      for (let i = 0; i < 6; i++) {
        const angle = p * Math.PI * 2 + (i * Math.PI) / 3;
        const r = 82 + Math.sin(t * 3 + i) * 18;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        ctx.fillStyle = i % 2 === 0 ? '#2563eb' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, 20 + Math.cos(t * 4 + i) * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 42 + Math.sin(t * 4) * 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillText('FRAMEDOM SAMPLE // GEOMETRIC PULSE', 24, 38);
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, `hsl(${(p * 360) % 360}, 78%, 46%)`);
      grad.addColorStop(0.5, `hsl(${(p * 360 + 75) % 360}, 82%, 52%)`);
      grad.addColorStop(1, `hsl(${(p * 360 + 160) % 360}, 76%, 40%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Wave bars
      const bars = 24;
      const barW = (width - 80) / bars;
      for (let b = 0; b < bars; b++) {
        const val = 0.25 + 0.65 * Math.abs(Math.sin(t * 3.5 + b * 0.35));
        const bh = val * (height * 0.55);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.fillRect(40 + b * barW + 3, height - 48 - bh, barW - 6, bh);
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(24, 20, 290, 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText('COLOR SPECTRUM WAVEFORM', 36, 42);
    }
  };

  if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
    const vp8Support = await VideoEncoder.isConfigSupported({
      codec: 'vp8',
      width,
      height,
      bitrate: 2_200_000,
      framerate: fps,
    }).catch(() => ({ supported: false }));

    if (vp8Support.supported) {
      const target = new WebmArrayBufferTarget();
      const muxer = new WebmMuxer({
        target,
        video: { codec: 'V_VP8', width, height, frameRate: fps },
      });
      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: () => {},
      });
      encoder.configure({ codec: 'vp8', width, height, bitrate: 2_200_000, framerate: fps });

      for (let i = 0; i < totalFrames; i++) {
        drawFrame(i);
        const vf = new VideoFrame(canvas, {
          timestamp: Math.round(i * (1_000_000 / fps)),
          duration: Math.round(1_000_000 / fps),
        });
        encoder.encode(vf, { keyFrame: i % fps === 0 });
        vf.close();
      }
      await encoder.flush();
      encoder.close();
      muxer.finalize();
      return new File([target.buffer], `sample-${kind}.webm`, { type: 'video/webm' });
    }
  }

  // Fallback to MediaRecorder
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<void>((r) => {
    recorder.onstop = () => r();
  });
  recorder.start(100);
  for (let i = 0; i < totalFrames; i++) {
    drawFrame(i);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  recorder.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  return new File(chunks, `sample-${kind}.webm`, { type: 'video/webm' });
}

function seekVideoElement(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const clamped = Math.max(0, Math.min(Number.isFinite(video.duration) ? video.duration : timeSec, timeSec));
    if (Math.abs(video.currentTime - clamped) < 0.002 && video.readyState >= 2) {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, 1500);
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = clamped;
  });
}

function buildCanvasPlayerHtml(
  frames: string[],
  width: number,
  height: number,
  fps: number,
  settings: VideoToHtmlSettings,
  title: string
): string {
  const safeTitle = escapeHtml(title);
  const bg = settings.darkBackdrop ? '#0f172a' : '#f8fafc';
  const fg = settings.darkBackdrop ? '#f8fafc' : '#0f172a';
  const cardBg = settings.darkBackdrop ? '#1e293b' : '#ffffff';
  const border = settings.darkBackdrop ? '#334155' : '#e2e8f0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — HTML5 Frame Player</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bg};
      color: ${fg};
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
    }
    .player {
      width: 100%;
      max-width: ${width}px;
      background: ${cardBg};
      border: 1px solid ${border};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
    }
    canvas {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: ${width} / ${height};
      background: #000;
    }
    .controls {
      display: ${settings.showControls ? 'flex' : 'none'};
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-top: 1px solid ${border};
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }
    button {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    input[type="range"] {
      flex: 1;
      accent-color: #2563eb;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="player">
    <canvas id="stage" width="${width}" height="${height}"></canvas>
    <div class="controls">
      <button id="toggle">${settings.autoplay ? 'Pause' : 'Play'}</button>
      <input id="scrubber" type="range" min="0" max="${Math.max(0, frames.length - 1)}" value="0" />
      <span id="counter">1 / ${frames.length}</span>
    </div>
  </div>
  <script>
    (function() {
      var frames = ${JSON.stringify(frames)};
      var fps = ${fps};
      var shouldLoop = ${settings.loop};
      var playing = ${settings.autoplay};
      var canvas = document.getElementById('stage');
      var ctx = canvas.getContext('2d');
      var toggle = document.getElementById('toggle');
      var scrubber = document.getElementById('scrubber');
      var counter = document.getElementById('counter');

      var images = new Array(frames.length);
      var current = 0;
      var lastTick = 0;
      var interval = 1000 / fps;

      function draw(idx) {
        var img = images[idx];
        if (img && img.complete) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        scrubber.value = String(idx);
        counter.textContent = (idx + 1) + ' / ' + frames.length;
      }

      frames.forEach(function(src, i) {
        var img = new Image();
        img.onload = function() { if (i === current) draw(i); };
        img.src = src;
        images[i] = img;
      });

      function tick(now) {
        if (playing && now - lastTick >= interval) {
          lastTick = now;
          current++;
          if (current >= frames.length) {
            if (shouldLoop) {
              current = 0;
            } else {
              current = frames.length - 1;
              playing = false;
              toggle.textContent = 'Play';
            }
          }
          draw(current);
        }
        requestAnimationFrame(tick);
      }

      toggle.addEventListener('click', function() {
        playing = !playing;
        if (playing && current >= frames.length - 1) current = 0;
        toggle.textContent = playing ? 'Pause' : 'Play';
      });

      scrubber.addEventListener('input', function(e) {
        playing = false;
        toggle.textContent = 'Play';
        current = Number(e.target.value) || 0;
        draw(current);
      });

      requestAnimationFrame(tick);
    })();
  </script>
</body>
</html>`;
}

function buildCssSpriteHtml(
  spriteDataUrl: string,
  frameCount: number,
  frameWidth: number,
  frameHeight: number,
  durationSec: number,
  settings: VideoToHtmlSettings,
  title: string
): string {
  const safeTitle = escapeHtml(title);
  const bg = settings.darkBackdrop ? '#0f172a' : '#f8fafc';
  const iter = settings.loop ? 'infinite' : '1 forwards';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — Pure CSS Sprite Animation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bg};
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .viewport {
      width: 100%;
      max-width: ${frameWidth}px;
      aspect-ratio: ${frameWidth} / ${frameHeight};
      overflow: hidden;
      border-radius: 10px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
      background: #000;
    }
    .strip {
      width: ${frameCount * 100}%;
      height: 100%;
      background-image: url("${spriteDataUrl}");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      animation: playSprite ${durationSec.toFixed(3)}s steps(${frameCount}, end) ${iter};
      animation-play-state: ${settings.autoplay ? 'running' : 'paused'};
    }
    .viewport:hover .strip {
      animation-play-state: running;
    }
    @keyframes playSprite {
      from { transform: translateX(0%); }
      to { transform: translateX(-100%); }
    }
  </style>
</head>
<body>
  <div class="viewport" title="Zero-JS CSS Sprite Animation">
    <div class="strip"></div>
  </div>
</body>
</html>`;
}

function buildSvgMosaicHtml(
  frameGrids: string[][],
  cols: number,
  rows: number,
  width: number,
  height: number,
  fps: number,
  settings: VideoToHtmlSettings,
  title: string
): string {
  const safeTitle = escapeHtml(title);
  const bg = settings.darkBackdrop ? '#0f172a' : '#f8fafc';
  const rects: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const fill = frameGrids[0]?.[idx] || '#000';
      rects.push(`<rect x="${c}" y="${r}" width="1.04" height="1.04" fill="${fill}"/>`);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — SVG Vector Mosaic</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bg};
      padding: 20px;
    }
    svg {
      width: 100%;
      max-width: ${width}px;
      height: auto;
      aspect-ratio: ${width} / ${height};
      border-radius: 10px;
      display: block;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    }
  </style>
</head>
<body>
  <svg id="mosaic" viewBox="0 0 ${cols} ${rows}" shape-rendering="crispEdges">
    ${rects.join('')}
  </svg>
  <script>
    (function() {
      var frames = ${JSON.stringify(frameGrids)};
      var fps = ${fps};
      var loop = ${settings.loop};
      var playing = ${settings.autoplay};
      var rects = document.getElementById('mosaic').querySelectorAll('rect');
      var idx = 0;
      var last = 0;
      var step = 1000 / fps;
      function tick(now) {
        if (playing && now - last >= step) {
          last = now;
          var colors = frames[idx];
          for (var i = 0; i < rects.length; i++) {
            rects[i].setAttribute('fill', colors[i]);
          }
          idx++;
          if (idx >= frames.length) {
            idx = loop ? 0 : frames.length - 1;
            if (!loop) playing = false;
          }
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    })();
  </script>
</body>
</html>`;
}

function buildAsciiHtml(
  asciiFrames: string[],
  cols: number,
  rows: number,
  fps: number,
  settings: VideoToHtmlSettings,
  title: string
): string {
  const safeTitle = escapeHtml(title);
  const bg = settings.darkBackdrop ? '#090d16' : '#f8fafc';
  const cardBg = settings.darkBackdrop ? '#0f172a' : '#ffffff';
  const border = settings.darkBackdrop ? '#1e293b' : '#e2e8f0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — Color ASCII HTML</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bg};
      padding: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .frame-box {
      background: ${cardBg};
      border: 1px solid ${border};
      border-radius: 10px;
      padding: 14px;
      overflow: hidden;
      max-width: 100%;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    }
    pre {
      font-family: inherit;
      font-size: clamp(5px, ${Math.max(0.7, 92 / cols).toFixed(2)}vw, 12px);
      line-height: 1.05;
      letter-spacing: 0.08em;
      white-space: pre;
      user-select: none;
    }
  </style>
</head>
<body>
  <div class="frame-box" data-cols="${cols}" data-rows="${rows}">
    <pre id="ascii"></pre>
  </div>
  <script>
    (function() {
      var frames = ${JSON.stringify(asciiFrames)};
      var fps = ${fps};
      var loop = ${settings.loop};
      var playing = ${settings.autoplay};
      var pre = document.getElementById('ascii');
      var idx = 0;
      var last = 0;
      var step = 1000 / fps;
      pre.innerHTML = frames[0] || '';
      function tick(now) {
        if (playing && now - last >= step) {
          last = now;
          pre.innerHTML = frames[idx];
          idx++;
          if (idx >= frames.length) {
            idx = loop ? 0 : frames.length - 1;
            if (!loop) playing = false;
          }
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    })();
  </script>
</body>
</html>`;
}

export async function convertVideoToHtml(
  videoUrl: string,
  meta: VideoMetadata,
  settings: VideoToHtmlSettings,
  onProgress?: (progress: VideoToHtmlProgress) => void,
  abortSignal?: AbortSignal
): Promise<GeneratedHtmlResult> {
  const startTime = performance.now();

  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Video load timed out')), 10000);
    video.onloadeddata = () => {
      window.clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Failed to load video stream'));
    };
  });

  const startSec = Math.max(0, Math.min(meta.durationSec, settings.startTime));
  const endSec = Math.max(startSec + 0.1, Math.min(meta.durationSec, settings.endTime));
  const spanSec = endSec - startSec;
  const fps = Math.max(2, Math.min(30, Math.round(settings.fps)));
  const totalFrames = Math.max(2, Math.min(180, Math.round(spanSec * fps)));

  const aspect = meta.height / Math.max(1, meta.width);
  let targetW = Math.max(120, Math.min(960, Math.round(settings.outputWidth)));
  if (settings.mode === 'css-sprite') {
    // Keep horizontal sprite sheet width safely inside GPU texture bounds (<= 8192px)
    const maxPerFrame = Math.floor(8192 / totalFrames);
    targetW = Math.max(96, Math.min(targetW, maxPerFrame));
  }
  const targetH = Math.max(68, Math.round(targetW * aspect));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = targetW;
  workCanvas.height = targetH;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })!;

  const mimeType = workCanvas.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';

  // Mode-specific accumulators
  const rasterFrames: string[] = [];
  const spriteCanvas = settings.mode === 'css-sprite' ? document.createElement('canvas') : null;
  if (spriteCanvas) {
    spriteCanvas.width = targetW * totalFrames;
    spriteCanvas.height = targetH;
  }
  const spriteCtx = spriteCanvas?.getContext('2d');

  const mosaicCols = Math.round(18 + settings.quality * 28);
  const mosaicRows = Math.max(10, Math.round(mosaicCols * aspect));
  const mosaicFrames: string[][] = [];

  const asciiCols = Math.round(42 + settings.quality * 46);
  const asciiRows = Math.max(14, Math.round(asciiCols * aspect * 0.52));
  const asciiFrames: string[] = [];
  const ramp = ' .:-=+*#%@';

  const sampleCanvas =
    settings.mode === 'svg-mosaic' || settings.mode === 'ascii-art'
      ? document.createElement('canvas')
      : null;
  if (sampleCanvas) {
    sampleCanvas.width = settings.mode === 'svg-mosaic' ? mosaicCols : asciiCols;
    sampleCanvas.height = settings.mode === 'svg-mosaic' ? mosaicRows : asciiRows;
  }
  const sampleCtx = sampleCanvas?.getContext('2d', { willReadFrequently: true });

  for (let i = 0; i < totalFrames; i++) {
    if (abortSignal?.aborted) {
      throw new DOMException('Conversion cancelled by user', 'AbortError');
    }

    const t = startSec + (i / Math.max(1, totalFrames - 1)) * spanSec;
    await seekVideoElement(video, t);
    ctx.drawImage(video, 0, 0, targetW, targetH);

    if (settings.mode === 'canvas-player') {
      rasterFrames.push(workCanvas.toDataURL(mimeType, settings.quality));
    } else if (settings.mode === 'css-sprite' && spriteCtx) {
      spriteCtx.drawImage(workCanvas, i * targetW, 0, targetW, targetH);
    } else if (settings.mode === 'svg-mosaic' && sampleCtx && sampleCanvas) {
      sampleCtx.drawImage(workCanvas, 0, 0, mosaicCols, mosaicRows);
      const data = sampleCtx.getImageData(0, 0, mosaicCols, mosaicRows).data;
      const grid: string[] = [];
      for (let p = 0; p < data.length; p += 4) {
        grid.push(toCompactHex(data[p], data[p + 1], data[p + 2]));
      }
      mosaicFrames.push(grid);
    } else if (settings.mode === 'ascii-art' && sampleCtx && sampleCanvas) {
      sampleCtx.drawImage(workCanvas, 0, 0, asciiCols, asciiRows);
      const data = sampleCtx.getImageData(0, 0, asciiCols, asciiRows).data;
      let htmlFrame = '';
      for (let r = 0; r < asciiRows; r++) {
        for (let c = 0; c < asciiCols; c++) {
          const offset = (r * asciiCols + c) * 4;
          const rv = data[offset];
          const gv = data[offset + 1];
          const bv = data[offset + 2];
          const luma = (0.299 * rv + 0.587 * gv + 0.114 * bv) / 255;
          const charIdx = Math.min(ramp.length - 1, Math.floor(luma * ramp.length));
          const ch = ramp[charIdx];
          if (ch === ' ') {
            htmlFrame += ' ';
          } else {
            const hex = toCompactHex(rv, gv, bv);
            htmlFrame += `<span style="color:${hex}">${ch}</span>`;
          }
        }
        if (r < asciiRows - 1) htmlFrame += '\n';
      }
      asciiFrames.push(htmlFrame);
    }

    onProgress?.({
      phase: 'extracting',
      currentFrame: i + 1,
      totalFrames,
      percent: Math.round(((i + 1) / totalFrames) * 90),
    });

    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.({
    phase: 'compiling',
    currentFrame: totalFrames,
    totalFrames,
    percent: 96,
  });

  let html = '';
  if (settings.mode === 'canvas-player') {
    html = buildCanvasPlayerHtml(rasterFrames, targetW, targetH, fps, settings, meta.name);
  } else if (settings.mode === 'css-sprite' && spriteCanvas) {
    const spriteUrl = spriteCanvas.toDataURL(mimeType, settings.quality);
    html = buildCssSpriteHtml(spriteUrl, totalFrames, targetW, targetH, spanSec, settings, meta.name);
  } else if (settings.mode === 'svg-mosaic') {
    html = buildSvgMosaicHtml(mosaicFrames, mosaicCols, mosaicRows, targetW, targetH, fps, settings, meta.name);
  } else {
    html = buildAsciiHtml(asciiFrames, asciiCols, asciiRows, fps, settings, meta.name);
  }

  const byteSize = new Blob([html]).size;
  return {
    html,
    mode: settings.mode,
    frameCount: totalFrames,
    width: targetW,
    height: targetH,
    fps,
    durationSec: spanSec,
    byteSize,
    generationTimeMs: performance.now() - startTime,
  };
}
