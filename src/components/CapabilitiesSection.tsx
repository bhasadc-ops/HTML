import React from 'react';

export const CapabilitiesSection: React.FC = () => {
  return (
    <section id="architecture" className="pt-12 pb-16 border-t border-slate-200">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Conversion Pipeline Architecture
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          All encoding and frame extraction executes locally in your browser with zero server uploads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="text-xs text-slate-500 mb-2">01 · HTML to Video</div>
          <h3 className="text-base font-semibold text-slate-900">
            Deterministic Time-Stepped DOM Rasterization
          </h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Your markup mounts inside an isolated stage matching the exact target resolution. Each
            frame advances both a virtualized animation clock for requestAnimationFrame scripts and
            the Web Animations timeline for CSS keyframes, serializing frozen DOM snapshots and
            Canvas2D buffers into MP4 (H.264) or WebM (VP9) via WebCodecs.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="text-xs text-slate-500 mb-2">02 · Video to HTML</div>
          <h3 className="text-base font-semibold text-slate-900">
            Four Standalone HTML5 Output Formats
          </h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Uploaded MP4 or WebM streams are sampled at exact timecodes across your chosen trim
            interval and exported as a single self-contained .html file: an interactive Canvas frame
            player, a zero-JavaScript CSS sprite sheet, an SVG vector mosaic, or colored ASCII
            motion.
          </p>
        </div>
      </div>
    </section>
  );
};
