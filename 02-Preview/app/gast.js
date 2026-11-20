// Gastenapp van de preview. Hash-routes, inhoud uit site-data.js (de website) en store.js.
import { qrSvg } from './qr.js';
import { SITE } from './site-data.js';
import * as S from './store.js';
import {
  addDays, countUp, dayOf, esc, euro, greeting, gsapOk, icon, img, isTapasDay, longDate, openStatus,
  shortDate, slotsFor, stamp, toast, todayIso,
} from './util.js';

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const TAG = SITE.tagLabels;
const ALLERGENS = ['Gluten', 'Schaaldieren', 'Ei', 'Vis', 'Pinda', 'Soja', 'Melk', 'Noten', 'Selderij', 'Mosterd', 'Sesam', 'Sulfiet', 'Lupine', 'Weekdieren'];
const FORM_VIEWS = new Set(['reserveren', 'aanmelden', 'inloggen', 'profiel', 'cadeaubon']);

let current = '';
let lastBalance = null;
let flash = null;
let installEvent = null;

const me = () => S.member();
const route = () => {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [path, q] = h.split('?');
  return { path, params: new URLSearchParams(q ?? '') };
};
const go = (p) => {
  location.hash = `#/${p}`;
};

// ---------- Gedeelde bouwstenen ----------
// Gasten zien geen voorbeeldlabels of taken voor de eigenaar; die staan in het beheer onder Vandaag.
const example = () => '';

function cardHtml(m, { big = false } = {}) {
  const f = flash && flash.until > Date.now() ? flash : null;
  return `<div class="lc-card on-vino" ${big ? 'style="width:min(100%,360px)"' : ''}>
    <div class="lc-card-top"><span class="script">La Caleta</span><span class="label">Club</span></div>
    <div class="lc-door" data-door>
      <div class="lc-door-in" data-qr>${qrSvg(S.qrToken(m.id), { label: `Ledenkaart van ${m.firstName}, lidnummer ${m.memberNo}` })}</div>
      ${f ? `<div class="scanned" role="status">${icon('check')}<b class="num">${f.points > 0 ? '+' : ''}${f.points}</b><span class="small">${f.points > 0 ? 'punten erbij. ¡Gracias!' : 'punten ingewisseld'}</span></div>` : ''}
    </div>
    <div class="lc-card-meta">
      <div><b>${esc(m.firstName)} ${esc(m.lastName ?? '')}</b><span class="xs">Lid sinds ${new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(m.joinedAt)}</span></div>
      <span class="no">${esc(m.memberNo)}</span>
    </div>
  </div>`;
}

function progressHtml(m) {
  const { next, balance } = S.nextReward(m.id);
  if (!next) return `<p class="small">U kunt alle beloningen inwisselen. Vraag ernaar bij de bediening.</p>`;
  const prevCost = S.get().rewards.filter((r) => r.active && r.cost <= balance).reduce((a, r) => Math.max(a, r.cost), 0);
  const p = Math.round(((balance - prevCost) / (next.cost - prevCost)) * 100);
  return `<div class="progress" role="progressbar" aria-label="Voortgang naar ${esc(next.name)}" aria-valuemin="0" aria-valuemax="${next.cost}" aria-valuenow="${balance}" style="--p:${Math.max(4, p)}%"><i></i></div>
    <p class="small">Nog <span class="num">${next.cost - balance}</span> punten tot <strong>${esc(next.name)}</strong>${example(next.isExample)}</p>`;
}

const statusLabel = { aangevraagd: 'Aangevraagd', bevestigd: 'Bevestigd', voorstel: 'Ander tijdstip voorgesteld', geweigerd: 'Niet mogelijk', geannuleerd: 'Geannuleerd' };

function nextReservation(m) {
  if (!m) return null;
  return S.get()
    .reservations.filter((r) => r.memberId === m.id && r.date >= todayIso() && !['geannuleerd', 'geweigerd'].includes(r.status))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
}

function resLine(r) {
  const d = new Date(`${r.date}T12:00:00Z`);
  return `<div class="res-line">
    <div class="res-date"><b>${d.getUTCDate()}</b><span class="xs">${new Intl.DateTimeFormat('nl-NL', { month: 'short', timeZone: 'UTC' }).format(d)}</span></div>
    <div><strong>${esc(longDate(r.date, { day: undefined, month: undefined }))} om ${esc(r.proposedTime || r.time)}</strong><br><span class="small muted">${r.guests} ${r.guests === 1 ? 'persoon' : 'personen'}${r.wishes?.length ? `, ${esc(r.wishes.join(', ').toLowerCase())}` : ''}</span></div>
    <span class="status-pill" data-s="${r.status}">${statusLabel[r.status]}</span>
  </div>
  ${r.status === 'voorstel' ? `<p class="small" style="margin-top:8px">La Caleta stelt ${esc(r.proposedTime)} voor${r.message ? `: ${esc(r.message)}` : ''}. Bel ${esc(SITE.site.phone)} om te bevestigen.</p>` : ''}
  ${r.status === 'geweigerd' && r.message ? `<p class="small" style="margin-top:8px">${esc(r.message)}</p>` : ''}`;
}

