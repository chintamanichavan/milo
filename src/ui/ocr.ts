/**
 * Reading text off a photo, on the device. Tesseract arrives as its own chunk
 * the first time anyone scans; its engine and English model come from a CDN
 * once and are cached by the service worker after that.
 */
export async function readText(
  image: Blob,
  onProgress?: (fraction: number, status: string) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: { progress: number; status: string }) => onProgress?.(m.progress ?? 0, m.status ?? ''),
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
