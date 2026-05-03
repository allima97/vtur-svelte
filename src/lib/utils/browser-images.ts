export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function renderSvgToPngBlob(svgText: string): Promise<Blob> {
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Falha ao carregar SVG para conversão de PNG.'));
      image.src = svgUrl;
    });

    const width = Math.max(1, image.naturalWidth || 1080);
    const height = Math.max(1, image.naturalHeight || 1080);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Falha ao inicializar canvas para conversão PNG.');

    ctx.drawImage(image, 0, 0, width, height);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new Error('Falha ao gerar blob PNG da prévia.');
    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function fetchPreviewPngBlob(previewUrl: string) {
  const pngUrl = previewUrl.replace('/render.svg', '/render.png');
  const pngResponse = await fetch(pngUrl, { headers: { Accept: 'image/png' } });

  if (pngResponse.ok) {
    const contentType = String(pngResponse.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('image/png')) {
      return {
        blob: await pngResponse.blob(),
        generatedLocally: false
      };
    }
  }

  const svgResponse = await fetch(previewUrl, { headers: { Accept: 'image/svg+xml,text/plain,*/*' } });
  if (!svgResponse.ok) throw new Error('Falha ao carregar SVG para gerar PNG local.');
  const svgText = await svgResponse.text();
  return {
    blob: await renderSvgToPngBlob(svgText),
    generatedLocally: true
  };
}

export async function fetchImageAsDataUrl(url: string, mimeType = 'image/png'): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(new Blob([blob], { type: blob.type || mimeType }));
    });
  } catch {
    return null;
  }
}
