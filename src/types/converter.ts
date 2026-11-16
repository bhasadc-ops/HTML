export type WorkspaceMode = 'html-to-video' | 'video-to-html';

export type VideoContainerFormat = 'webm' | 'mp4';

export type ResolutionPresetId = '1280x720' | '1920x1080' | '1080x1080' | '1080x1920' | '800x600';

export interface ResolutionPreset {
  id: ResolutionPresetId;
  label: string;
  width: number;
  height: number;
  aspect: string;
}

export interface HtmlToVideoSettings {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  format: VideoContainerFormat;
  backgroundColor: string;
}

export interface HtmlToVideoProgress {
  phase: 'preparing' | 'rendering' | 'muxing';
  currentFrame: number;
  totalFrames: number;
  percent: number;
  elapsedMs: number;
}

export interface RenderedVideoResult {
  blob: Blob;
  url: string;
  format: VideoContainerFormat;
  codec: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  renderTimeMs: number;
  encoderBackend: 'webcodecs' | 'mediarecorder';
}

export type VideoToHtmlMode = 'canvas-player' | 'css-sprite' | 'svg-mosaic' | 'ascii-art';

export interface VideoToHtmlSettings {
  mode: VideoToHtmlMode;
  fps: number;
  outputWidth: number;
  quality: number; // 0.35 - 0.95 for raster modes, or grid density for mosaic/ascii
  startTime: number;
  endTime: number;
  autoplay: boolean;
  loop: boolean;
  showControls: boolean;
  darkBackdrop: boolean;
}

export interface VideoMetadata {
  name: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  mimeType: string;
}

export interface VideoToHtmlProgress {
  phase: 'extracting' | 'compiling';
  currentFrame: number;
  totalFrames: number;
  percent: number;
}

export interface GeneratedHtmlResult {
  html: string;
  mode: VideoToHtmlMode;
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  byteSize: number;
  generationTimeMs: number;
}

export interface HtmlTemplate {
  id: string;
  title: string;
  category: string;
  recommendedDuration: number;
  description: string;
  html: string;
}
