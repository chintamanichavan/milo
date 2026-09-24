import { deletePhoto, getPhoto, savePhoto } from '../cook/photos';
import { lineChart } from '../ui/chart';
import { sheet } from '../ui/sheet';
import { dayKey } from '../ui/time';
import { toast } from '../ui/toast';
import {
  addMeasurement,
  addProgressPhoto,
  loadBody,
  MEASURES,
  removeProgressPhoto,
  seriesOf,
  type Girth,
  type ProgressPhoto,
} from './store';

const niceDate = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** the tape and the photos, as panels for whichever page shows the body */
export function bodyPanels(): string {
  const state = loadBody();
  const charts = MEASURES.map((m) => {
    const points = seriesOf(state, m.key);
    if (!points.length) return '';
    const last = points[points.length - 1].value;
    const change = points.length > 1 ? last - points[0].value : 0;
    return `<div class="panel"><p class="tag">${m.label}<span>${last} ${m.unit}${
      points.length > 1 ? ` · ${change >= 0 ? '+' : ''}${change.toFixed(1)}` : ''
    }</span></p>${lineChart(points.map((p) => p.value), `${m.label} (${m.unit})`)}</div>`;
  }).join('');
  return `<div class="panel body-actions">
      <p class="tag">Body<span>${state.measurements.length} measurements · ${state.photos.length} photos</span></p>
      <div class="chips">
        <button class="chip tap" id="bodyMeasure">+ measurements</button>
        <label class="chip tap">+ progress photo<input type="file" id="bodyPhoto" accept="image/*" hidden></label>
        ${state.photos.length >= 2 ? '<button class="chip tap" id="bodyCompare">compare</button>' : ''}
      </div>
      ${
        state.photos.length
          ? `<div class="gallery" id="bodyShots">${[...state.photos]
              .reverse()
              .map(
                (p) => `<button class="gallery-shot tap body-shot" data-photo="${p.id}" data-shot="${p.id}"
                  aria-label="${p.pose} photo, ${niceDate(p.date)}"><span class="shot-date">${p.date.slice(5)}</span></button>`,
              )
              .join('')}</div>`
          : '<p class="line sub">Photos stay on this phone. A front photo every few weeks tells you more than the scale.</p>'
      }
    </div>
    ${charts}`;
}

async function paint(root: ParentNode): Promise<void> {
  for (const el of root.querySelectorAll<HTMLElement>('[data-photo]')) {
    if (!el.dataset.photo || el.style.backgroundImage) continue;
    const url = await getPhoto(el.dataset.photo);
    if (url) el.style.backgroundImage = `url(${url})`;
  }
}

