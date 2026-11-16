import React from 'react';
import { HTML_TEMPLATES } from '../data/htmlTemplates';
import { HtmlTemplate } from '../types/converter';

interface TemplatesGalleryProps {
  onSelectTemplate: (template: HtmlTemplate) => void;
}

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({ onSelectTemplate }) => {
  return (
    <section id="templates" className="pt-12 border-t border-slate-200">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Starter HTML Motion Templates
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Load any self-contained HTML animation into the studio to inspect, modify, or render to video.
          </p>
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          {HTML_TEMPLATES.length} templates ready
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {HTML_TEMPLATES.map((tpl, idx) => (
          <div
            key={tpl.id}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="text-xs text-slate-500 tabular-nums flex items-center gap-2 mb-2">
                <span>0{idx + 1}</span>
                <span aria-hidden="true">·</span>
                <span>{tpl.category}</span>
                <span aria-hidden="true">·</span>
                <span>{tpl.recommendedDuration}s loop</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">{tpl.title}</h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                {tpl.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 tabular-nums">
                {tpl.html.split('\n').length} lines
              </span>
              <button
                type="button"
                onClick={() => onSelectTemplate(tpl)}
                className="px-3.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Load in Studio
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
