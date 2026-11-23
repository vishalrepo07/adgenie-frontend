import React, { useEffect, useRef, useState } from 'react';
import { useCampaign } from '../context/CampaignContext';
import { AGE_GROUPS, PLATFORMS, SAMPLE_PROMPTS } from '../data/campaignData';
import {
  Sparkles,
  Check,
  Download,
  RefreshCw,
  Image,
  Video,
  FileText,
  Images,
  Package,
  AlertTriangle,
} from 'lucide-react';

/* ----------------------------- helpers ----------------------------- */

const getImageUrl = (item) => item.imageUrl || item.image || '';
const isDataUri = (url) => url.startsWith('data:');
const slug = (s = '') =>
  s.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ad';

const addParam = (url, key, value) =>
  `${url}${url.includes('?') ? '&' : '?'}${key}=${value}`;

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const extFromType = (type = '') => {
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  return 'jpg';
};

// Works for base64 data URIs and for remote URLs that allow CORS.
const fetchImageBlob = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image request failed: ${res.status}`);
  return res.blob();
};

const blobToDataUri = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const creativeToText = (c) =>
  [
    'AdGenie Creative Export',
    `Title: ${c.title || ''}`,
    `Headline: ${c.headline || ''}`,
    `Subheading: ${c.subheading || ''}`,
    `Audience: ${c.audience || ''}`,
    `Platform: ${c.platform || ''}`,
    `CTA: ${c.cta || ''}`,
  ].join('\n');

/* --------------------------- single ad card --------------------------- */

function AdCard({ item, onDownloadImage, onExportText, onRetryGenerate }) {
  const baseUrl = getImageUrl(item);
  const [src, setSrc] = useState(baseUrl);
  const [status, setStatus] = useState('loading'); // loading | loaded | failed
  const tries = useRef(0);
  const timer = useRef(null);

  // Reset when a new image arrives (e.g. after Regenerate)
  useEffect(() => {
    tries.current = 0;
    setSrc(baseUrl);
    setStatus('loading');
    return () => clearTimeout(timer.current);
  }, [baseUrl]);

  const handleError = () => {
    // Base64 images are not retryable: if they fail to decode, they are broken.
    if (!baseUrl || isDataUri(baseUrl) || tries.current >= 3) {
      setStatus('failed');
      return;
    }
    tries.current += 1;
    const attempt = tries.current;
    timer.current = setTimeout(() => {
      setSrc(addParam(baseUrl, 'retry', attempt));
    }, 5000 * attempt);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#272c44] bg-[#090a0f] flex flex-col justify-between group">
      <div className="aspect-[4/5] relative bg-[#171a29] flex items-center justify-center">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-admint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === 'failed' ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <p className="text-xs text-slate-300">
              The image didn't load. Regenerate to try again.
            </p>
            <button
              onClick={onRetryGenerate}
              className="px-3 py-1.5 rounded-lg bg-admint-500 hover:bg-admint-600 text-white text-xs font-bold"
            >
              Regenerate
            </button>
          </div>
        ) : (
          baseUrl && (
            <img
              src={src}
              alt={item.title || item.headline}
              onLoad={() => setStatus('loaded')}
              onError={handleError}
              style={{ opacity: status === 'loaded' ? 1 : 0, transition: 'opacity 0.6s ease' }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
            />
          )
        )}

        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase flex items-center gap-1 z-20">
          {item.type === 'video' ? (
            <Video className="w-3 h-3 text-purple-400" />
          ) : (
            <Image className="w-3 h-3 text-purple-400" />
          )}
          <span>{item.type || 'image'}</span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-4 flex flex-col justify-end z-20 pointer-events-none">
          <span className="text-[10px] font-bold text-admint-400 tracking-wider uppercase">
            {item.audience} · {item.platform}
          </span>
          <h4 className="text-sm font-black text-white leading-tight uppercase mt-1">
            {item.headline}
          </h4>
          <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{item.subheading}</p>

          <div className="mt-3 flex items-center justify-between pointer-events-auto">
            <span className="px-2.5 py-1 rounded bg-white text-slate-950 text-[9px] font-extrabold tracking-wider">
              {item.cta}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onDownloadImage(item)}
                disabled={status === 'failed'}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-admint-500 disabled:opacity-40 text-white transition-colors"
                title="Download image"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onExportText(item)}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-admint-500 text-white transition-colors"
                title="Export ad text (.txt)"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ main page ------------------------------ */

export default function Studio() {
  const {
    promptInput,
    setPromptInput,
    selectedAgeGroup,
    setSelectedAgeGroup,
    selectedPlatforms,
    togglePlatform,
    generatedCreatives,
    isGenerating,
    handleGenerate,
    triggerToast,
  } = useCampaign();

  const [isExporting, setIsExporting] = useState(false);

  /* ---- per-ad: download image ---- */
  const handleDownloadImage = async (creative) => {
    const url = getImageUrl(creative);
    if (!url) return triggerToast('This ad has no image yet.');
    try {
      const blob = await fetchImageBlob(url);
      saveBlob(blob, `adgenie-${slug(creative.title || creative.headline)}-${creative.id}.${extFromType(blob.type)}`);
      triggerToast('Image downloaded!');
    } catch {
      // Remote host blocks cross-origin download: open it so the user can save it.
      window.open(url, '_blank', 'noopener');
      triggerToast('Opened the image in a new tab. Right-click to save it.');
    }
  };

  /* ---- per-ad: export text ---- */
  const handleExportText = (creative) => {
    saveBlob(
      new Blob([creativeToText(creative)], { type: 'text/plain' }),
      `adgenie-${slug(creative.title || creative.headline)}-${creative.id}.txt`
    );
    triggerToast('Ad text exported!');
  };

  /* ---- whole campaign: one self-contained HTML file ---- */
  const handleExportCampaign = async () => {
    if (!generatedCreatives.length) return;
    setIsExporting(true);
    try {
      const cards = await Promise.all(
        generatedCreatives.map(async (c) => {
          let img = getImageUrl(c);
          try {
            // Embed the picture so the file works offline.
            img = await blobToDataUri(await fetchImageBlob(img));
          } catch {
            /* keep the remote URL if it can't be embedded */
          }
          return `
          <article>
            ${img ? `<img src="${img}" alt="${escapeHtml(c.title || c.headline)}">` : ''}
            <div class="body">
              <p class="meta">${escapeHtml(c.audience)} · ${escapeHtml(c.platform)}</p>
              <h2>${escapeHtml(c.headline)}</h2>
              <p>${escapeHtml(c.subheading)}</p>
              <p class="cta">${escapeHtml(c.cta)}</p>
            </div>
          </article>`;
        })
      );

      const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AdGenie campaign</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:32px;background:#0b0c14;color:#e5e7eb}
  h1{margin:0 0 4px} .sub{color:#94a3b8;margin:0 0 24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
  article{background:#12141f;border:1px solid #272c44;border-radius:16px;overflow:hidden}
  article img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
  .body{padding:16px} .meta{color:#a78bfa;font-size:12px;margin:0 0 6px}
  h2{font-size:16px;margin:0 0 8px} p{margin:0 0 8px;font-size:13px;color:#cbd5e1}
  .cta{display:inline-block;background:#fff;color:#0f172a;font-weight:700;padding:6px 12px;border-radius:8px}
</style></head><body>
<h1>AdGenie campaign</h1>
<p class="sub">${generatedCreatives.length} ad${generatedCreatives.length > 1 ? 's' : ''} · exported ${new Date().toLocaleString()}</p>
<div class="grid">${cards.join('')}</div>
</body></html>`;

      saveBlob(new Blob([html], { type: 'text/html' }), `adgenie-campaign-${Date.now()}.html`);
      triggerToast('Campaign exported!');
    } catch {
      triggerToast('Could not export the campaign. Try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /* ---- whole campaign: every image, one after another ---- */
  const handleDownloadAllImages = async () => {
    if (!generatedCreatives.length) return;
    setIsExporting(true);
    let done = 0;
    for (const c of generatedCreatives) {
      const url = getImageUrl(c);
      if (!url) continue;
      try {
        const blob = await fetchImageBlob(url);
        saveBlob(blob, `adgenie-${slug(c.title || c.headline)}-${c.id}.${extFromType(blob.type)}`);
        done += 1;
        await new Promise((r) => setTimeout(r, 400)); // keeps the browser from blocking multiple downloads
      } catch {
        /* skip images that can't be fetched */
      }
    }
    setIsExporting(false);
    triggerToast(
      done === generatedCreatives.length
        ? `Downloaded ${done} images!`
        : `Downloaded ${done} of ${generatedCreatives.length} images. Use the HTML export for the rest.`
    );
  };

  const hasCreatives = generatedCreatives.length > 0;

  return (
    <section id="studio" className="py-24 border-t border-[#1a1d2e] relative">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171a29] border border-admintOrange-500/30 text-admintOrange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Studio</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Try the generator
          </h2>

          <p className="text-slate-400 text-base leading-relaxed">
            Describe a product, choose who it's for, and pick your platforms. Watch the creatives build in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ------------------------- inputs ------------------------- */}
          <div className="lg:col-span-5 admint-card p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Product description
              </label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                rows={4}
                placeholder="e.g. A refillable stainless-steel water bottle that keeps drinks cold for 24 hours, made from recycled materials."
                className="w-full bg-[#0b0c14] border border-[#202436] focus:border-admint-500 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
              />

              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">Try a sample prompt:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PROMPTS.slice(0, 3).map((sample, i) => (
                    <button
                      key={i}
                      onClick={() => setPromptInput(sample)}
                      className="text-[11px] text-slate-300 hover:text-white bg-[#161826] hover:bg-[#1f2438] border border-[#24293f] px-2.5 py-1 rounded-lg transition-colors truncate max-w-xs"
                    >
                      "{sample.slice(0, 30)}..."
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Target age group
              </label>
              <div className="grid grid-cols-2 gap-3">
                {AGE_GROUPS.map((age) => {
                  const isSelected = selectedAgeGroup === age.id;
                  return (
                    <button
                      key={age.id}
                      onClick={() => setSelectedAgeGroup(age.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${isSelected
                          ? 'bg-admint-500/15 border-admint-500 text-white'
                          : 'bg-[#0b0c14] border-[#202436] text-slate-400 hover:border-slate-700'
                        }`}
                    >
                      <div className="text-sm font-bold text-white">{age.name}</div>
                      <div className="text-xs text-slate-400">{age.range}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Platforms
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PLATFORMS.map((plat) => {
                  const isSelected = selectedPlatforms.includes(plat.id);
                  return (
                    <button
                      key={plat.id}
                      onClick={() => togglePlatform(plat.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${isSelected
                          ? 'bg-admint-500/20 border-admint-500 text-white'
                          : 'bg-[#0b0c14] border-[#202436] text-slate-400 hover:border-slate-700'
                        }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-admint-400" />}
                      <span>{plat.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{plat.ratio}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !promptInput.trim()}
              className="w-full py-3.5 rounded-xl bg-admint-500 hover:bg-admint-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm shadow-xl shadow-admint-500/25 flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing creative variants...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate ad creatives</span>
                </>
              )}
            </button>
          </div>

          {/* ------------------------- output ------------------------- */}
          <div id="studio-output" className="lg:col-span-7 admint-card p-6 min-h-[480px] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#1c1f2e]">
              <h3 className="text-base font-bold text-white tracking-tight">
                Output{hasCreatives ? ` (${generatedCreatives.length})` : ''}
              </h3>

              {hasCreatives && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportCampaign}
                    disabled={isExporting || isGenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-admint-500 hover:bg-admint-600 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-colors"
                    title="Download every ad, with images, as one HTML file"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span>Export campaign</span>
                  </button>

                  <button
                    onClick={handleDownloadAllImages}
                    disabled={isExporting || isGenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161826] hover:bg-[#1f2438] border border-[#24293f] disabled:opacity-50 disabled:pointer-events-none text-slate-200 text-xs font-semibold transition-colors"
                    title="Download every image as a separate file"
                  >
                    <Images className="w-3.5 h-3.5" />
                    <span>All images</span>
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-admint-400 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>
              )}
            </div>

            {!hasCreatives ? (
              <div className="flex-1 border-2 border-dashed border-[#202436] rounded-xl flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#171a29] text-slate-500 flex items-center justify-center">
                  <Image className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-400 max-w-sm">
                  Your generated image and video ads will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {generatedCreatives.map((item) => (
                  <AdCard
                    key={item.id}
                    item={item}
                    onDownloadImage={handleDownloadImage}
                    onExportText={handleExportText}
                    onRetryGenerate={handleGenerate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}