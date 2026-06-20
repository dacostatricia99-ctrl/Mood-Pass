import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Cap pages so a huge PDF doesn't explode the vision cost / latency.
const MAX_PAGES = 6;

/**
 * Renders each page of a PDF to a JPEG blob in the browser. OpenAI Vision reads
 * images, not PDFs, so the menu PDF is rasterised here before being sent.
 */
export async function pdfToImageBlobs(file: File): Promise<Blob[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = Math.min(pdf.numPages, MAX_PAGES);
  const blobs: Blob[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 }); // 2x for legible text
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob) blobs.push(blob);
  }
  return blobs;
}