/** Photos live in IndexedDB so localStorage stays small. */
const DB = 'milo-photos';
const STORE = 'photos';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put(id: string, blob: Blob): Promise<void> {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
  try {
    const db = await open();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return blob ?? null;
  } catch {
    return null;
  }
}

export async function getPhoto(id: string): Promise<string | null> {
  const blob = await getPhotoBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/** store a photo that is already the right size, such as one from an imported file */
export async function putPhoto(blob: Blob): Promise<string> {
  const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await put(id, blob);
  return id;
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* already gone */
  }
}

/** Downscale before storing — a phone photo is far bigger than a recipe needs. */
export async function savePhoto(file: Blob, maxWidth = 1200): Promise<string> {
  const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.82),
  );
  await put(id, blob);
  return id;
}