// ---------- Home ----------
function vHome() {
  const m = me();
  const s = S.get();
  const st = openStatus();
  const tapas = isTapasDay();
  const next = nextReservation(m);
  const fresh = s.dishes.filter((d) => d.isNew && !d.soldOut);
  const offers = s.offers.filter((o) => o.published);
  const events = s.events.filter((e) => e.published && e.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
  const name = m ? `, <br>${esc(m.firstName)}` : '';
  const club = m
    ? `<div class="club-strip">
        <div class="club-strip-top">
          <div><span class="label club-eyebrow">La Caleta Club</span><div class="points" aria-live="polite"><span data-points>${S.balance(m.id)}</span><small>punten</small></div></div>
          <button class="btn btn-line" data-act="open-card">${icon('qr')}Ledenkaart</button>
        </div>
        ${progressHtml(m)}
      </div>`
    : `<div class="club-strip">
        <span class="label club-eyebrow">La Caleta Club</span>
        <div class="club-strip-top"><p><strong style="font-family:var(--font-display);font-size:1.6rem;font-weight:500">Spaar bij elk bezoek</strong><br><span class="small muted">Gratis lid: punten, beloningen en een verjaardagscadeau.</span></p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-line" href="#/aanmelden">Word lid</a><a class="btn" style="color:var(--crema);text-decoration:underline" href="#/inloggen">Gast kiezen</a></div>
      </div>`;
  return `
  <section class="on-dark hero">
    <div class="wrap">
      <div class="hero-grid">
        <div style="padding-bottom:24px">
          <h1>${greeting()}${name}</h1>
          <p class="status"><span class="open-dot" data-open="${st.open}" aria-hidden="true"></span>${esc(st.text)}</p>
          ${tapas ? `<p class="status">${icon('calendar')}Vandaag tapasdag, inloop ${SITE.tapasDay.walkIn.from} tot ${SITE.tapasDay.walkIn.until}</p>` : ''}
        </div>
        <div class="hero-arch"><div class="arco">${img('hero', 'Rode wijn wordt ingeschonken bij kaarslicht', '', '40vw')}</div></div>
      </div>
    </div>
    <div class="on-vino club-band"><div class="wrap">${club}</div></div>
  </section>
  <div class="wrap">
    <div class="home-cols">
      <div>
        <nav class="quick" aria-label="Snel naar">
          <a href="#/reserveren">${icon('calendar')}Reserveer</a>
          <a href="#/kaart">${icon('book')}Kaart</a>
          <a href="#/club">${icon('gift')}Beloningen</a>
          <a href="#/experiencias">${icon('wine')}Experiencias</a>
        </nav>
        ${next ? `<section class="sec" aria-labelledby="h-res"><div class="sec-head"><h2 id="h-res">Uw reservering</h2></div>${resLine(next)}</section>` : ''}
        ${fresh.length ? `<section class="sec" aria-labelledby="h-new">
          <div class="sec-head"><h2 id="h-new">Nieuw op de kaart</h2><a class="link" href="#/kaart">Hele kaart</a></div>
          <ul class="dishes">${fresh.map(dishItem).join('')}</ul>
        </section>` : ''}
        <section class="sec" aria-labelledby="h-off">
          <div class="sec-head"><h2 id="h-off">Aanbiedingen</h2></div>
          <div class="offer-list">${offers.map((o) => offerItem(o, m)).join('')}</div>
        </section>
        ${events.length ? `<section class="sec" aria-labelledby="h-ev">
          <div class="sec-head"><h2 id="h-ev">Experiencias</h2><a class="link" href="#/experiencias">Alle</a></div>
          <div class="ev-list">${events.map(evItem).join('')}</div>
        </section>` : ''}
        <section class="sec mobile-only" aria-labelledby="h-info"><div class="sec-head"><h2 id="h-info">Bij ons</h2><a class="link" href="#/info">Info</a></div>${infoList()}</section>
      </div>
      <aside class="home-side" aria-label="Reserveren en info">
        <div style="display:grid;gap:14px;padding:20px;background:var(--arena)">
          <h2 style="font-size:1.75rem">Reserveer een tafel</h2>
          <p class="small muted">Online tot ${SITE.reservation.maxGuests} personen. U krijgt een bevestiging van La Caleta.</p>
          <a class="btn btn-reserve btn-block" href="#/reserveren">${icon('calendar')}Reserveer</a>
          <a class="btn btn-line btn-block" href="${SITE.site.phoneHref}">${icon('phone')}Bel ${esc(SITE.site.phone)}</a>
        </div>
        <div style="margin-top:20px">${infoList()}</div>
      </aside>
    </div>
  </div>`;
}

function infoList() {
  return `<ul class="info-list">
    <li>${icon('pin')}<span>${esc(SITE.site.address.street)}, ${esc(SITE.site.address.city)}<br><a class="link small" href="${esc(SITE.site.mapsHref)}" target="_blank" rel="noopener">Route</a></span></li>
    <li>${icon('clock')}<span>Wo t/m za vanaf 11:00, zo vanaf 16:00<br><span class="muted">Ma en di gesloten. Keuken tot ${SITE.reservation.kitchenCloses}.</span></span></li>
    <li>${icon('car')}<span>Gratis parkeren in de buurt</span></li>
    <li>${icon('gift')}<span>VVV-cadeaukaart is welkom</span></li>
  </ul>`;
}

function offerItem(o, m) {
  const locked = o.membersOnly && !m;
  return `<article class="offer">
    <div class="arco" style="background:var(--arena)">${o.image ? img(o.image, '', '', '120px') : ''}</div>
    <div>
      ${o.membersOnly ? `<span class="members">${icon('lock')}Alleen voor leden</span>` : ''}
      <h3>${esc(o.title)}</h3>
      <p>${locked ? 'Word gratis lid van de La Caleta Club om deze aanbieding te gebruiken.' : esc(o.body)}</p>
      ${locked ? '<a class="link small" href="#/aanmelden">Word lid</a>' : ''}
    </div>
  </article>`;
}

function evItem(e) {
  const left = e.capacity ? e.capacity - e.signups.reduce((n, s) => n + s.guests, 0) : null;
  return `<a class="ev" href="#/experiencias/${e.id}">
    <div class="arco">${img(e.image, '', '', '(min-width: 600px) 40vw, 100vw')}</div>
    <div class="ev-meta"><span>${esc(shortDate(e.date))}, ${esc(e.time)}</span>${left !== null ? `<span>${left > 0 ? `Nog ${left} plaatsen` : 'Vol'}</span>` : ''}${e.membersOnly ? '<span>Alleen leden</span>' : ''}</div>
    <h3>${esc(e.title)}${example(e.isExample)}</h3>
  </a>`;
}

// ---------- Menukaart ----------
const menuState = { cat: null, q: '', tag: null };

function dishItem(d) {
  const tags = (d.tags ?? []).map((t) => TAG[t]).filter(Boolean);
  return `<li><button class="dish" data-act="dish" data-id="${d.id}">
    <span class="dish-row"><span class="dish-name">${esc(d.name)}</span>${d.price ? `<span class="lead" aria-hidden="true"></span><span class="dish-price">${esc(d.price)}</span>` : ''}</span>
    ${d.description ? `<span class="dish-desc" style="display:block">${esc(d.description)}</span>` : ''}
    ${tags.length || d.isNew || d.soldOut ? `<span class="dish-tags">${d.isNew ? '<span class="new">Nieuw</span>' : ''}${d.soldOut ? '<span class="out">Tijdelijk uitverkocht</span>' : ''}${tags.map((t) => `<span>${t}</span>`).join('')}</span>` : ''}
  </button></li>`;
}

function vKaart(params) {
  const cats = S.get().categories.filter((c) => c.visible).sort((a, b) => a.sort - b.sort);
  if (params.get('cat') && cats.some((c) => c.id === params.get('cat'))) menuState.cat = params.get('cat');
  if (!menuState.cat || !cats.some((c) => c.id === menuState.cat)) menuState.cat = cats[0]?.id;
  return `<div class="wrap narrow">
    <header class="page-head"><h1>La carta</h1></header>
  </div>
  <div class="menu-tools"><div class="wrap narrow">
    <label class="search"><span class="sr-only">Zoek op de kaart</span>${icon('search')}<input class="input" type="search" data-input="menu-q" placeholder="Zoek een gerecht" value="${esc(menuState.q)}" autocomplete="off"></label>
    <div class="chips" role="group" aria-label="Categorie">${cats.map((c) => `<button class="chip" data-act="cat" data-id="${c.id}" aria-pressed="${c.id === menuState.cat && !menuState.q}">${esc(c.name)}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Dieet" style="padding-top:0"><span class="chip-row-label">Toon alleen</span>${Object.entries(TAG).map(([k, v]) => `<button class="chip" data-act="tag" data-id="${k}" aria-pressed="${menuState.tag === k}">${v}</button>`).join('')}</div>
  </div></div>
  <div class="wrap narrow" id="menu-list" aria-live="polite">${menuList()}</div>`;
}

function menuList() {
  const s = S.get();
  const cats = s.categories.filter((c) => c.visible);
  const q = menuState.q.trim().toLowerCase();
  const match = (d) => (!menuState.tag || d.tags.includes(menuState.tag)) && (!q || `${d.name} ${d.description}`.toLowerCase().includes(q));
  if (q) {
    const hits = s.dishes.filter((d) => cats.some((c) => c.id === d.cat) && match(d));
    if (!hits.length)
      return `<div class="empty"><p>Niets gevonden voor "${esc(menuState.q)}".</p><button class="btn btn-line" data-act="clear-q">Zoekopdracht wissen</button></div>`;
    return `<p class="small muted" style="margin-top:16px">${hits.length} ${hits.length === 1 ? 'gerecht' : 'gerechten'}</p><ul class="dishes">${hits.map(dishItem).join('')}</ul>`;
  }
  const c = cats.find((x) => x.id === menuState.cat);
  if (!c) return '<div class="empty"><p>De kaart is even niet beschikbaar.</p></div>';
  const list = s.dishes.filter((d) => d.cat === c.id && match(d));
  const groups = [...new Set(list.map((d) => d.group))];
  return `${c.image ? `<div class="cat-banner arco" style="border-radius:0">${img(c.image, '', '', '(min-width: 900px) 44rem, 100vw')}</div>` : ''}
    <h2 style="font-size:2.2rem;margin-top:20px">${esc(c.name)}</h2>
    ${c.note ? `<p class="cat-note">${esc(c.note)}</p>` : ''}
    ${list.length ? groups.map((g) => `${g ? `<h3 class="dish-group">${esc(g)}</h3>` : ''}<ul class="dishes">${list.filter((d) => d.group === g).map(dishItem).join('')}</ul>`).join('') : `<div class="empty"><p>Geen gerechten met dit kenmerk in ${esc(c.name)}.</p><button class="btn btn-line" data-act="clear-tag">Filter uitzetten</button></div>`}
    <p class="xs muted" style="margin-top:24px">Prijzen van de kaart van La Caleta. Allergie of dieet? Vraag de bediening.</p>`;
}

function openDish(id) {
  const d = S.get().dishes.find((x) => x.id === id);
  const c = S.get().categories.find((x) => x.id === d.cat);
  const tags = d.tags.map((t) => TAG[t]);
  openSheet(`
    ${c?.image ? `<div class="sheet-img">${img(c.image, '', '', '40rem').replace('loading="lazy"', 'loading="eager"')}</div>` : ''}
    <p class="label muted">${esc(c?.name ?? '')}</p>
    <h2 id="sheet-title">${esc(d.name)}</h2>
    ${d.description ? `<p>${esc(d.description)}</p>` : ''}
    ${d.price ? `<p style="font-size:1.25rem;font-weight:500" class="num">${esc(d.price)}</p>` : ''}
    ${tags.length ? `<p class="small"><strong>Kenmerken:</strong> ${tags.join(', ')}</p>` : ''}
    <div>
      <p class="small" style="font-weight:500;margin-bottom:6px">Allergenen</p>
      ${d.allergens === null ? '<p class="small muted">Nog niet opgegeven door de keuken. Vraag de bediening.</p>' : d.allergens.length ? `<ul class="allergens">${d.allergens.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p class="small">Geen van de 14 allergenen.</p>'}
    </div>
    ${c?.image ? '<p class="xs muted">Sfeerbeeld van de categorie, geen foto van dit gerecht.</p>' : ''}
    <a class="btn btn-reserve" href="#/reserveren">Reserveer een tafel</a>`);
}

// ---------- Reserveren ----------
const draft = { date: null, guests: 2, time: null, name: '', phone: '', email: '', wishes: [], notes: '', errors: {}, done: null, busy: false };
const WISHES = ['Paella vooraf', 'Verjaardag', 'Kinderstoel', 'Rolstoel', 'Allergie of dieet'];

function vReserveren() {
  const m = me();
  if (m && !draft.name) Object.assign(draft, { name: `${m.firstName} ${m.lastName ?? ''}`.trim(), email: m.email, phone: m.phone ?? '' });
  if (draft.done) return vReserved();
  const blocked = S.get().blockedDates;
  const days = Array.from({ length: 21 }, (_, i) => addDays(todayIso(), i));
  if (!draft.date) draft.date = days.find((d) => slotsFor(d, blocked).length) ?? null;
  const slots = draft.date ? slotsFor(draft.date, blocked) : [];
  if (draft.time && !slots.includes(draft.time)) draft.time = null;
  const tooMany = draft.guests > SITE.reservation.maxGuests;
  const e = draft.errors;
  const err = (k) => (e[k] ? `<span class="field-error" id="err-${k}">${esc(e[k])}</span>` : '');
  const inv = (k) => (e[k] ? `aria-invalid="true" aria-describedby="err-${k}"` : '');
  return `<div class="wrap narrow">
    <header class="page-head"><h1>Reserveer een tafel</h1><p>La Caleta bevestigt uw aanvraag persoonlijk.</p></header>
    <form class="form" data-form="reserve" novalidate>
      <fieldset class="fieldset"><legend>Datum</legend>
        <div class="date-row">${days.map((d) => {
          const open = slotsFor(d, blocked).length > 0;
          const dt = new Date(`${d}T12:00:00Z`);
          return `<button type="button" class="date-btn" data-act="date" data-id="${d}" data-focus="date-${d}" aria-pressed="${d === draft.date}" ${open ? '' : 'disabled'} aria-label="${esc(longDate(d))}${open ? '' : ', gesloten'}"><small>${new Intl.DateTimeFormat('nl-NL', { weekday: 'short', timeZone: 'UTC' }).format(dt)}</small><b>${dt.getUTCDate()}</b><small>${new Intl.DateTimeFormat('nl-NL', { month: 'short', timeZone: 'UTC' }).format(dt)}</small></button>`;
        }).join('')}</div>
        ${draft.date ? `<p class="small">${esc(longDate(draft.date))}${SITE.tapasDay.dayIndexes.includes(dayOf(draft.date)) ? ': tapasdag' : ''}</p>` : ''}
        ${err('date')}
      </fieldset>
      <fieldset class="fieldset"><legend>Aantal personen</legend>
        <div class="stepper">
          <button type="button" data-act="guests" data-id="-1" data-focus="g-min" aria-label="Eén persoon minder" ${draft.guests <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
          <output aria-live="polite" aria-label="Aantal personen">${tooMany ? '12+' : draft.guests}</output>
          <button type="button" data-act="guests" data-id="1" data-focus="g-plus" aria-label="Eén persoon meer" ${tooMany ? 'disabled' : ''}>${icon('plus')}</button>
        </div>
        ${tooMany ? `<div class="notice">${icon('users')}<span>Voor groepen vanaf 13 personen maken we graag persoonlijk een afspraak, ook voor afhuren. <a class="link" href="${SITE.site.phoneHref}">Bel ${esc(SITE.site.phone)}</a></span></div>` : ''}
      </fieldset>
      <fieldset class="fieldset" ${tooMany ? 'disabled' : ''}><legend>Tijd</legend>
        ${slots.length ? `<div class="slots">${slots.map((t) => `<button type="button" class="slot" data-act="time" data-id="${t}" data-focus="t-${t}" aria-pressed="${t === draft.time}">${t}</button>`).join('')}</div>` : '<p class="small muted">Kies eerst een datum waarop we open zijn.</p>'}
        <p class="xs muted">De keuken sluit om ${SITE.reservation.kitchenCloses}.${draft.date === todayIso() ? ' Vandaag kunt u tot een uur van tevoren reserveren.' : ''}</p>
        ${err('time')}
      </fieldset>
      <fieldset class="fieldset" ${tooMany ? 'disabled' : ''}><legend>Uw gegevens</legend>
        <label class="field"><span>Naam</span><input class="input" data-input="name" autocomplete="name" value="${esc(draft.name)}" ${inv('name')}>${err('name')}</label>
        <label class="field"><span>Telefoon</span><input class="input" data-input="phone" type="tel" autocomplete="tel" inputmode="tel" value="${esc(draft.phone)}" ${inv('phone')}>${err('phone')}</label>
        <label class="field"><span>E-mail</span><input class="input" data-input="email" type="email" autocomplete="email" value="${esc(draft.email)}" ${inv('email')}><span class="field-hint">Hier sturen we de bevestiging en een herinnering naartoe.</span>${err('email')}</label>
      </fieldset>
      <fieldset class="fieldset" ${tooMany ? 'disabled' : ''}><legend>Speciale wensen</legend>
        <div class="wish-row">${WISHES.map((w) => `<button type="button" class="chip" data-act="wish" data-id="${esc(w)}" data-focus="w-${esc(w)}" aria-pressed="${draft.wishes.includes(w)}">${esc(w)}</button>`).join('')}</div>
        ${draft.wishes.includes('Paella vooraf') ? `<p class="small muted">${esc(SITE.paellaNote)}</p>` : ''}
        <label class="field"><span>Toelichting (optioneel)</span><textarea class="input" data-input="notes" maxlength="500">${esc(draft.notes)}</textarea></label>
      </fieldset>
      ${e.form ? `<div class="notice" data-tone="err" role="alert">${icon('alert')}<span>${esc(e.form)}</span></div>` : ''}
      <div class="sticky-submit"><button class="btn btn-reserve btn-block" type="submit" ${tooMany ? 'disabled' : ''} ${draft.busy ? 'aria-busy="true" disabled' : ''}>${draft.busy ? 'Bezig met versturen' : 'Vraag reservering aan'}</button></div>
    </form>
  </div>`;
}

function vReserved() {
  const r = S.get().reservations.find((x) => x.id === draft.done);
  if (!r) {
    draft.done = null;
    return vReserveren();
  }
  return `<div class="wrap narrow"><div class="success">
    <div class="success-mark" data-success>${icon('check')}</div>
    <h1 style="font-size:2.4rem">Aanvraag ontvangen</h1>
    <p>La Caleta bekijkt uw aanvraag en stuurt een bevestiging naar <strong>${esc(r.email)}</strong>. Een dag van tevoren krijgt u een herinnering.</p>
    <dl class="summary"><dt>Datum</dt><dd>${esc(longDate(r.date))}</dd><dt>Tijd</dt><dd>${esc(r.time)}</dd><dt>Personen</dt><dd>${r.guests}</dd>${r.wishes.length ? `<dt>Wensen</dt><dd>${esc(r.wishes.join(', '))}</dd>` : ''}<dt>Status</dt><dd><span class="status-pill" data-s="${r.status}">${statusLabel[r.status]}</span></dd></dl>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-dark" href="#/home">Naar home</a><button class="btn btn-line" data-act="res-new">Nog een reservering</button></div>
  </div></div>`;
}

function submitReserve() {
  const e = {};
  if (!draft.date) e.date = 'Kies een datum.';
  if (!draft.time) e.time = 'Kies een tijd.';
  if (draft.name.trim().length < 2) e.name = 'Vul uw naam in.';
  if (!/^[+0-9 ()-]{10,}$/.test(draft.phone.trim())) e.phone = 'Vul een telefoonnummer in, bijvoorbeeld 06 12345678.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) e.email = 'Vul een geldig e-mailadres in.';
  draft.errors = e;
  if (Object.keys(e).length) {
    e.form = 'Controleer de gemarkeerde velden.';
    rerender();
    main.querySelector('[aria-invalid="true"], .field-error')?.closest('fieldset')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    main.querySelector('[aria-invalid="true"]')?.focus({ preventScroll: true });
    return;
  }
  draft.busy = true;
  rerender();
  setTimeout(() => {
    const r = S.requestReservation({
      memberId: me()?.id ?? null, name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim(), date: draft.date,
      time: draft.time, guests: draft.guests, wishes: [...draft.wishes], notes: draft.notes.trim(), source: 'app',
    });
    Object.assign(draft, { busy: false, done: r.id, time: null, wishes: [], notes: '', errors: {} });
    rerender();
    main.focus();
    if (gsapOk()) window.gsap.from('[data-success]', { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(2)' });
  }, 700);
}

// ---------- Club ----------
function vClub() {
  const m = me();
  const s = S.get();
  const rewards = s.rewards.filter((r) => r.active).sort((a, b) => a.cost - b.cost);
  const rewardsHtml = (bal) =>
    `<ul class="reward-list">${rewards.map((r) => {
      const ok = bal !== null && bal >= r.cost;
      return `<li data-ok="${ok}"><h3>${esc(r.name)}${example(r.isExample)}</h3><span class="cost">${r.cost} punten</span><span class="state">${bal === null ? esc(r.description) : ok ? 'Beschikbaar. Laat uw ledenkaart scannen bij de bediening.' : `Nog ${r.cost - bal} punten`}</span></li>`;
    }).join('')}</ul>`;
  const L = s.loyalty;
  const earn = L.mode === 'visit' ? `${L.perVisit} punten per bezoek` : L.mode === 'euro' ? `${L.perEuro} punt per euro` : `${L.perVisit} punten per bezoek plus ${L.perEuro} per euro`;
  if (!m)
    return `<section class="on-vino"><div class="wrap narrow join">
      <span class="label club-eyebrow">La Caleta Club</span>
      <h1 style="font-size:clamp(2.4rem,9vw,3.4rem)">Bij elk bezoek een beetje meer thuis</h1>
      <ul>
        <li>${icon('check')}<span>${esc(earn)}${example(L.isExample)}</span></li>
        <li>${icon('check')}<span>Beloningen van de kaart, zoals sangria en churros</span></li>
        <li>${icon('check')}<span>Een cadeau rond uw verjaardag</span></li>
        <li>${icon('check')}<span>Gratis, en u bepaalt zelf welke berichten u krijgt</span></li>
      </ul>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-line" href="#/aanmelden">Word gratis lid</a><a class="btn" style="color:var(--crema);text-decoration:underline" href="#/inloggen">Ik ben al lid</a></div>
    </div></section>
    <div class="wrap narrow"><section class="sec"><div class="sec-head"><h2>Beloningen</h2></div>${rewardsHtml(null)}</section></div>`;
  const bal = S.balance(m.id);
  const bday = S.birthdayGift(m.id);
  const memberOffers = s.offers.filter((o) => o.published && o.membersOnly);
  const tx = S.history(m.id).slice(0, 5);
  return `<div class="wrap narrow">
    <header class="page-head"><h1>La Caleta Club</h1></header>
    <div style="display:grid;gap:14px;justify-items:center;padding-block:8px 8px">
      ${cardHtml(m)}
      <button class="btn btn-line" data-act="open-card">${icon('qr')}Toon groot om te scannen</button>
    </div>
    <section class="sec saldo" aria-labelledby="h-saldo"><h2 id="h-saldo" class="label muted" style="font-family:var(--font-body)">Uw punten</h2><b data-points aria-live="polite">${bal}</b>${progressHtml(m)}<p class="xs muted">U spaart ${esc(earn)}${example(L.isExample)}.</p></section>
    <section class="sec" id="beloningen" aria-labelledby="h-rew"><div class="sec-head"><h2 id="h-rew">Beloningen</h2></div>${rewardsHtml(bal)}</section>
    <section class="sec" aria-labelledby="h-bday"><div class="sec-head"><h2 id="h-bday">Verjaardag</h2></div>
      ${bday ? `<div class="birthday">${icon('cake')}<div><strong>${esc(bday.description)}</strong>${example(bday.isExample)}<p class="small muted">${bday.active ? `Nu geldig, nog ${bday.validDays + bday.daysUntil} dagen. Laat uw kaart scannen.` : bday.daysUntil > 0 ? `Vanaf ${new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long' }).format(bday.date)} staat uw cadeau klaar, ${bday.validDays} dagen geldig.` : `Volgend jaar weer, vanaf ${new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long' }).format(bday.date)}.`}</p></div></div>` : `<div class="birthday">${icon('cake')}<div><strong>Vul uw verjaardag in</strong><p class="small muted">Alleen dag en maand. Dan staat er rond uw verjaardag een cadeau klaar.</p><a class="link small" href="#/profiel">Naar profiel</a></div></div>`}
    </section>
    ${memberOffers.length ? `<section class="sec" aria-labelledby="h-mo"><div class="sec-head"><h2 id="h-mo">Ledenaanbiedingen</h2></div>
      <div class="offer-list">${memberOffers.map((o) => offerItem(o, m)).join('')}</div>
    </section>` : ''}
    <section class="sec" aria-labelledby="h-tx"><div class="sec-head"><h2 id="h-tx">Historie</h2><a class="link" href="#/club/historie">Alles</a></div>${txList(tx)}</section>
    <p class="small"><a class="link" href="#/voorwaarden">Clubvoorwaarden</a></p>
  </div>`;
}

const txList = (tx) =>
  tx.length
    ? `<ul class="tx-list">${tx.map((t) => `<li><span>${esc(t.desc)}</span><span class="pts" data-neg="${t.points < 0}">${t.points > 0 ? '+' : ''}${t.points}</span><span class="when">${esc(stamp(t.at))}</span></li>`).join('')}</ul>`
    : '<p class="muted">Nog geen punten. Laat bij uw volgende bezoek uw ledenkaart scannen.</p>';

function vHistorie() {
  const m = me();
  if (!m) return vNeedLogin('uw historie');
  return `<div class="wrap narrow"><header class="page-head"><a class="link small" href="#/club">Terug naar de Club</a><h1 style="margin-top:12px">Historie</h1><p>Elke punt die erbij kwam of eraf ging. Correcties staan er als aparte regel bij.</p></header>${txList(S.history(m.id))}</div>`;
}

// ---------- Aanmelden en inloggen ----------
const signDraft = { firstName: '', email: '', password: '', day: '', month: '', terms: false, email_marketing: false, push_marketing: false, errors: {} };

function vAanmelden() {
  if (me()) return vClub();
  const e = signDraft.errors;
  const err = (k) => (e[k] ? `<span class="field-error" id="err-${k}">${esc(e[k])}</span>` : '');
  const inv = (k) => (e[k] ? `aria-invalid="true" aria-describedby="err-${k}"` : '');
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `<div class="wrap narrow">
    <header class="page-head"><span class="label" style="color:var(--vino)">La Caleta Club</span><h1 style="margin-top:6px">Word gratis lid</h1><p>Klaar in een minuut. De kaart en reserveren werken ook zonder account.</p></header>
    <form class="form" data-form="signup" novalidate>
      <label class="field"><span>Voornaam</span><input class="input" data-input="s-firstName" autocomplete="given-name" value="${esc(signDraft.firstName)}" ${inv('firstName')}>${err('firstName')}</label>
      <label class="field"><span>E-mail</span><input class="input" type="email" data-input="s-email" autocomplete="email" value="${esc(signDraft.email)}" ${inv('email')}>${err('email')}</label>
      <label class="field"><span>Wachtwoord</span><input class="input" type="password" data-input="s-password" autocomplete="new-password" value="${esc(signDraft.password)}" ${inv('password')} aria-describedby="pw-hint${e.password ? ' err-password' : ''}"><span class="field-hint" id="pw-hint">Minimaal 10 tekens.</span>${err('password')}</label>
      <fieldset class="fieldset"><legend style="font-family:var(--font-body);font-size:1rem;font-weight:500">Verjaardag (optioneel)</legend>
        <div style="display:grid;grid-template-columns:96px 1fr;gap:8px">
          <label class="field"><span class="sr-only">Dag</span><select class="input" data-input="s-day"><option value="">Dag</option>${Array.from({ length: 31 }, (_, i) => `<option ${String(i + 1) === signDraft.day ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
          <label class="field"><span class="sr-only">Maand</span><select class="input" data-input="s-month"><option value="">Maand</option>${months.map((mo, i) => `<option value="${i + 1}" ${String(i + 1) === signDraft.month ? 'selected' : ''}>${mo}</option>`).join('')}</select></label>
        </div>
        <span class="field-hint">Zonder geboortejaar. Alleen voor uw verjaardagscadeau.</span>
      </fieldset>
      <fieldset class="fieldset"><legend style="font-family:var(--font-body);font-size:1rem;font-weight:500">Berichten van La Caleta (optioneel)</legend>
        <label class="check"><input type="checkbox" data-input="s-email_marketing" ${signDraft.email_marketing ? 'checked' : ''}><span>Nieuws, experiencias en ledenaanbiedingen per e-mail</span></label>
        <label class="check"><input type="checkbox" data-input="s-push_marketing" ${signDraft.push_marketing ? 'checked' : ''}><span>Dezelfde berichten als pushmelding in de app</span></label>
        <span class="field-hint">Bevestigingen van reserveringen krijgt u altijd. U kunt dit later in uw profiel aanpassen.</span>
      </fieldset>
      <label class="check"><input type="checkbox" data-input="s-terms" ${signDraft.terms ? 'checked' : ''} ${inv('terms')}><span>Ik ga akkoord met de <a class="link" href="#/voorwaarden">Clubvoorwaarden</a> en de privacyverklaring</span></label>${err('terms')}
      <button class="btn btn-vino btn-block" type="submit">Lid worden</button>
      <p class="small">Al lid? <a class="link" href="#/inloggen">Gast kiezen</a></p>
    </form>
  </div>`;
}

function submitSignup() {
  const d = signDraft;
  const e = {};
  if (d.firstName.trim().length < 1) e.firstName = 'Vul uw voornaam in.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) e.email = 'Vul een geldig e-mailadres in.';
  if (d.password.length < 10) e.password = 'Kies een wachtwoord van minimaal 10 tekens.';
  if (!d.terms) e.terms = 'Ga akkoord met de voorwaarden om lid te worden.';
  d.errors = e;
  if (Object.keys(e).length) {
    rerender();
    main.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const res = S.signUp({
    firstName: d.firstName.trim(), email: d.email.trim(), password: d.password,
    birthday: d.day && d.month ? { d: Number(d.day), m: Number(d.month) } : null,
    consents: { email_marketing: d.email_marketing, push_marketing: d.push_marketing },
  });
  if (!res.ok) {
    d.errors = { [res.field]: res.message };
    return rerender();
  }
  Object.assign(signDraft, { firstName: '', email: '', password: '', day: '', month: '', terms: false, errors: {} });
  toast(`Bienvenido, ${res.member.firstName}. Uw ledenkaart staat klaar.`);
  go('club');
  setTimeout(() => {
    if (gsapOk()) window.gsap.fromTo('[data-door]', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'power3.out' });
  }, 60);
}

function vInloggen() {
  if (me()) return vClub();
  const testleden = S.get().members.filter((m) => m.test && !m.deletedAt);
  return `<div class="wrap narrow">
    <header class="page-head"><h1>Kies hoe u de app bekijkt</h1></header>
    <p class="muted">Dit is de demo: u hoeft niet in te loggen. Kies een gast met punten en reserveringen, of word zelf gratis lid.</p>
    <div class="form" style="margin-top:20px">
      ${testleden.map((m) => `<button class="btn btn-dark btn-block" type="button" data-act="demo-member" data-id="${m.id}" style="flex-direction:column;align-items:flex-start;gap:2px;text-align:left"><strong style="font-weight:500">Verder als ${esc(m.firstName)} ${esc(m.lastName)}</strong><span class="small" style="opacity:.85">Lid ${esc(m.memberNo)} · ${S.balance(m.id)} punten</span></button>`).join('')}
      <a class="btn btn-line btn-block" href="#/aanmelden">Word zelf gratis lid</a>
      <a class="btn btn-line btn-block" href="#/home">Verder zonder account</a>
    </div>
  </div>`;
}

function vNeedLogin(what) {
  return `<div class="wrap narrow"><div class="empty"><h1 style="font-size:2.2rem">Kies een gast voor ${esc(what)}</h1><p class="muted">De kaart, reserveren en experiencias bekijken werken ook zonder account.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-vino" href="#/aanmelden">Word gratis lid</a><a class="btn btn-line" href="#/inloggen">Gast kiezen</a></div></div></div>`;
}

// ---------- Experiencias ----------
function vExperiencias() {
  const ev = S.get().events.filter((e) => e.published && e.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date));
  return `<div class="wrap"><header class="page-head"><h1>Experiencias</h1><p>Avonden en menu’s die er even uitspringen.</p></header>
    ${ev.length ? `<div class="ev-list">${ev.map(evItem).join('')}</div>` : `<p class="muted">Er staan nu geen experiencias gepland. Volg ons op <a class="link" href="${SITE.site.social.instagram}" target="_blank" rel="noopener">Instagram</a> voor nieuwe avonden.</p>`}</div>`;
}

function vExperiencia(id) {
  const e = S.get().events.find((x) => x.id === id && x.published);
  if (!e) return `<div class="wrap narrow"><div class="empty"><h1 style="font-size:2rem">Deze experiencia bestaat niet meer</h1><a class="btn btn-line" href="#/experiencias">Alle experiencias</a></div></div>`;
  const m = me();
  const taken = e.signups.reduce((n, s) => n + s.guests, 0);
  const left = e.capacity ? e.capacity - taken : 99;
  const mine = m && e.signups.find((s) => s.memberId === m.id);
  let action;
  if (mine) action = `<div class="notice">${icon('check')}<span>U bent aangemeld met ${mine.guests} ${mine.guests === 1 ? 'persoon' : 'personen'}. U krijgt een herinnering.</span></div><button class="btn btn-line" data-act="ev-cancel" data-id="${e.id}">Afmelden</button>`;
  else if (!m) action = `<p class="small muted">Kies een gast of word lid om u aan te melden, zodat La Caleta u kan bereiken.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-vino" href="#/aanmelden">Word gratis lid</a><a class="btn btn-line" href="#/inloggen">Gast kiezen</a></div>`;
  else if (left <= 0) action = `<p><strong>Vol.</strong> <span class="muted">Er is een wachtlijst in de echte app.</span></p>`;
  else action = `<form class="form" data-form="event" data-id="${e.id}" style="gap:12px"><label class="field" style="max-width:220px"><span>Aantal personen</span><select class="input" name="guests">${Array.from({ length: Math.min(6, left) }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label><button class="btn btn-vino" type="submit">Aanmelden</button></form>`;
  return `<div class="wrap narrow">
    <header class="page-head"><a class="link small" href="#/experiencias">Alle experiencias</a></header>
    <div class="arco" style="aspect-ratio:4/3;border-radius:600px 600px 0 0">${img(e.image, '', '', '44rem')}</div>
    <h1 style="font-size:clamp(2.2rem,8vw,3rem);margin-top:20px">${esc(e.title)}${example(e.isExample)}</h1>
    <dl class="summary" style="margin-top:16px"><dt>Wanneer</dt><dd>${esc(longDate(e.date))}, ${esc(e.time)}</dd><dt>Prijs</dt><dd>${e.priceCents ? euro(e.priceCents) : e.priceCents === 0 ? 'Gratis' : '<span class="muted">Volgt binnenkort</span>'}</dd><dt>Plaatsen</dt><dd>${e.capacity ? `${Math.max(0, left)} van ${e.capacity} vrij` : 'Onbeperkt'}</dd>${e.membersOnly ? '<dt>Voor</dt><dd>Alleen Clubleden</dd>' : ''}</dl>
    <p style="margin-top:16px">${esc(e.body)}</p>
    <div style="margin-top:24px;display:grid;gap:12px">${action}</div>
  </div>`;
}

// ---------- Cadeaubon ----------
const gift = { amount: null, custom: '', to: '', from: '', message: '', email: '', done: false, error: '' };
function vCadeaubon() {
  const g = S.get().giftcard;
  if (gift.amount === null) gift.amount = g.amounts[1];
  if (gift.done)
    return `<div class="wrap narrow"><div class="success"><div class="success-mark">${icon('check')}</div><h1 style="font-size:2.3rem">Aanvraag verstuurd</h1><p>La Caleta neemt contact met u op om de cadeaubon af te rekenen. U kunt de bon ook in het restaurant kopen.</p><button class="btn btn-line" data-act="gift-new">Nog een cadeaubon</button></div></div>`;
  const amountCents = gift.amount === 'custom' ? Math.round(Number(gift.custom.replace(',', '.')) * 100) || 0 : gift.amount;
  return `<div class="wrap narrow">
    <header class="page-head"><h1>Cadeaubon</h1><p>Iemand verrassen met een avond bij La Caleta, met een bedrag naar keuze.</p></header>
    <div class="giftcard-preview on-vino" aria-hidden="true"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="script" style="font-size:1.9rem">La Caleta</span><span class="label" style="color:var(--oro)">Cadeaubon</span></div><div><div class="amount num" data-gift-amount>${amountCents ? euro(amountCents) : '€ ...'}</div><p class="msg" data-gift-msg>${esc(gift.message) || 'Uw persoonlijke boodschap'}</p><p class="xs muted" data-gift-to>${gift.to ? `Voor ${esc(gift.to)}` : ''}${gift.from ? `, van ${esc(gift.from)}` : ''}</p></div></div>
    <form class="form" data-form="gift" novalidate style="margin-top:24px">
      <fieldset class="fieldset"><legend>Bedrag${example(g.isExample)}</legend><div class="wish-row">${g.amounts.map((a) => `<button type="button" class="chip" data-act="gift-amount" data-id="${a}" data-focus="ga-${a}" aria-pressed="${gift.amount === a}">${euro(a)}</button>`).join('')}<button type="button" class="chip" data-act="gift-amount" data-id="custom" data-focus="ga-c" aria-pressed="${gift.amount === 'custom'}">Ander bedrag</button></div>
        ${gift.amount === 'custom' ? `<label class="field" style="max-width:200px"><span>Bedrag in euro</span><input class="input" data-input="g-custom" inputmode="decimal" value="${esc(gift.custom)}" placeholder="${g.min / 100} tot ${g.max / 100}"></label>` : ''}
      </fieldset>
      <label class="field"><span>Voor wie</span><input class="input" data-input="g-to" value="${esc(gift.to)}" autocomplete="off"></label>
      <label class="field"><span>Van</span><input class="input" data-input="g-from" value="${esc(gift.from)}" autocomplete="name"></label>
      <label class="field"><span>Persoonlijke boodschap</span><textarea class="input" data-input="g-message" maxlength="140">${esc(gift.message)}</textarea><span class="field-hint"><span data-gift-count>${gift.message.length}</span>/140 tekens</span></label>
      <label class="field"><span>Uw e-mail</span><input class="input" type="email" data-input="g-email" value="${esc(gift.email || me()?.email || '')}" autocomplete="email"></label>
      <div class="notice">${icon('info')}<span>Online betalen is nog niet actief. La Caleta neemt contact met u op om af te rekenen, of koop de bon in het restaurant. De VVV-cadeaukaart is ook welkom.</span></div>
      ${gift.error ? `<div class="notice" data-tone="err" role="alert">${icon('alert')}<span>${esc(gift.error)}</span></div>` : ''}
      <button class="btn btn-vino btn-block" type="submit">Aanvraag versturen</button>
    </form>
  </div>`;
}

// ---------- Meer, profiel, info, meldingen, voorwaarden ----------
function vMeer() {
  const m = me();
  const unread = m ? S.inbox(m.id).length : 0;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;
  return `<div class="wrap narrow"><header class="page-head"><h1>Meer</h1></header>
    <ul class="link-list">
      <li><a href="#/experiencias">${icon('wine')}<span>Experiencias</span>${icon('right')}</a></li>
      <li><a href="#/cadeaubon">${icon('gift')}<span>Cadeaubon</span>${icon('right')}</a></li>
      <li><a href="#/meldingen">${icon('bell')}<span>Meldingen${unread ? ` (${unread})` : ''}</span>${icon('right')}</a></li>
      <li><a href="${m ? '#/profiel' : '#/inloggen'}">${icon('user')}<span>${m ? 'Mijn profiel en privacy' : 'Gast kiezen of lid worden'}</span>${icon('right')}</a></li>
      <li><a href="#/info">${icon('info')}<span>Info en contact</span>${icon('right')}</a></li>
      <li><a href="#/voorwaarden">${icon('shield')}<span>Clubvoorwaarden</span>${icon('right')}</a></li>
      <li><button data-act="install">${icon('phoneapp')}<span>App installeren</span>${icon('right')}</button></li>
    </ul>
    ${ios ? `<p class="small muted" style="margin-top:12px">Op iPhone: tik op Delen en kies "Zet op beginscherm".</p>` : ''}
    <p class="small muted" style="margin-top:32px">Werkt u bij La Caleta? <a class="link" href="beheer.html">Beheer bekijken (voor personeel)</a></p>
  </div>`;
}

const profDraft = {};
function vProfiel() {
  const m = me();
  if (!m) return vNeedLogin('uw profiel');
  Object.keys(profDraft).length || Object.assign(profDraft, { firstName: m.firstName, lastName: m.lastName ?? '', phone: m.phone ?? '', day: m.birthday?.d ? String(m.birthday.d) : '', month: m.birthday?.m ? String(m.birthday.m) : '', email_marketing: !!m.consents?.email_marketing, push_marketing: !!m.consents?.push_marketing });
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `<div class="wrap narrow"><header class="page-head"><h1>Mijn profiel</h1><p>${esc(m.email)}, lidnummer ${esc(m.memberNo)}</p></header>
    <form class="form" data-form="profile" novalidate>
      <label class="field"><span>Voornaam</span><input class="input" data-input="p-firstName" value="${esc(profDraft.firstName)}" autocomplete="given-name"></label>
      <label class="field"><span>Achternaam (optioneel)</span><input class="input" data-input="p-lastName" value="${esc(profDraft.lastName)}" autocomplete="family-name"></label>
      <label class="field"><span>Telefoon (optioneel)</span><input class="input" type="tel" data-input="p-phone" value="${esc(profDraft.phone)}" autocomplete="tel"><span class="field-hint">Wordt ingevuld bij reserveren.</span></label>
      <fieldset class="fieldset"><legend style="font-family:var(--font-body);font-size:1rem;font-weight:500">Verjaardag</legend><div style="display:grid;grid-template-columns:96px 1fr;gap:8px">
        <label class="field"><span class="sr-only">Dag</span><select class="input" data-input="p-day"><option value="">Dag</option>${Array.from({ length: 31 }, (_, i) => `<option ${String(i + 1) === profDraft.day ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
        <label class="field"><span class="sr-only">Maand</span><select class="input" data-input="p-month"><option value="">Maand</option>${months.map((mo, i) => `<option value="${i + 1}" ${String(i + 1) === profDraft.month ? 'selected' : ''}>${mo}</option>`).join('')}</select></label></div></fieldset>
      <fieldset class="fieldset"><legend style="font-family:var(--font-body);font-size:1rem;font-weight:500">Toestemming voor berichten</legend>
        <label class="check"><input type="checkbox" data-input="p-email_marketing" ${profDraft.email_marketing ? 'checked' : ''}><span>Nieuws en aanbiedingen per e-mail</span></label>
        <label class="check"><input type="checkbox" data-input="p-push_marketing" ${profDraft.push_marketing ? 'checked' : ''}><span>Nieuws en aanbiedingen als pushmelding</span></label>
        <span class="field-hint">Elke wijziging wordt met datum vastgelegd.</span></fieldset>
      <button class="btn btn-dark" type="submit">Opslaan</button>
    </form>
    <section class="sec" style="margin-top:24px"><div class="sec-head"><h2>Mijn gegevens</h2></div>
      <ul class="link-list">
        <li><button data-act="export">${icon('download')}<span>Mijn gegevens downloaden</span>${icon('right')}</button></li>
        <li><button data-act="logout">${icon('logout')}<span>Van gast wisselen</span>${icon('right')}</button></li>
        <li><button data-act="delete">${icon('trash')}<span>Account verwijderen</span>${icon('right')}</button></li>
      </ul></section>
  </div>`;
}

function vInfo() {
  const h = SITE.openingHours;
  return `<div class="wrap narrow"><header class="page-head"><h1>Info en contact</h1></header>
    <div class="arco" style="aspect-ratio:16/10;border-radius:0">${img('exterieur', 'De gevel van La Caleta aan het Raadhuisplein', '', '44rem')}</div>
    <section class="sec"><div class="sec-head"><h2>Openingstijden</h2></div>
      <dl class="summary">${h.map((d) => `<dt>${d.day}</dt><dd class="num">${d.status === 'open' ? `${d.opens} tot ${d.closes}` : 'Gesloten'}</dd>`).join('')}</dl>
      <p class="small muted" style="margin-top:10px">Warme keuken tot ${SITE.reservation.kitchenCloses}.</p></section>
    <section class="sec"><div class="sec-head"><h2>Contact</h2></div>
      <ul class="info-list">
        <li>${icon('phone')}<a class="link" href="${SITE.site.phoneHref}">${esc(SITE.site.phone)}</a></li>
        <li>${icon('mail')}<a class="link" href="mailto:${SITE.site.email}">${esc(SITE.site.email)}</a></li>
        <li>${icon('pin')}<span>${esc(SITE.site.address.street)}, ${esc(SITE.site.address.postalCode)} ${esc(SITE.site.address.city)}<br><a class="link small" href="${esc(SITE.site.mapsHref)}" target="_blank" rel="noopener">Route in Google Maps</a></span></li>
        <li>${icon('car')}<span>Gratis parkeren in de buurt</span></li>
        <li>${icon('gift')}<span>VVV-cadeaukaart is welkom</span></li>
      </ul></section>
    <section class="sec"><div class="sec-head"><h2>Volg ons</h2></div>
      <p><a class="link" href="${SITE.site.social.facebook}" target="_blank" rel="noopener">Facebook</a> en <a class="link" href="${SITE.site.social.instagram}" target="_blank" rel="noopener">Instagram</a></p>
</section>
  </div>`;
}

function vMeldingen() {
  const m = me();
  if (!m) return vNeedLogin('uw meldingen');
  const list = S.inbox(m.id);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `<div class="wrap narrow"><header class="page-head"><h1>Meldingen</h1></header>
    ${list.length ? `<ul class="tx-list">${list.map((n) => `<li><span><strong>${esc(n.title)}</strong><br>${esc(n.body)}</span><span class="when">${esc(stamp(n.at))}</span></li>`).join('')}</ul>` : '<p class="muted">Nog geen meldingen.</p>'}
    <section class="sec"><div class="sec-head"><h2>Pushmeldingen</h2></div>
      <p class="small muted">${perm === 'granted' ? 'Pushmeldingen staan aan op dit apparaat.' : perm === 'denied' ? 'Pushmeldingen zijn geblokkeerd in de instellingen van uw browser.' : perm === 'unsupported' ? 'Dit apparaat ondersteunt geen pushmeldingen. Op iPhone werkt het als de app op het beginscherm staat.' : 'Krijg een melding als uw reservering bevestigd is of als u punten krijgt.'}</p>
      ${perm === 'default' ? '<button class="btn btn-line" data-act="push" style="margin-top:12px">Pushmeldingen aanzetten</button>' : ''}</section>
  </div>`;
}

function vVoorwaarden() {
  const L = S.get().loyalty;
  return `<div class="wrap narrow"><header class="page-head"><h1>Clubvoorwaarden</h1><p class="small">Versie ${L.version}, ${esc(stamp(L.updatedAt))}${example(L.isExample)}</p></header>
    <p>${esc(L.terms)}</p>
</div>`;
}

// ---------- Sheet en kaart-overlay ----------
const sheet = document.getElementById('sheet');
function openSheet(html) {
  sheet.querySelector('.sheet-body').innerHTML = html;
  sheet.showModal();
  sheet.scrollTop = 0;
  if (gsapOk()) window.gsap.from(sheet, { y: 40, opacity: 0, duration: 0.35, ease: 'power3.out' });
}
sheet.addEventListener('click', (e) => {
  if (e.target === sheet || e.target.closest('[data-close]')) sheet.close();
});

const cardDlg = document.getElementById('card-dialog');
function openCard() {
  const m = me();
  if (!m) return go('inloggen');
  renderCardDialog();
  cardDlg.showModal();
  if (gsapOk()) window.gsap.fromTo(cardDlg.querySelector('[data-door]'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: 'power3.out' });
}
function renderCardDialog() {
  const m = me();
  if (!m) return cardDlg.open && cardDlg.close();
  cardDlg.querySelector('[data-card]').innerHTML = cardHtml(m, { big: true });
  cardDlg.querySelector('[data-count]').textContent = String(S.qrSecondsLeft());
  cardDlg.querySelector('[data-no]').textContent = m.memberNo;
}
cardDlg.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) cardDlg.close();
});

let lastWindow = Math.floor(Date.now() / 30000);
setInterval(() => {
  const w = Math.floor(Date.now() / 30000);
  if (cardDlg.open) cardDlg.querySelector('[data-count]').textContent = String(S.qrSecondsLeft());
  if (w !== lastWindow || (flash && flash.until <= Date.now() && !flash.cleared)) {
    lastWindow = w;
    if (flash && flash.until <= Date.now()) flash.cleared = true;
    const m = me();
    if (!m) return;
    const qrHtml = qrSvg(S.qrToken(m.id), { label: `Ledenkaart van ${m.firstName}, lidnummer ${m.memberNo}` });
    document.querySelectorAll('[data-qr]').forEach((el) => {
      el.innerHTML = qrHtml;
    });
    document.querySelectorAll('.scanned').forEach((el) => {
      if (flash?.cleared) el.remove();
    });
  }
}, 1000);

// ---------- Router ----------
function view(path, params) {
  const [a, b] = path.split('/');
  switch (a) {
    case 'home': return vHome();
    case 'kaart': return vKaart(params);
    case 'reserveren': return vReserveren();
    case 'club': return b === 'historie' ? vHistorie() : vClub();
    case 'aanmelden': return vAanmelden();
    case 'inloggen': return vInloggen();
    case 'experiencias': return b ? vExperiencia(b) : vExperiencias();
    case 'cadeaubon': return vCadeaubon();
    case 'meer': return vMeer();
    case 'profiel': return vProfiel();
    case 'info': return vInfo();
    case 'meldingen': return vMeldingen();
    case 'voorwaarden': return vVoorwaarden();
    default: return vHome();
  }
}
const TITLES = { home: 'Home', kaart: 'Menukaart', reserveren: 'Reserveren', club: 'La Caleta Club', aanmelden: 'Lid worden', inloggen: 'Gast kiezen', experiencias: 'Experiencias', cadeaubon: 'Cadeaubon', meer: 'Meer', profiel: 'Profiel', info: 'Info', meldingen: 'Meldingen', voorwaarden: 'Clubvoorwaarden' };
const TAB_OF = { home: 'home', kaart: 'kaart', reserveren: 'reserveren', club: 'club', aanmelden: 'club', inloggen: 'club' };

function render({ fromRoute = false, focusKey = null } = {}) {
  const { path, params } = route();
  const top = path.split('/')[0];
  main.innerHTML = view(path, params);
  document.title = `${TITLES[top] ?? 'Home'}, La Caleta`;
  const tab = TAB_OF[top] ?? 'meer';
  nav.querySelectorAll('a[data-tab]').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const m = me();
  document.querySelector('[data-top-user]').setAttribute('aria-label', m ? `Ledenkaart van ${m.firstName}` : 'Gast kiezen');
  if (focusKey) main.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`)?.focus();
  if (fromRoute) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    if (gsapOk()) window.gsap.from(main.children, { y: 8, opacity: 0, duration: 0.3, ease: 'power2.out', stagger: 0.04, clearProps: 'all' });
  }
  current = path;
}
const rerender = (focusKey) => render({ focusKey });

window.addEventListener('hashchange', () => render({ fromRoute: true }));

S.subscribe((change) => {
  const m = me();
  const bal = m ? S.balance(m.id) : null;
  if (m && change.memberId === m.id && lastBalance !== null && bal !== lastBalance) {
    const delta = bal - lastBalance;
    flash = { points: delta, until: Date.now() + 4500 };
    toast(delta > 0 ? `+${delta} punten voor uw bezoek. ¡Gracias!` : `${-delta} punten ingewisseld. ¡Buen provecho!`);
  }
  const prevBal = lastBalance;
  lastBalance = bal;
  if (change.reservation && change.remote && m) {
    const r = S.get().reservations.find((x) => x.id === change.reservation && x.memberId === m.id);
    if (r && r.status !== 'aangevraagd') toast(`Uw reservering van ${shortDate(r.date)}: ${statusLabel[r.status].toLowerCase()}.`);
  }
  if (cardDlg.open) renderCardDialog();
  if (FORM_VIEWS.has(current.split('/')[0]) && !change.reset) return;
  render();
  if (prevBal !== null && bal !== null && prevBal !== bal) main.querySelectorAll('[data-points]').forEach((el) => countUp(el, prevBal, bal));
});

// ---------- Interactie ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const id = t.dataset.id;
  switch (t.dataset.act) {
    case 'open-card': return openCard();
    case 'dish': return openDish(id);
    case 'cat':
      menuState.cat = id;
      menuState.q = '';
      main.querySelector('[data-input="menu-q"]').value = '';
      main.querySelectorAll('[data-act="cat"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      main.querySelector('#menu-list').innerHTML = menuList();
      return;
    case 'tag':
      menuState.tag = menuState.tag === id ? null : id;
      main.querySelectorAll('[data-act="tag"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === menuState.tag)));
      main.querySelector('#menu-list').innerHTML = menuList();
      return;
    case 'clear-q':
      menuState.q = '';
      main.querySelector('[data-input="menu-q"]').value = '';
      main.querySelectorAll('[data-act="cat"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === menuState.cat)));
      main.querySelector('#menu-list').innerHTML = menuList();
      return;
    case 'clear-tag':
      menuState.tag = null;
      main.querySelectorAll('[data-act="tag"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      main.querySelector('#menu-list').innerHTML = menuList();
      return;
    case 'date':
      draft.date = id;
      delete draft.errors.date;
      return rerender(t.dataset.focus);
    case 'guests':
      draft.guests = Math.min(SITE.reservation.maxGuests + 1, Math.max(1, draft.guests + Number(id)));
      return rerender(draft.guests > SITE.reservation.maxGuests ? 'g-min' : t.dataset.focus);
    case 'time':
      draft.time = id;
      delete draft.errors.time;
      return rerender(t.dataset.focus);
    case 'wish':
      draft.wishes = draft.wishes.includes(id) ? draft.wishes.filter((w) => w !== id) : [...draft.wishes, id];
      return rerender(t.dataset.focus);
    case 'res-new':
      draft.done = null;
      return rerender();
    case 'demo-member': {
      const r = S.demoMemberLogIn(id);
      if (!r.ok) return toast(r.message, 'err');
      lastBalance = S.balance(me().id);
      toast(`U bekijkt de app als ${r.member.firstName}.`);
      return go('club');
    }
    case 'ev-cancel':
      S.cancelEvent(id, me().id);
      toast('U bent afgemeld.');
      return;
    case 'gift-amount':
      gift.amount = id === 'custom' ? 'custom' : Number(id);
      return rerender(t.dataset.focus);
    case 'gift-new':
      Object.assign(gift, { done: false, to: '', message: '', custom: '' });
      return rerender();
    case 'install':
      if (installEvent) {
        installEvent.prompt();
        installEvent = null;
      } else toast('Gebruik in uw browser "Installeren" of "Zet op beginscherm".');
      return;
    case 'push':
      Notification.requestPermission().then(() => rerender());
      return;
    case 'export': {
      const m = me();
      const s = S.get();
      const data = { lid: m, punten: S.history(m.id), reserveringen: s.reservations.filter((r) => r.memberId === m.id), experiencias: s.events.filter((x) => x.signups.some((y) => y.memberId === m.id)).map((x) => x.title), geexporteerd: new Date().toISOString() };
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `la-caleta-mijn-gegevens-${m.memberNo}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    case 'logout':
      S.logOut();
      for (const k of Object.keys(profDraft)) delete profDraft[k];
      Object.assign(draft, { name: '', email: '', phone: '' });
      lastBalance = null;
      toast('Kies een andere gast.');
      return go('inloggen');
    case 'delete':
      openSheet(`<h2 id="sheet-title">Account verwijderen?</h2><p>Uw punten vervallen en u kunt niet meer inloggen. Uw historie blijft zonder naam bewaard voor de administratie van La Caleta.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-reserve" data-act="delete-yes">Ja, verwijder mijn account</button><button class="btn btn-line" data-close>Annuleren</button></div>`);
      return;
    case 'delete-yes':
      S.deleteAccount(me().id);
      sheet.close();
      lastBalance = null;
      toast('Uw account is verwijderd.');
      return go('home');
    case 'welcome':
      localStorage.setItem('lc-welkom', '1');
      document.getElementById('welcome').hidden = true;
      return go(id);
  }
});

document.addEventListener('input', (e) => {
  const k = e.target.dataset?.input;
  if (!k) return;
  const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (k === 'menu-q') {
    menuState.q = v;
    main.querySelectorAll('[data-act="cat"]').forEach((b) => b.setAttribute('aria-pressed', String(!v && b.dataset.id === menuState.cat)));
    main.querySelector('#menu-list').innerHTML = menuList();
  } else if (k.startsWith('s-')) signDraft[k.slice(2)] = v;
  else if (k.startsWith('p-')) profDraft[k.slice(2)] = v;
  else if (k.startsWith('g-')) {
    gift[k.slice(2)] = v;
    const amountCents = gift.amount === 'custom' ? Math.round(Number(gift.custom.replace(',', '.')) * 100) || 0 : gift.amount;
    main.querySelector('[data-gift-amount]').textContent = amountCents ? euro(amountCents) : '€ ...';
    main.querySelector('[data-gift-msg]').textContent = gift.message || 'Uw persoonlijke boodschap';
    main.querySelector('[data-gift-to]').textContent = `${gift.to ? `Voor ${gift.to}` : ''}${gift.from ? `, van ${gift.from}` : ''}`;
    main.querySelector('[data-gift-count]').textContent = String(gift.message.length);
  } else if (k in draft) {
    draft[k] = v;
    if (draft.errors[k]) {
      delete draft.errors[k];
      e.target.removeAttribute('aria-invalid');
    }
  }
});
document.addEventListener('change', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true }));
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  switch (f.dataset.form) {
    case 'reserve': return submitReserve();
    case 'signup': return submitSignup();
    case 'event': {
      const r = S.signUpEvent(f.dataset.id, me().id, Number(new FormData(f).get('guests')));
      toast(r.ok ? 'U bent aangemeld. U krijgt een bevestiging.' : r.message, r.ok ? 'ok' : 'err');
      return;
    }
    case 'gift': {
      const g = S.get().giftcard;
      const cents = gift.amount === 'custom' ? Math.round(Number(gift.custom.replace(',', '.')) * 100) || 0 : gift.amount;
      const email = gift.email || me()?.email || '';
      if (cents < g.min || cents > g.max) gift.error = `Kies een bedrag tussen ${euro(g.min)} en ${euro(g.max)}.`;
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) gift.error = 'Vul uw e-mailadres in, zodat La Caleta contact kan opnemen.';
      else {
        S.requestGiftcard({ amountCents: cents, to: gift.to, from: gift.from, message: gift.message, email, memberId: me()?.id ?? null });
        gift.error = '';
        gift.done = true;
      }
      return rerender();
    }
    case 'profile': {
      const m = me();
      S.updateProfile(m.id, {
        firstName: profDraft.firstName.trim() || m.firstName, lastName: profDraft.lastName.trim(), phone: profDraft.phone.trim(),
        birthday: profDraft.day && profDraft.month ? { d: Number(profDraft.day), m: Number(profDraft.month) } : null,
        consents: { email_marketing: !!profDraft.email_marketing, push_marketing: !!profDraft.push_marketing },
      });
      toast('Uw profiel is opgeslagen.');
      return render();
    }
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
});

// ---------- Start ----------
lastBalance = me() ? S.balance(me().id) : null;
const welcome = document.getElementById('welcome');
if (!localStorage.getItem('lc-welkom') && !location.hash) welcome.hidden = false;
render({ fromRoute: true });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