/** wire the panels up; redraw is how the page draws itself again */
export function bindBodyPanels(root: HTMLElement, redraw: () => void): void {
  void paint(root);
  root.querySelector('#bodyMeasure')?.addEventListener('click', () => {
    const host = sheet(
      'Measurements',
      `<label class="field row"><span>Date</span><input class="num" id="mDate" type="date" value="${dayKey()}"></label>
       ${MEASURES.map(
         (m) => `<label class="field row"><span>${m.label} (${m.unit})</span>
           <input class="num" data-m="${m.key}" inputmode="decimal"></label>`,
       ).join('')}
       <button class="big tap" data-done="1" id="mSave">SAVE</button>`,
    );
    host.querySelector('#mSave')!.addEventListener('click', () => {
      const entry: Partial<Record<Girth | 'bodyFat', number>> = {};
      for (const m of MEASURES) {
        const value = Number((host.querySelector(`[data-m="${m.key}"]`) as HTMLInputElement).value);
        if (value > 0) entry[m.key] = value;
      }
      if (!Object.keys(entry).length) return;
      addMeasurement(entry, (host.querySelector('#mDate') as HTMLInputElement).value || dayKey());
      toast('Measurements saved');
      redraw();
    });
  });
  root.querySelector('#bodyPhoto')?.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const id = await savePhoto(file, 1400);
    const host = sheet(
      'Progress photo',
      `<div class="chips" id="pose">${(['front', 'side', 'back'] as const)
        .map((p, i) => `<button class="chip tap${i ? '' : ' on'}" data-pose="${p}">${p}</button>`)
        .join('')}</div>
       <label class="field row"><span>Date</span><input class="num" id="pDate" type="date" value="${dayKey()}"></label>
       <button class="big tap" data-done="1" id="pSave">KEEP IT</button>`,
    );
    let pose: ProgressPhoto['pose'] = 'front';
    host.querySelector('#pose')!.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-pose]');
      if (!chip) return;
      pose = chip.dataset.pose as ProgressPhoto['pose'];
      host.querySelectorAll('[data-pose]').forEach((c) => c.classList.toggle('on', c === chip));
    });
    host.querySelector('#pSave')!.addEventListener('click', () => {
      addProgressPhoto({ id, pose, date: (host.querySelector('#pDate') as HTMLInputElement).value || dayKey() });
      toast('Photo kept on this phone');
      redraw();
    });
  });
  root.querySelector('#bodyShots')?.addEventListener('click', async (ev) => {
    const shot = (ev.target as HTMLElement).closest<HTMLElement>('[data-shot]');
    if (!shot) return;
    const photo = loadBody().photos.find((p) => p.id === shot.dataset.shot)!;
    const url = await getPhoto(photo.id);
    const host = sheet(
      `${photo.pose} · ${niceDate(photo.date)}`,
      `${url ? `<img class="photo-large" src="${url}" alt="${photo.pose} progress photo">` : ''}
       <button class="link tap" id="pDrop" data-done="1">Delete this photo</button>`,
    );
    host.querySelector('#pDrop')!.addEventListener('click', () => {
      removeProgressPhoto(photo.id);
      void deletePhoto(photo.id);
      redraw();
    });
  });
  root.querySelector('#bodyCompare')?.addEventListener('click', () => compare());
}

/** two photos side by side: the first and the latest to start with, any two after that */
function compare(): void {
  const photos = loadBody().photos;
  let left = photos[0];
  let right = photos[photos.length - 1];
  const host = sheet('Compare', '');
  const body = host.querySelector<HTMLElement>('.sheet-body')!;
  const draw = async (): Promise<void> => {
    const [a, b] = await Promise.all([getPhoto(left.id), getPhoto(right.id)]);
    const days = Math.round((new Date(right.date).getTime() - new Date(left.date).getTime()) / 86_400_000);
    body.innerHTML = `<div class="compare">
        <figure>${a ? `<img src="${a}" alt="before">` : ''}<figcaption class="tag">${niceDate(left.date)} · ${left.pose}</figcaption></figure>
        <figure>${b ? `<img src="${b}" alt="after">` : ''}<figcaption class="tag">${niceDate(right.date)} · ${right.pose}</figcaption></figure>
      </div>
      <p class="line sub">${Math.abs(days)} days apart.</p>
      <p class="tag">Before</p>
      <div class="chips" data-side="left">${photos
        .map((p) => `<button class="chip tap${p.id === left.id ? ' on' : ''}" data-pick="${p.id}">${p.date.slice(5)} ${p.pose}</button>`)
        .join('')}</div>
      <p class="tag">After</p>
      <div class="chips" data-side="right">${photos
        .map((p) => `<button class="chip tap${p.id === right.id ? ' on' : ''}" data-pick="${p.id}">${p.date.slice(5)} ${p.pose}</button>`)
        .join('')}</div>`;
  };
  body.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-pick]');
    if (!chip) return;
    const photo = photos.find((p) => p.id === chip.dataset.pick)!;
    if (chip.closest('[data-side]')!.getAttribute('data-side') === 'left') left = photo;
    else right = photo;
    void draw();
  });
  void draw();
}
