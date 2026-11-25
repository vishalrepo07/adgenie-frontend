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
  History as HistoryIcon,
  ChevronDown,
  Search,
  Copy,
} from 'lucide-react';

/* ----------------------------- config ----------------------------- */

// Change this to your backend URL (and make sure CORS allows your frontend origin).
const API_BASE = 'http://localhost:8000';
const HISTORY_PAGE_SIZE = 5;

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

// History images come from the backend as a data URI, a URL, or raw base64.
const toImageSrc = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return `data:image/png;base64,${url}`;
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso || '';
  }
};

/* --------------------------- single ad card --------------------------- */

// The parent gives this component a key that includes the image URL, so a new
// image remounts the card with fresh state. That removes the need for a
// "reset" effect, which was overwriting 'loaded' with 'loading'.
function AdCard({ item, onDownloadImage, onExportText, onRetryGenerate }) {
  const baseUrl = getImageUrl(item);
  const [src, setSrc] = useState(baseUrl);
  const [status, setStatus] = useState(baseUrl ? 'loading' : 'failed'); // loading | loaded | failed
  const tries = useRef(0);
  const timer = useRef(null);
  const imgRef = useRef(null);

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

  // Covers images that finished (or failed) before React attached onLoad/onError,
  // which is common for cached images and base64 data URIs.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) setStatus('loaded');
      else handleError();
    }
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              ref={imgRef}
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

/* ------------------------- history: variant card ------------------------- */

function HistoryVariant({ variant }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = toImageSrc(variant.image_url);

  return (
    <div className="rounded-xl overflow-hidden border border-[#272c44] bg-[#090a0f] flex flex-col">
      <div className="aspect-[4/5] bg-[#171a29] relative flex items-center justify-center">
        {src && !imgFailed ? (
          <img
            src={src}
            alt={variant.headline || 'Ad variant'}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <Image className="w-6 h-6" />
            <span className="text-[11px]">No image</span>
          </div>
        )}

        {variant.angle && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase">
            {variant.angle}
          </span>
        )}
        {variant.score != null && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-admint-500/90 text-white text-[10px] font-extrabold">
            Score {variant.score}
          </span>
        )}
      </div>

      <div className="p-3.5 space-y-2.5 flex-1">
        {variant.headline && (
          <h5 className="text-sm font-black text-white leading-tight uppercase">{variant.headline}</h5>
        )}
        {variant.caption && (
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{variant.caption}</p>
        )}
        {variant.cta && (
          <span className="inline-block px-2.5 py-1 rounded bg-white text-slate-950 text-[9px] font-extrabold tracking-wider">
            {variant.cta}
          </span>
        )}

        {variant.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {variant.hashtags.map((tag, i) => (
              <span key={i} className="text-[10px] text-admint-400 bg-admint-500/10 px-1.5 py-0.5 rounded">
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}

        {variant.tips?.length > 0 && (
          <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
            {variant.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------- history: main panel ------------------------- */

function HistoryPanel({ onReuse }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [openIds, setOpenIds] = useState({});

  const fetchHistory = async (pageNum, append) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/campaigns/history?page=${pageNum}&page_size=${HISTORY_PAGE_SIZE}&include_images=true`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), name: name.trim() }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) throw new Error('No user found with this email and name.');
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.');
      }

      const data = await res.json();
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setPage(data.page);
      setUserName(data.user_name);
      setSearched(true);

      // Open the newest campaign automatically on a fresh search.
      if (!append && data.items.length > 0) setOpenIds({ [data.items[0].id]: true });
    } catch (err) {
      if (!append) {
        setItems([]);
        setTotal(0);
        setSearched(false);
      }
      setError(err.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !name.trim() || loading) return;
    fetchHistory(1, false);
  };

  const toggleOpen = (id) => setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  const hasMore = items.length < total;

  return (
    <div id="studio-history" className="admint-card p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#1c1f2e]">
        <div className="w-9 h-9 rounded-xl bg-[#171a29] text-admint-400 flex items-center justify-center">
          <HistoryIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Campaign history</h3>
          <p className="text-xs text-slate-400">Enter your email and name to see your previous campaigns.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="md:col-span-5 bg-[#0b0c14] border border-[#202436] focus:border-admint-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
          className="md:col-span-4 bg-[#0b0c14] border border-[#202436] focus:border-admint-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !email.trim() || !name.trim()}
          className="md:col-span-3 py-3 rounded-xl bg-admint-500 hover:bg-admint-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          {loading && !items.length ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>View history</span>
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {searched && !error && items.length === 0 && (
        <div className="border-2 border-dashed border-[#202436] rounded-xl p-8 text-center text-sm text-slate-400">
          No campaigns yet for {userName || 'this user'}. Generate your first one above.
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Showing {items.length} of {total} campaign{total === 1 ? '' : 's'} for{' '}
            <span className="text-white font-semibold">{userName}</span>
          </p>

          {items.map((campaign) => {
            const isOpen = !!openIds[campaign.id];
            return (
              <div key={campaign.id} className="rounded-2xl border border-[#272c44] bg-[#0b0c14] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleOpen(campaign.id)}
                  className="w-full flex items-start justify-between gap-4 p-4 text-left hover:bg-[#10121d] transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-sm font-bold text-white line-clamp-2">{campaign.product_description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span className="uppercase font-bold text-admint-400">{campaign.platform}</span>
                      <span>Audience: {campaign.audience}</span>
                      <span>Budget: {campaign.budget}</span>
                      <span>{formatDate(campaign.created_at)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#171a29] text-slate-300 uppercase text-[10px] font-bold">
                        {campaign.status}
                      </span>
                      <span>{campaign.ad_variants.length} variant{campaign.ad_variants.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="p-4 pt-0 space-y-4">
                    <button
                      type="button"
                      onClick={() => onReuse(campaign)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161826] hover:bg-[#1f2438] border border-[#24293f] text-slate-200 text-xs font-semibold transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Reuse this brief</span>
                    </button>

                    {campaign.ad_variants.length === 0 ? (
                      <p className="text-xs text-slate-500">No ad variants saved for this campaign.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {campaign.ad_variants.map((v) => (
                          <HistoryVariant key={v.id} variant={v} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => fetchHistory(page + 1, true)}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#161826] hover:bg-[#1f2438] border border-[#24293f] disabled:opacity-50 text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Load more</span>
            </button>
          )}
        </div>
      )}
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

  /* ---- history: copy an old brief into the generator ---- */
  const handleReuseBrief = (campaign) => {
    setPromptInput(campaign.product_description);
    document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' });
    triggerToast('Brief loaded into the generator.');
  };

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
                    // key includes the URL so a new image remounts the card with fresh state
                    key={`${item.id}-${getImageUrl(item)}`}
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

        {/* ------------------------- history ------------------------- */}
        <HistoryPanel onReuse={handleReuseBrief} />
      </div>
    </section>
  );
}