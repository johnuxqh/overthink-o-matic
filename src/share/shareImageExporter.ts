export interface ShareImageExportResult {
  supported: boolean;
  downloaded: boolean;
  fallbackMessage?: string;
}

export const SHARE_EXPORT_FALLBACK = 'Take a screenshot of this card';

export function isShareImageExportSupported(): boolean {
  return typeof document !== 'undefined'
    && typeof XMLSerializer !== 'undefined'
    && typeof Blob !== 'undefined'
    && typeof URL !== 'undefined'
    && typeof HTMLCanvasElement !== 'undefined'
    && typeof HTMLCanvasElement.prototype.toBlob === 'function';
}

export async function downloadShareCardImage(element: HTMLElement | null, filename = 'overthink-o-matic-result.png'): Promise<ShareImageExportResult> {
  if (!element || !isShareImageExportSupported()) {
    return { supported: false, downloaded: false, fallbackMessage: SHARE_EXPORT_FALLBACK };
  }

  const rect = element.getBoundingClientRect();
  const width = Math.max(320, Math.ceil(rect.width || element.scrollWidth));
  const height = Math.max(320, Math.ceil(rect.height || element.scrollHeight));
  const clone = element.cloneNode(true) as HTMLElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

  try {
    const image = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error(SHARE_EXPORT_FALLBACK)), 1000);
      image.onload = () => { window.clearTimeout(timeout); resolve(); };
      image.onerror = () => { window.clearTimeout(timeout); reject(new Error(SHARE_EXPORT_FALLBACK)); };
    });
    image.src = svgUrl;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return { supported: false, downloaded: false, fallbackMessage: SHARE_EXPORT_FALLBACK };
    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return { supported: false, downloaded: false, fallbackMessage: SHARE_EXPORT_FALLBACK };

    const pngUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(pngUrl);
    return { supported: true, downloaded: true };
  } catch {
    return { supported: false, downloaded: false, fallbackMessage: SHARE_EXPORT_FALLBACK };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
