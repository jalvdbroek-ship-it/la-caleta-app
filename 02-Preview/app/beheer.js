// Beheerpaneel van de preview. Rechten per rol uit store.js; elke actie gaat via de store-functies.
import { SITE } from './site-data.js';
import * as S from './store.js';
import { addDays, esc, euro, icon, longDate, shortDate, slotsFor, stamp, toast, todayIso, uid } from './util.js';

const main = document.getElementById('b-main');
const navEl = document.getElementById('b-nav');
const dlg = document.getElementById('b-dialog');
const TAG = SITE.tagLabels;
const ALLERGENS = ['Gluten', 'Schaaldieren', 'Ei', 'Vis', 'Pinda', 'Soja', 'Melk', 'Noten', 'Selderij', 'Mosterd', 'Sesam', 'Sulfiet', 'Lupine', 'Weekdieren'];
const IMAGES = ['tapas', 'cazuelas', 'tapas-warm', 'grill', 'vis', 'paella', 'churros', 'wijn', 'sangria', 'lunch', 'puerta', 'interieur', 'kaarsen'];

const SECTIONS = [
  ['vandaag', 'Vandaag', 'sun', null],
  ['scannen', 'Scannen', 'scan', 'scan'],
  ['reserveringen', 'Reserveringen', 'calendar', 'reservations'],
  ['leden', 'Leden', 'users', 'members_view'],
  ['spaarsysteem', 'Spaarsysteem', 'gift', null],
  ['menukaart', 'Menukaart', 'book', 'menu'],
  ['experiencias', 'Experiencias', 'wine', 'events'],
  ['acties', 'Acties', 'tag', 'offers'],
  ['meldingen', 'Meldingen', 'bell', 'notify'],
  ['cadeaubonnen', 'Cadeaubonnen', 'ticket', 'giftcards'],
  ['rechten', 'Medewerkers en rechten', 'shield', 'staff'],
  ['audit', 'Auditlog', 'history', 'audit'],
];

const route = () => (location.hash.replace(/^#\/?/, '') || 'vandaag').split('/');
const allowed = (sec) => {
  const s = SECTIONS.find((x) => x[0] === sec);
  return s && (!s[3] || S.can(s[3]));
};
const example = (on) => (on ? ' <span class="badge-example">Voorbeeld</span>' : '');
const head = (title, sub = '', actions = '') =>
  `<header class="b-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${actions}</div>` : ''}</header>`;
const lock = (txt) => `<div class="lock">${icon('lock')}<span>${esc(txt)}</span></div>`;
const statusLabel = { aangevraagd: 'Aangevraagd', bevestigd: 'Bevestigd', voorstel: 'Voorstel gedaan', geweigerd: 'Geweigerd', geannuleerd: 'Geannuleerd door gast' };

function openDialog(title, body) {
  dlg.innerHTML = `<div class="b-dialog-head"><h2 id="b-dlg-title">${title}</h2><button class="icon-btn" data-close aria-label="Sluiten">${icon('x')}</button></div><div class="b-dialog-body">${body}</div>`;
  dlg.showModal();
}
dlg.addEventListener('click', (e) => {
  if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
});

// ---------- Vandaag ----------
function vVandaag() {
  const s = S.get();
  const t = todayIso();
  const resToday = s.reservations.filter((r) => r.date === t && ['bevestigd', 'aangevraagd'].includes(r.status)).sort((a, b) => a.time.localeCompare(b.time));
  const open = s.reservations.filter((r) => r.status === 'aangevraagd');
  const txToday = s.ledger.filter((x) => x.kind === 'bezoek' && todayIso(new Date(x.at)) === t);
  const bdays = s.members.filter((m) => m.birthday && !m.deletedAt).filter((m) => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(`${addDays(t, i)}T12:00:00Z`);
      if (d.getUTCDate() === m.birthday.d && d.getUTCMonth() + 1 === m.birthday.m) return true;
    }
    return false;
  });
  const todos = [
    s.loyalty.isExample && ['Spaarregels vaststellen', 'spaarsysteem'],
    s.rewards.some((r) => r.isExample) && ['Beloningen vaststellen', 'spaarsysteem'],
    s.birthday.isExample && ['Verjaardagscadeau vaststellen', 'spaarsysteem'],
    s.dishes.some((d) => d.allergens === null) && [`Allergenen invullen (${s.dishes.filter((d) => d.allergens === null).length} gerechten)`, 'menukaart'],
    s.events.some((e) => e.isExample) && ['Voorbeeld-experiencias vervangen door echte', 'experiencias'],
    !s.offers.some((o) => o.membersOnly) && ['Ledenaanbieding aanmaken', 'acties'],
    s.giftcard.isExample && ['Cadeaubon: bedragen en betaalprovider kiezen', 'cadeaubonnen'],
  ].filter(Boolean);
  return `${head(`Vandaag`, `${esc(longDate(t))}${SITE.tapasDay.dayIndexes.includes(new Date(`${t}T12:00:00Z`).getUTCDay()) ? ', tapasdag' : ''}`, S.can('scan') ? `<a class="btn btn-vino" href="#/scannen">${icon('scan')}Ledenkaart scannen</a>` : '')}
    <div class="facts">
      <a class="fact" href="#/reserveringen"><b>${open.length}</b><span>aanvragen wachten op antwoord</span></a>
      <a class="fact" href="#/reserveringen"><b>${resToday.length}</b><span>reserveringen vandaag, ${resToday.reduce((n, r) => n + r.guests, 0)} gasten</span></a>
      <div class="fact"><b>${txToday.length}</b><span>bezoeken gescand, ${txToday.reduce((n, x) => n + x.points, 0)} punten</span></div>
      <div class="fact"><b>${bdays.length}</b><span>leden jarig deze week</span></div>
    </div>
    <div class="grid-2" style="margin-top:16px">
      <section class="panel"><h2>Reserveringen vandaag</h2>
        ${resToday.length ? `<table class="tbl"><tbody>${resToday.map((r) => `<tr><td class="n">${esc(r.time)}</td><td>${esc(r.name)}${r.test ? ' <span class="badge-example">Test</span>' : ''}<br><span class="xs muted">${r.wishes.map(esc).join(', ')}</span></td><td class="n">${r.guests} p.</td><td>${statusLabel[r.status]}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Geen reserveringen voor vandaag.</p>'}
      </section>
      <section class="panel"><h2>Nog in te vullen door La Caleta</h2>
        ${todos.length ? `<ul style="margin:0;padding:0;list-style:none;display:grid;gap:0">${todos.map(([txt, sec]) => `<li style="border-bottom:1px solid var(--hair)"><a href="#/${sec}" style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;color:inherit;text-decoration:none"><span>${esc(txt)}</span>${icon('right')}</a></li>`).join('')}</ul>` : '<p class="muted">Alles is ingevuld.</p>'}
      </section>
    </div>`;
}

// ---------- Scannen ----------
const scan = { stage: 'start', token: '', result: null, key: null, amount: '', override: '', stream: null, error: '' };

function vScannen() {
  if (!S.can('scan')) return head('Scannen') + lock('Uw rol mag geen punten toekennen.');
  const L = S.get().loyalty;
  const s = S.get();
  const guest = s.session.memberId ? S.member(s.session.memberId) : null;
  let body = '';
  if (scan.stage === 'camera')
    body = `<div class="panel scan-stage"><div class="scan-video"><video data-video playsinline muted></video></div><p class="small muted" style="text-align:center">Houd de QR-code in het kader.</p><button class="btn btn-line" data-act="scan-stop">Stoppen</button></div>`;
  else if (scan.stage === 'result') body = scanResult(L);
  else
    body = `<div class="panel scan-start">
      <button class="btn btn-vino" data-act="scan-camera">${icon('camera')}Camera openen</button>
      <p class="small muted">${'BarcodeDetector' in window ? 'De camera herkent de QR-code vanzelf.' : 'Deze browser kan geen QR-codes lezen met de camera. Typ het lidnummer of plak de code hieronder.'}</p>
      ${scan.error ? `<div class="msg" data-tone="err" role="alert">${icon('alert')}<span>${esc(scan.error)}</span></div>` : ''}
      <form data-form="scan-code" style="display:flex;gap:8px;width:min(100%,420px)"><label style="flex:1"><span class="sr-only">Code of lidnummer</span><input class="input" name="code" placeholder="Lidnummer, bijv. LC-0101" autocomplete="off" value="${esc(scan.token)}"></label><button class="btn btn-dark" type="submit">Zoek</button></form>
    </div>
    <div class="panel"><h2>Testen zonder camera</h2><p class="small muted" style="margin-bottom:10px">Scan de kaart die nu open staat in de gastenapp op deze computer, of een testlid.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${guest ? `<button class="btn btn-line btn-sm" data-act="scan-sim" data-id="${guest.id}">${icon('qr')}Scan kaart van ${esc(guest.firstName)} (gastenapp)</button>` : '<span class="small muted">Er is niemand ingelogd in de gastenapp.</span>'}
        ${s.members.filter((m) => m.test && m.id !== guest?.id).map((m) => `<button class="btn btn-line btn-sm" data-act="scan-sim" data-id="${m.id}">Testlid ${esc(m.firstName)}</button>`).join('')}
        <button class="btn btn-line btn-sm" data-act="scan-expired">Verlopen code proberen</button>
      </div></div>`;
  return `${head('Scannen', `Spaarregel: ${L.mode === 'visit' ? `${L.perVisit} punten per bezoek` : L.mode === 'euro' ? `${L.perEuro} punt per euro` : `${L.perVisit} per bezoek + ${L.perEuro} per euro`}, maximaal ${L.maxPerTx} per keer, wachttijd ${L.cooldownHours} uur${example(L.isExample)}`)}${body}`;
}

function scanResult(L) {
  const r = scan.result;
  const m = r.member;
  const bal = S.balance(m.id);
  const avail = S.get().rewards.filter((x) => x.active && x.cost <= bal);
  const needsAmount = L.mode !== 'visit';
  if (r.booked)
    return `<div class="panel on-vino scan-result" role="status">
      <div class="who"><span class="label" style="color:var(--oro)">${r.booked.duplicate ? 'Al geboekt' : 'Geboekt'}</span><b>${esc(m.firstName)} ${esc(m.lastName ?? '')}</b><span class="small muted">${esc(m.memberNo)}</span></div>
      <div><span class="big">${r.booked.points > 0 ? '+' : ''}${r.booked.points}</span> <span>punten</span></div>
      <p>Nieuw saldo: <strong class="num">${bal}</strong>${r.booked.capped ? '. Afgetopt op het maximum per keer.' : ''}${r.booked.duplicate ? '. Deze scan was al verwerkt; er is niets dubbel geboekt.' : ''}</p>
      ${avail.length ? `<div class="reward-pick"><span class="small" style="color:var(--oro)">Ook inwisselen?</span>${avail.map((x) => `<button data-act="redeem" data-id="${x.id}"><span>${esc(x.name)}</span><span class="num">${x.cost} p.</span></button>`).join('')}</div>` : ''}
      <button class="btn btn-line" data-act="scan-next">Volgende gast</button>
    </div>`;
  const cooldown = r.error?.code === 'wachttijd';
  return `<div class="panel scan-result">
    <div class="who"><span class="label muted">Lid gevonden${r.manual ? ', via lidnummer' : ''}</span><b>${esc(m.firstName)} ${esc(m.lastName ?? '')}</b><span class="small muted">${esc(m.memberNo)}, saldo <span class="num">${bal}</span> punten</span></div>
    ${r.manual ? `<div class="msg" data-tone="warn">${icon('alert')}<span>Geboekt op lidnummer in plaats van QR-code. Controleer de naam bij de gast; dit wordt in het dagoverzicht gemarkeerd.</span></div>` : ''}
    ${r.error ? `<div class="msg" data-tone="err" role="alert">${icon('alert')}<span>${esc(r.error.message)}</span></div>` : ''}
    <form data-form="award" class="form-grid">
      ${needsAmount ? `<label class="field" style="max-width:240px"><span>Bedrag van de rekening</span><input class="input" name="amount" inputmode="decimal" required value="${esc(scan.amount)}" placeholder="0,00"></label>` : ''}
      ${cooldown && r.error.canOverride ? `<label class="field"><span>Reden om de wachttijd over te slaan</span><input class="input" name="override" required minlength="5" value="${esc(scan.override)}" placeholder="Bijvoorbeeld: lunch en diner op dezelfde dag"></label>` : ''}
      ${cooldown && !r.error.canOverride ? lock('Vraag de bedrijfsleider of eigenaar om de wachttijd over te slaan.') : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${!cooldown || r.error.canOverride ? `<button class="btn btn-vino" type="submit">${cooldown ? 'Toch boeken' : `Bezoek boeken${L.mode === 'visit' ? ` (+${Math.min(L.perVisit, L.maxPerTx)})` : ''}`}</button>` : ''}
        <button class="btn btn-line" type="button" data-act="scan-next">Annuleren</button>
      </div>
    </form>
    ${S.can('redeem') && avail.length ? `<div><h2 style="font-family:var(--font-body);font-size:1rem;font-weight:500;margin-bottom:8px">Beloning inwisselen</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${avail.map((x) => `<button class="btn btn-line btn-sm" data-act="redeem" data-id="${x.id}">${esc(x.name)} (${x.cost})</button>`).join('')}</div></div>` : ''}
  </div>`;
}

function handleToken(token) {
  stopCamera();
  const v = S.lookup(token);
  scan.token = '';
  if (!v.ok) {
    scan.stage = 'start';
    scan.error = v.message;
    return render();
  }
  scan.error = '';
  scan.stage = 'result';
  scan.result = { member: v.member, token, manual: v.manual };
  scan.key = uid('scan');
  scan.amount = '';
  scan.override = '';
  render();
}

async function startCamera() {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
    scan.error = 'Deze browser kan geen QR-codes lezen met de camera. Typ het lidnummer of gebruik Chrome op Android.';
    return render();
  }
  try {
    scan.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch {
    scan.error = 'Geen toegang tot de camera. Sta de camera toe in de browser of typ het lidnummer.';
    return render();
  }
  scan.stage = 'camera';
  render();
  const video = main.querySelector('[data-video]');
  video.srcObject = scan.stream;
  await video.play();
  const det = new window.BarcodeDetector({ formats: ['qr_code'] });
  const tick = async () => {
    if (scan.stage !== 'camera') return;
    try {
      const codes = await det.detect(video);
      if (codes[0]?.rawValue) return handleToken(codes[0].rawValue);
    } catch {
      // volgende frame opnieuw
    }
    setTimeout(tick, 250);
  };
  tick();
}
function stopCamera() {
  scan.stream?.getTracks().forEach((t) => t.stop());
  scan.stream = null;
  if (scan.stage === 'camera') scan.stage = 'start';
}

// ---------- Reserveringen ----------
let resTab = 'aanvragen';
function vReserveringen() {
  const s = S.get();
  const t = todayIso();
  const lists = {
    aanvragen: s.reservations.filter((r) => r.status === 'aangevraagd'),
    vandaag: s.reservations.filter((r) => r.date === t),
    komend: s.reservations.filter((r) => r.date >= t && ['bevestigd', 'voorstel'].includes(r.status)),
    alles: s.reservations,
  };
  const list = lists[resTab].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const tabs = [['aanvragen', `Aanvragen (${lists.aanvragen.length})`], ['vandaag', 'Vandaag'], ['komend', 'Komend'], ['alles', 'Alles']];
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i)).filter((d) => slotsFor(d).length || s.blockedDates.includes(d));
  return `${head('Reserveringen', 'Website, app en telefoon op één lijst.', `<button class="btn btn-dark" data-act="res-phone">${icon('phone')}Telefonische reservering</button>`)}
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${resTab === k}" data-act="res-tab" data-id="${k}">${l}</button>`).join('')}</div>
    ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Gast</th><th class="n">Pers.</th><th>Wensen</th><th>Bron</th><th>Status</th><th class="n">Actie</th></tr></thead><tbody>
      ${list.map((r) => `<tr><td class="num" style="white-space:nowrap">${esc(shortDate(r.date))}<br><strong>${esc(r.proposedTime || r.time)}</strong></td><td>${esc(r.name)}${r.test ? ' <span class="badge-example">Test</span>' : ''}<br><span class="xs muted">${esc(r.phone)}${r.memberId ? `, lid ${esc(S.member(r.memberId)?.memberNo ?? '')}` : ''}</span></td><td class="n">${r.guests}</td><td class="small">${esc([...r.wishes, r.notes].filter(Boolean).join('. '))}</td><td class="small">${esc(r.source)}</td><td class="small">${statusLabel[r.status]}</td>
        <td><div class="actions">${r.status === 'aangevraagd' ? `<button class="btn btn-ok btn-sm" data-act="res-ok" data-id="${r.id}">Bevestigen</button><button class="btn btn-line btn-sm" data-act="res-alt" data-id="${r.id}">Ander tijdstip</button><button class="btn btn-line btn-sm" data-act="res-no" data-id="${r.id}">Weigeren</button>` : ''}</div></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="panel"><p class="muted">Geen reserveringen in deze lijst.</p></div>'}
    <section class="panel" style="margin-top:16px"><h2>Online reserveren per dag</h2><p class="small muted" style="margin-bottom:10px">Blokkeer een dag, bijvoorbeeld bij afhuren. Gasten kunnen dan alleen nog bellen.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${days.map((d) => `<button class="chip" aria-pressed="${s.blockedDates.includes(d)}" data-act="block" data-id="${d}" style="min-height:40px;padding:0 12px;border:1px solid var(--line);background:${s.blockedDates.includes(d) ? 'var(--espresso)' : 'transparent'};color:${s.blockedDates.includes(d) ? 'var(--crema)' : 'inherit'}">${esc(shortDate(d))}${s.blockedDates.includes(d) ? ', geblokkeerd' : ''}</button>`).join('')}</div></section>`;
}

// ---------- Leden ----------
let memberQ = '';
function vLeden(id) {
  const s = S.get();
  const full = S.can('members_full');
  if (id) {
    const m = S.member(id);
    if (!m) return `${head('Lid niet gevonden')}<a class="link" href="#/leden">Terug</a>`;
    const tx = S.history(m.id);
    return `${head(`${esc(m.firstName)} ${esc(m.lastName ?? '')}`, `${esc(m.memberNo)}, lid sinds ${esc(stamp(m.joinedAt))}${m.test ? ' <span class="badge-example">Testlid</span>' : ''}`, `<a class="btn btn-line" href="#/leden">Alle leden</a>`)}
      <div class="grid-2">
        <section class="panel"><h2>Gegevens</h2>${full ? `<dl class="summary" style="display:grid;grid-template-columns:auto 1fr;gap:6px 18px;margin:0"><dt class="muted">E-mail</dt><dd style="margin:0">${esc(m.email)}</dd><dt class="muted">Telefoon</dt><dd style="margin:0">${esc(m.phone || '-')}</dd><dt class="muted">Verjaardag</dt><dd style="margin:0">${m.birthday ? `${m.birthday.d}-${m.birthday.m}` : '-'}</dd><dt class="muted">E-mailmarketing</dt><dd style="margin:0">${m.consents?.email_marketing ? 'Ja' : 'Nee'}</dd><dt class="muted">Pushmarketing</dt><dd style="margin:0">${m.consents?.push_marketing ? 'Ja' : 'Nee'}</dd></dl>` : lock('Uw rol ziet alleen naam en saldo.')}</section>
        <section class="panel"><h2>Saldo</h2><p style="font-family:var(--font-display);font-size:3rem;line-height:1" class="num">${S.balance(m.id)}</p>
          ${S.can('adjust') ? `<form data-form="adjust" data-id="${m.id}" class="form-grid" style="margin-top:12px"><div style="display:grid;grid-template-columns:120px 1fr;gap:8px"><label class="field"><span>Punten</span><input class="input input-sm" name="points" inputmode="numeric" placeholder="+10 of -10" required></label><label class="field"><span>Reden</span><input class="input input-sm" name="reason" required minlength="5" placeholder="Waarom deze correctie?"></label></div><button class="btn btn-dark btn-sm" type="submit" style="justify-self:start">Correctie boeken</button></form>` : lock('Alleen een bedrijfsleider of de eigenaar kan punten corrigeren.')}</section>
      </div>
      <section style="margin-top:16px"><h2 style="font-family:var(--font-body);font-size:1rem;font-weight:500;margin-bottom:8px">Puntenregister</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Wanneer</th><th>Omschrijving</th><th>Door</th><th class="n">Punten</th></tr></thead><tbody>${tx.map((t) => `<tr><td class="small" style="white-space:nowrap">${esc(stamp(t.at))}</td><td>${esc(t.desc)}${t.manual ? ' <span class="badge-example">Lidnummer</span>' : ''}</td><td class="small">${esc(t.staffId ? S.staffName(t.staffId) : 'systeem')}</td><td class="n">${t.points > 0 ? '+' : ''}${t.points}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Nog geen mutaties.</td></tr>'}</tbody></table></div>
      <p class="xs muted" style="margin-top:8px">Mutaties kunnen niet worden gewijzigd of verwijderd. Een fout herstelt u met een correctie.</p></section>`;
  }
  const q = memberQ.toLowerCase();
  const list = s.members.filter((m) => !m.deletedAt && (!q || `${m.firstName} ${m.lastName} ${m.memberNo} ${full ? m.email : ''}`.toLowerCase().includes(q)));
  return `${head('Leden', `${s.members.filter((m) => !m.deletedAt).length} leden`)}
    <label class="field" style="max-width:360px;margin-bottom:12px"><span class="sr-only">Zoek een lid</span><input class="input" type="search" data-input="member-q" placeholder="Zoek op naam of lidnummer" value="${esc(memberQ)}"></label>
    <div class="tbl-wrap" id="member-table"><table class="tbl"><thead><tr><th>Lid</th><th>Nummer</th>${full ? '<th>E-mail</th>' : ''}<th class="n">Saldo</th><th>Laatste bezoek</th></tr></thead><tbody>
      ${list.map((m) => {
        const last = S.history(m.id).find((t) => t.kind === 'bezoek');
        return `<tr><td><a class="link" href="#/leden/${m.id}">${esc(m.firstName)} ${esc(m.lastName ?? '')}</a>${m.test ? ' <span class="badge-example">Test</span>' : ''}</td><td class="num">${esc(m.memberNo)}</td>${full ? `<td class="small">${esc(m.email)}</td>` : ''}<td class="n">${S.balance(m.id)}</td><td class="small">${last ? esc(stamp(last.at)) : '-'}</td></tr>`;
      }).join('') || '<tr><td colspan="5" class="muted">Geen leden gevonden.</td></tr>'}
    </tbody></table></div>`;
}

// ---------- Spaarsysteem ----------
function vSpaarsysteem() {
  const s = S.get();
  const L = s.loyalty;
  const edit = S.can('loyalty');
  const dis = edit ? '' : 'disabled';
  return `${head('Spaarsysteem', `Versie ${L.version}, gewijzigd ${esc(stamp(L.updatedAt))}${example(L.isExample)}`)}
    ${edit ? '' : lock('Alleen de eigenaar kan spaarregels en beloningen wijzigen. U kunt ze wel bekijken.')}
    ${L.isExample ? `<div class="todo" style="margin-block:12px"><span class="todo-label">${icon('pencil')}In te vullen door La Caleta</span><strong>Dit zijn voorbeeldwaarden</strong><span class="small muted">Na opslaan zijn het uw regels. Ze gelden vanaf dat moment; eerdere punten veranderen niet.</span></div>` : ''}
    <form class="panel form-grid" data-form="loyalty" style="margin-top:12px"><h2>Punten sparen</h2>
      <fieldset class="fieldset" ${dis} style="border:0;padding:0;margin:0;display:grid;gap:6px"><legend class="small" style="font-weight:500;margin-bottom:4px">Manier van sparen</legend>
        ${[['visit', 'Per bezoek'], ['euro', 'Per euro van de rekening'], ['both', 'Beide']].map(([v, l]) => `<label class="check"><input type="radio" name="mode" value="${v}" ${L.mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </fieldset>
      <div class="form-grid cols">
        <label class="field"><span>Punten per bezoek</span><input class="input input-sm" name="perVisit" type="number" min="0" value="${L.perVisit}" ${dis}></label>
        <label class="field"><span>Punten per euro</span><input class="input input-sm" name="perEuro" type="number" min="0" step="0.5" value="${L.perEuro}" ${dis}></label>
        <label class="field"><span>Minimale besteding (euro)</span><input class="input input-sm" name="minSpend" type="number" min="0" value="${L.minSpendCents / 100}" ${dis}></label>
        <label class="field"><span>Wachttijd tussen bezoeken (uur)</span><input class="input input-sm" name="cooldownHours" type="number" min="0" value="${L.cooldownHours}" ${dis}></label>
        <label class="field"><span>Maximum punten per keer</span><input class="input input-sm" name="maxPerTx" type="number" min="1" value="${L.maxPerTx}" ${dis}></label>
        <label class="field"><span>Welkomstpunten</span><input class="input input-sm" name="welcome" type="number" min="0" value="${L.welcome}" ${dis}></label>
        <label class="field"><span>Punten vervallen na (maanden zonder bezoek)</span><input class="input input-sm" name="expiryMonths" type="number" min="0" placeholder="Nooit" value="${L.expiryMonths ?? ''}" ${dis}></label>
      </div>
      <label class="field"><span>Clubvoorwaarden</span><textarea class="input" name="terms" rows="4" ${dis}>${esc(L.terms)}</textarea></label>
      ${edit ? '<button class="btn btn-dark" type="submit" style="justify-self:start">Regels opslaan</button>' : ''}
    </form>
    <section class="panel"><h2>Beloningen</h2>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Beloning</th><th class="n">Punten</th><th>Actief</th><th class="n"></th></tr></thead><tbody>
        ${s.rewards.map((r) => `<tr><td>${esc(r.name)}${example(r.isExample)}<br><span class="xs muted">${esc(r.description)}</span></td><td class="n">${r.cost}</td><td>${r.active ? 'Ja' : 'Nee'}</td><td><div class="actions">${edit ? `<button class="btn btn-line btn-sm" data-act="reward-edit" data-id="${r.id}">Wijzigen</button>` : ''}</div></td></tr>`).join('')}
      </tbody></table></div>
      ${edit ? `<button class="btn btn-line btn-sm" data-act="reward-edit" style="margin-top:12px">${icon('plus')}Beloning toevoegen</button>` : ''}
    </section>
    <section class="panel"><h2>Verjaardagscadeau${example(s.birthday.isExample)}</h2><p>${esc(s.birthday.description)}, ${s.birthday.validDays} dagen geldig vanaf de verjaardag.</p><p class="xs muted" style="margin-top:6px">Eén keer per jaar per lid. Leden vullen alleen dag en maand in.</p></section>`;
}

function rewardForm(id) {
  const r = S.get().rewards.find((x) => x.id === id) ?? { name: '', description: '', cost: 100, active: true, membersOnly: true };
  openDialog(id ? 'Beloning wijzigen' : 'Beloning toevoegen', `<form data-form="reward" data-id="${id ?? ''}" class="form-grid">
    <label class="field"><span>Naam</span><input class="input" name="name" required value="${esc(r.name)}"></label>
    <label class="field"><span>Omschrijving</span><input class="input" name="description" value="${esc(r.description)}"></label>
    <label class="field" style="max-width:180px"><span>Punten</span><input class="input" name="cost" type="number" min="1" required value="${r.cost}"></label>
    <label class="check"><input type="checkbox" name="active" ${r.active ? 'checked' : ''}><span>Actief</span></label>
    <button class="btn btn-dark" type="submit" style="justify-self:start">Opslaan</button></form>`);
}

// ---------- Menukaart ----------
let menuCat = null;
function vMenukaart() {
  const s = S.get();
  const cats = [...s.categories].sort((a, b) => a.sort - b.sort);
  menuCat ??= cats[0].id;
  const c = cats.find((x) => x.id === menuCat);
  const dishes = s.dishes.filter((d) => d.cat === menuCat);
  return `${head('Menukaart', `${s.dishes.length} gerechten in ${cats.length} categorieën, overgenomen van de website`)}
    <div class="grid-2" style="grid-template-columns:minmax(0,280px) 1fr;align-items:start">
      <section class="panel"><h2>Categorieën</h2><ul style="list-style:none;margin:0;padding:0">${cats.map((x, i) => `<li style="display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--hair)"><button class="btn btn-sm" style="flex:1;justify-content:flex-start;padding-inline:6px;${x.id === menuCat ? 'font-weight:600;color:var(--terracota)' : ''}${x.visible ? '' : ';opacity:.6'}" data-act="cat-pick" data-id="${x.id}" aria-pressed="${x.id === menuCat}">${esc(x.name)}${x.visible ? '' : ' (verborgen)'}</button><button class="icon-btn" style="width:36px;height:36px" data-act="cat-up" data-id="${x.id}" aria-label="${esc(x.name)} omhoog" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button><button class="icon-btn" style="width:36px;height:36px" data-act="cat-down" data-id="${x.id}" aria-label="${esc(x.name)} omlaag" ${i === cats.length - 1 ? 'disabled' : ''}>${icon('down')}</button></li>`).join('')}</ul></section>
      <section>
        <form class="panel form-grid" data-form="cat" data-id="${c.id}"><h2>Categorie</h2><div class="form-grid cols"><label class="field"><span>Naam</span><input class="input input-sm" name="name" value="${esc(c.name)}"></label><label class="check" style="align-self:end"><input type="checkbox" name="visible" ${c.visible ? 'checked' : ''}><span>Zichtbaar voor gasten</span></label></div><label class="field"><span>Notitie onder de kop</span><textarea class="input" name="note" rows="2">${esc(c.note)}</textarea></label><button class="btn btn-dark btn-sm" type="submit" style="justify-self:start">Opslaan</button></form>
        <div class="tbl-wrap" style="margin-top:16px"><table class="tbl"><thead><tr><th>Gerecht</th><th class="n">Prijs</th><th>Kenmerken</th><th>Allergenen</th><th class="n"></th></tr></thead><tbody>
          ${dishes.map((d) => `<tr><td><strong style="font-weight:500">${esc(d.name)}</strong>${d.isNew ? ' <span class="badge-example" style="color:var(--vino)">Nieuw</span>' : ''}${d.soldOut ? ' <span class="badge-example" style="color:var(--err)">Uitverkocht</span>' : ''}<br><span class="xs muted">${esc(d.description)}</span></td><td class="n">${esc(d.price || '-')}</td><td class="small">${d.tags.map((t) => TAG[t]).join(', ')}</td><td class="small">${d.allergens === null ? '<span style="color:var(--terracota)">Nog invullen</span>' : d.allergens.length ? esc(d.allergens.join(', ')) : 'Geen'}</td><td><div class="actions"><button class="btn btn-line btn-sm" data-act="dish-edit" data-id="${d.id}">Wijzigen</button></div></td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </div>`;
}

function dishForm(id) {
  const d = S.get().dishes.find((x) => x.id === id);
  openDialog('Gerecht wijzigen', `<form data-form="dish" data-id="${d.id}" class="form-grid">
    <label class="field"><span>Naam</span><input class="input" name="name" required value="${esc(d.name)}"></label>
    <label class="field"><span>Omschrijving</span><textarea class="input" name="description" rows="2">${esc(d.description)}</textarea></label>
    <label class="field" style="max-width:240px"><span>Prijs zoals op de kaart</span><input class="input" name="price" value="${esc(d.price)}"></label>
    <fieldset class="fieldset" style="border:0;padding:0;margin:0"><legend class="small" style="font-weight:500">Kenmerken</legend><div class="checks">${Object.entries(TAG).map(([k, v]) => `<label class="check"><input type="checkbox" name="tag" value="${k}" ${d.tags.includes(k) ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div></fieldset>
    <fieldset class="fieldset" style="border:0;padding:0;margin:0"><legend class="small" style="font-weight:500">Allergenen (14 EU-allergenen)</legend>
      <label class="check"><input type="checkbox" name="unknown" ${d.allergens === null ? 'checked' : ''}><span>Nog niet opgegeven door de keuken</span></label>
      <div class="checks">${ALLERGENS.map((a) => `<label class="check"><input type="checkbox" name="allergen" value="${a}" ${d.allergens?.includes(a) ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div></fieldset>
    <label class="check"><input type="checkbox" name="isNew" ${d.isNew ? 'checked' : ''}><span>Nieuw op de kaart (verschijnt op Home)</span></label>
    <label class="check"><input type="checkbox" name="soldOut" ${d.soldOut ? 'checked' : ''}><span>Tijdelijk uitverkocht</span></label>
    <div class="todo"><span class="todo-label">${icon('image')}Foto</span><span class="small muted">In de echte app uploadt u hier een foto van het gerecht. Die wordt verkleind en bijgesneden.</span></div>
    <button class="btn btn-dark" type="submit" style="justify-self:start">Opslaan</button></form>`);
}

// ---------- Experiencias ----------
function vExperiencias() {
  const s = S.get();
  return `${head('Experiencias', 'Evenementen die gasten in de app zien en waarvoor ze zich aanmelden.', `<button class="btn btn-dark" data-act="ev-edit">${icon('plus')}Nieuwe experiencia</button>`)}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Experiencia</th><th>Datum</th><th class="n">Aanmeldingen</th><th>Voor</th><th class="n"></th></tr></thead><tbody>
      ${s.events.sort((a, b) => a.date.localeCompare(b.date)).map((e) => `<tr><td>${esc(e.title)}${example(e.isExample)}</td><td class="small" style="white-space:nowrap">${esc(shortDate(e.date))} ${esc(e.time)}</td><td class="n">${e.signups.reduce((n, x) => n + x.guests, 0)}${e.capacity ? ` / ${e.capacity}` : ''}</td><td class="small">${e.membersOnly ? 'Leden' : 'Iedereen'}</td><td><div class="actions"><button class="btn btn-line btn-sm" data-act="ev-edit" data-id="${e.id}">Wijzigen</button></div></td></tr>`).join('')}
    </tbody></table></div>`;
}
function eventForm(id) {
  const e = S.get().events.find((x) => x.id === id) ?? { title: '', body: '', date: addDays(todayIso(), 14), time: '19:00', priceCents: null, capacity: 24, membersOnly: false, image: 'kaarsen' };
  openDialog(id ? 'Experiencia wijzigen' : 'Nieuwe experiencia', `<form data-form="event" data-id="${id ?? ''}" class="form-grid">
    <label class="field"><span>Titel</span><input class="input" name="title" required value="${esc(e.title)}"></label>
    <label class="field"><span>Omschrijving</span><textarea class="input" name="body" rows="3">${esc(e.body)}</textarea></label>
    <div class="form-grid cols"><label class="field"><span>Datum</span><input class="input" type="date" name="date" required value="${e.date}" min="${todayIso()}"></label><label class="field"><span>Tijd</span><input class="input" type="time" name="time" value="${e.time}"></label>
    <label class="field"><span>Prijs p.p. (leeg = nog niet bekend)</span><input class="input" name="price" inputmode="decimal" value="${e.priceCents != null ? (e.priceCents / 100).toFixed(2).replace('.', ',') : ''}"></label><label class="field"><span>Plaatsen (leeg = onbeperkt)</span><input class="input" type="number" min="1" name="capacity" value="${e.capacity ?? ''}"></label></div>
    <label class="field"><span>Foto</span><select class="input" name="image">${IMAGES.map((i) => `<option ${i === e.image ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" name="membersOnly" ${e.membersOnly ? 'checked' : ''}><span>Alleen voor Clubleden</span></label>
    <button class="btn btn-dark" type="submit" style="justify-self:start">Publiceren</button></form>`);
}

// ---------- Acties ----------
function vActies() {
  const s = S.get();
  return `${head('Acties', 'Aanbiedingen op Home. Ledenaanbiedingen zien alleen leden volledig.', `<button class="btn btn-dark" data-act="offer-new">${icon('plus')}Nieuwe actie</button>`)}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Actie</th><th>Voor</th><th>Zichtbaar</th></tr></thead><tbody>
      ${s.offers.map((o) => `<tr><td><strong style="font-weight:500">${esc(o.title)}</strong><br><span class="xs muted">${esc(o.body)}</span></td><td class="small">${o.membersOnly ? 'Alleen leden' : 'Iedereen'}</td><td><label class="check" style="min-height:auto"><input type="checkbox" data-act="offer-toggle" data-id="${o.id}" ${o.published ? 'checked' : ''}><span class="sr-only">Zichtbaar</span></label></td></tr>`).join('')}
    </tbody></table></div>`;
}

// ---------- Meldingen ----------
let notifyKind = 'marketing';
function vMeldingen() {
  const s = S.get();
  const count = S.audience(notifyKind).length;
  return `${head('Meldingen', 'Alleen naar leden die toestemming gaven. Reserveringsberichten gaan automatisch.')}
    <form class="panel form-grid" data-form="notify"><h2>Nieuwe melding</h2>
      <label class="field"><span>Titel</span><input class="input" name="title" required maxlength="60"></label>
      <label class="field"><span>Bericht</span><textarea class="input" name="body" required maxlength="200" rows="3"></textarea></label>
      <label class="field" style="max-width:420px"><span>Doelgroep</span><select class="input" name="kind" data-input="notify-kind"><option value="marketing" ${notifyKind === 'marketing' ? 'selected' : ''}>Alle leden met toestemming</option><option value="inactief" ${notifyKind === 'inactief' ? 'selected' : ''}>Met toestemming, 60 dagen niet geweest</option></select></label>
      <p class="small" aria-live="polite">Deze melding gaat naar <strong data-aud>${count}</strong> ${count === 1 ? 'lid' : 'leden'}.</p>
      <button class="btn btn-dark" type="submit" style="justify-self:start">${icon('bell')}Versturen</button>
    </form>
    <section class="panel"><h2>Verstuurd</h2>${s.notifications.length ? `<table class="tbl"><tbody>${s.notifications.map((n) => `<tr><td class="small" style="white-space:nowrap">${esc(stamp(n.at))}</td><td><strong style="font-weight:500">${esc(n.title)}</strong><br><span class="small muted">${esc(n.body)}</span></td><td class="n">${n.to.length} leden</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nog niets verstuurd.</p>'}</section>`;
}

// ---------- Cadeaubonnen ----------
function vCadeaubonnen() {
  const s = S.get();
  return `${head('Cadeaubonnen', 'Aanvragen uit de app. Online betalen volgt na de keuze van een betaalprovider.')}
    <div class="todo" style="margin-bottom:16px"><span class="todo-label">${icon('pencil')}In te vullen door La Caleta</span><strong>Bedragen, geldigheid en betalen</strong><span class="small muted">Nu: ${s.giftcard.amounts.map(euro).join(', ')} of vrij bedrag (voorbeeld). Kies de betaalprovider (voorstel: Mollie met iDEAL) en de voorwaarden; dan krijgt elke bon een unieke code die u hier inwisselt.</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Wanneer</th><th>Bedrag</th><th>Voor</th><th>Contact</th><th>Status</th></tr></thead><tbody>
      ${s.giftRequests.length ? s.giftRequests.map((g) => `<tr><td class="small">${esc(stamp(g.at))}</td><td class="num">${euro(g.amountCents)}</td><td>${esc(g.to || '-')}<br><span class="xs muted">${esc(g.message)}</span></td><td class="small">${esc(g.email)}</td><td class="small">Aangevraagd, nog afrekenen</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Nog geen aanvragen.</td></tr>'}
    </tbody></table></div>`;
}

// ---------- Rechten ----------
function vRechten() {
  const s = S.get();
  const roles = Object.keys(S.ROLES);
  return `${head('Medewerkers en rechten', 'Medewerkers zien alleen de onderdelen waarvoor ze een recht hebben.', `<button class="btn btn-dark" data-act="invite">${icon('plus')}Medewerker uitnodigen</button>`)}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Medewerker</th><th>Rol</th><th>E-mail</th></tr></thead><tbody>${s.staff.map((m) => `<tr><td>${esc(m.name)}</td><td>${S.ROLES[m.role]}</td><td class="small">${esc(m.email)}</td></tr>`).join('')}</tbody></table></div>
    <section style="margin-top:16px"><h2 style="font-family:var(--font-body);font-size:1rem;font-weight:500;margin-bottom:8px">Rechten per rol</h2><div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>Recht</th>${roles.map((r) => `<th>${S.ROLES[r]}</th>`).join('')}</tr></thead><tbody>
      ${Object.entries(S.PERMISSIONS).map(([k, l]) => `<tr><td>${esc(l)}</td>${roles.map((r) => `<td><input type="checkbox" aria-label="${esc(l)} voor ${S.ROLES[r]}" data-act="perm" data-role="${r}" data-id="${k}" ${s.matrix[r].includes(k) ? 'checked' : ''} ${r === 'eigenaar' ? 'disabled' : ''}></td>`).join('')}</tr>`).join('')}
    </tbody></table></div><p class="xs muted" style="margin-top:8px">In de echte app logt elke medewerker in met tweestapsverificatie. De eigenaar houdt altijd alle rechten.</p></section>`;
}

// ---------- Audit ----------
let auditQ = '';
function vAudit() {
  const q = auditQ.toLowerCase();
  const list = S.get().audit.filter((a) => !q || `${a.actor} ${a.action}`.toLowerCase().includes(q));
  return `${head('Auditlog', 'Wie deed wat en wanneer. Kan niet worden gewijzigd.')}
    <label class="field" style="max-width:360px;margin-bottom:12px"><span class="sr-only">Filter</span><input class="input" type="search" data-input="audit-q" placeholder="Filter op naam of actie" value="${esc(auditQ)}"></label>
    <div class="tbl-wrap" id="audit-table"><table class="tbl"><thead><tr><th>Wanneer</th><th>Wie</th><th>Actie</th></tr></thead><tbody>${list.map((a) => `<tr><td class="small" style="white-space:nowrap">${esc(stamp(a.at))}</td><td class="small">${esc(a.actor)}</td><td>${esc(a.action)}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- Router en navigatie ----------
function rolKeuzes() {
  const s = S.get();
  const totaal = Object.keys(S.PERMISSIONS).length;
  return s.staff.map((st) => {
    const n = s.matrix[st.role].length;
    const rechten = n === totaal ? 'Alle onderdelen' : `${n} van ${totaal} rechten`;
    return `<button class="btn btn-dark btn-block" type="button" data-act="demo-staff" data-id="${st.id}" style="flex-direction:column;align-items:flex-start;gap:2px;text-align:left"><strong style="font-weight:500">Verder als ${esc(S.ROLES[st.role].toLowerCase())}</strong><span class="small" style="opacity:.85">${rechten}</span></button>`;
  }).join('');
}

function vLogin(error = '') {
  return `<div class="b-login">
    <div class="b-login-brand"><span class="script">La Caleta</span><span class="label">Beheer</span></div>
    <section class="panel form-grid" data-section="rol-kiezen">
      <h1 style="font-size:2rem">Kies hoe u het beheer bekijkt</h1>
      <p class="small muted">Dit is de demo: u hoeft niet in te loggen. Elke rol ziet alleen de onderdelen waar die recht op heeft.</p>
      ${error ? `<div class="msg" data-tone="err" role="alert">${icon('alert')}<span>${esc(error)}</span></div>` : ''}
      ${rolKeuzes()}
    </section>
    <p class="small"><a class="link" href="gast.html">Terug naar de app voor gasten</a></p>
  </div>`;
}

function renderNav() {
  const [sec] = route();
  const open = S.get().reservations.filter((r) => r.status === 'aangevraagd').length;
  navEl.innerHTML = SECTIONS.filter((x) => allowed(x[0])).map(([id, label, ic]) => `<a href="#/${id}" class="${id === 'scannen' ? 'b-scan' : ''}" ${sec === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${id === 'reserveringen' && open ? `<span class="count" aria-label="${open} open">${open}</span>` : ''}</a>`).join('');
  const st = S.staff();
  document.getElementById('b-who').innerHTML = `<span>U bekijkt het als</span><strong>${esc(st.name)}</strong><span>${S.ROLES[st.role]}</span>
    <button class="b-who-btn" data-act="logout">${icon('logout')}Andere rol kiezen</button>
    <a class="b-who-btn" href="gast.html">${icon('phoneapp')}Naar de gastenapp</a>
    ${st.role === 'eigenaar' ? `<button class="b-who-btn" data-act="reset">${icon('refresh')}Testgegevens terugzetten</button>` : ''}`;
}

let loginError = '';
function render({ fromRoute = false } = {}) {
  const [sec, id] = route();
  if (!S.staff()) {
    stopCamera();
    document.body.classList.add('logged-out');
    navEl.innerHTML = '';
    document.getElementById('b-who').innerHTML = '';
    main.innerHTML = vLogin(loginError);
    document.title = 'Rol kiezen, La Caleta beheer';
    main.querySelector('[data-act="demo-staff"]')?.focus();
    return;
  }
  document.body.classList.remove('logged-out');
  renderNav();
  if (!allowed(sec)) {
    main.innerHTML = `${head('Geen toegang')}${lock('Uw rol heeft geen recht op dit onderdeel. Vraag de eigenaar om het recht te geven.')}`;
  } else {
    const views = { vandaag: vVandaag, scannen: vScannen, reserveringen: vReserveringen, leden: () => vLeden(id), spaarsysteem: vSpaarsysteem, menukaart: vMenukaart, experiencias: vExperiencias, acties: vActies, meldingen: vMeldingen, cadeaubonnen: vCadeaubonnen, rechten: vRechten, audit: vAudit };
    main.innerHTML = (views[sec] ?? vVandaag)();
  }
  document.title = `${SECTIONS.find((x) => x[0] === sec)?.[1] ?? 'Beheer'}, La Caleta beheer`;
  if (fromRoute) {
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => {
  if (route()[0] !== 'scannen') stopCamera();
  render({ fromRoute: true });
});
S.subscribe((ch) => {
  if (ch.remote && ch.reservation) {
    const r = S.get().reservations.find((x) => x.id === ch.reservation);
    if (r?.status === 'aangevraagd') toast(`Nieuwe aanvraag: ${r.name}, ${shortDate(r.date)} ${r.time}, ${r.guests} pers.`);
  }
  if (!S.staff()) return render();
  if (dlg.open || scan.stage === 'camera') return renderNav();
  const active = document.activeElement;
  if (active?.matches?.('input[type="search"], input:not([type]), textarea') && main.contains(active)) return renderNav();
  render();
});


document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const id = t.dataset.id;
  const res = (r, ok) => {
    toast(r.ok ? ok : r.message, r.ok ? 'ok' : 'err');
    return r;
  };
  switch (t.dataset.act) {
    case 'demo-staff': {
      const r = S.demoStaffLogIn(id);
      loginError = r.ok ? '' : r.message;
      if (r.ok) toast(`U bekijkt het beheer als ${S.ROLES[r.staff.role].toLowerCase()}.`);
      return render({ fromRoute: true });
    }
    case 'logout':
      stopCamera();
      Object.assign(scan, { stage: 'start', result: null, key: null, error: '' });
      S.staffLogOut();
      location.hash = '#/vandaag';
      return;
    case 'reset':
      if (window.confirm('Alle testgegevens wissen en opnieuw beginnen? U wordt daarna uitgelogd.')) {
        S.reset();
        localStorage.removeItem('lc-welkom');
        toast('De testgegevens zijn teruggezet.');
      }
      return;
    case 'scan-camera': return startCamera();
    case 'scan-stop':
      stopCamera();
      return render();
    case 'scan-sim': return handleToken(S.qrToken(id));
    case 'scan-expired': {
      const tok = S.qrToken(S.get().members[0].id).split('.');
      tok[2] = String(Number(tok[2]) - 5);
      return handleToken(tok.join('.'));
    }
    case 'scan-next':
      Object.assign(scan, { stage: 'start', result: null, key: null, error: '' });
      return render();
    case 'redeem': {
      const m = scan.result?.member;
      const rw = S.get().rewards.find((x) => x.id === id);
      if (!m || !window.confirm(`${rw.name} inwisselen voor ${m.firstName}? Er gaan ${rw.cost} punten af.`)) return;
      const r = S.redeem({ memberId: m.id, rewardId: id, key: uid('red') });
      res(r, `${rw.name} ingewisseld. Nieuw saldo ${r.balance}.`);
      return render();
    }
    case 'res-tab':
      resTab = id;
      return render();
    case 'res-ok': return res(S.setReservationStatus(id, 'bevestigd'), 'Bevestigd. De gast krijgt een bericht.');
    case 'res-alt': {
      const r = S.get().reservations.find((x) => x.id === id);
      const slots = slotsFor(r.date).filter((x) => x !== r.time);
      return openDialog('Ander tijdstip voorstellen', `<form data-form="res-alt" data-id="${id}" class="form-grid"><p>${esc(r.name)}, ${esc(longDate(r.date))}, ${r.guests} personen. Gevraagd: ${esc(r.time)}.</p><label class="field" style="max-width:200px"><span>Voorstel</span><select class="input" name="time">${slots.map((x) => `<option>${x}</option>`).join('')}</select></label><label class="field"><span>Bericht aan de gast (optioneel)</span><input class="input" name="message" maxlength="160"></label><button class="btn btn-dark" type="submit" style="justify-self:start">Voorstel versturen</button></form>`);
    }
    case 'res-no':
      return openDialog('Reservering weigeren', `<form data-form="res-no" data-id="${id}" class="form-grid"><label class="field"><span>Bericht aan de gast</span><textarea class="input" name="message" rows="3" required>Helaas zijn we op dit moment vol. Bel ons gerust voor een ander moment: ${esc(SITE.site.phone)}.</textarea></label><button class="btn btn-reserve" type="submit" style="justify-self:start">Weigeren en bericht sturen</button></form>`);
    case 'res-phone': {
      const t0 = todayIso();
      return openDialog('Telefonische reservering', `<form data-form="res-phone" class="form-grid"><div class="form-grid cols"><label class="field"><span>Naam</span><input class="input" name="name" required></label><label class="field"><span>Telefoon</span><input class="input" name="phone" type="tel" required></label><label class="field"><span>Datum</span><input class="input" type="date" name="date" required min="${t0}" value="${t0}"></label><label class="field"><span>Tijd</span><input class="input" type="time" name="time" required step="1800" value="19:00"></label><label class="field"><span>Personen</span><input class="input" type="number" name="guests" min="1" max="40" value="2" required></label></div><label class="field"><span>Notitie</span><input class="input" name="notes"></label><button class="btn btn-dark" type="submit" style="justify-self:start">Opslaan als bevestigd</button></form>`);
    }
    case 'block':
      return S.toggleBlocked(id);
    case 'reward-edit': return rewardForm(id);
    case 'cat-pick':
      menuCat = id;
      return render();
    case 'cat-up': return S.moveCategory(id, -1);
    case 'cat-down': return S.moveCategory(id, 1);
    case 'dish-edit': return dishForm(id);
    case 'ev-edit': return eventForm(id);
    case 'offer-new':
      return openDialog('Nieuwe actie', `<form data-form="offer" class="form-grid"><label class="field"><span>Titel</span><input class="input" name="title" required></label><label class="field"><span>Omschrijving</span><textarea class="input" name="body" rows="3" required></textarea></label><label class="check"><input type="checkbox" name="membersOnly" checked><span>Alleen voor Clubleden</span></label><button class="btn btn-dark" type="submit" style="justify-self:start">Publiceren</button></form>`);
    case 'offer-toggle': {
      const o = S.get().offers.find((x) => x.id === id);
      return res(S.saveOffer({ ...o, published: t.checked }), t.checked ? 'Actie staat in de app.' : 'Actie is verborgen.');
    }
    case 'perm': {
      const r = S.togglePermission(t.dataset.role, id);
      if (!r.ok) {
        t.checked = !t.checked;
        toast(r.message, 'err');
      }
      return;
    }
    case 'invite':
      return openDialog('Medewerker uitnodigen', `<div class="todo"><span class="todo-label">${icon('info')}In de echte app</span><span class="small">De medewerker krijgt een uitnodiging per e-mail, kiest zelf een wachtwoord en stelt tweestapsverificatie in. Er bestaan geen standaardwachtwoorden.</span></div>`);
  }
});

document.addEventListener('input', (e) => {
  const k = e.target.dataset?.input;
  if (k === 'member-q') {
    memberQ = e.target.value;
    const tmp = document.createElement('div');
    tmp.innerHTML = vLeden();
    main.querySelector('#member-table').replaceWith(tmp.querySelector('#member-table'));
  } else if (k === 'audit-q') {
    auditQ = e.target.value;
    const tmp = document.createElement('div');
    tmp.innerHTML = vAudit();
    main.querySelector('#audit-table').replaceWith(tmp.querySelector('#audit-table'));
  } else if (k === 'notify-kind') {
    notifyKind = e.target.value;
    main.querySelector('[data-aud]').textContent = String(S.audience(notifyKind).length);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset?.input === 'notify-kind') e.target.dispatchEvent(new Event('input', { bubbles: true }));
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const fd = new FormData(f);
  const id = f.dataset.id;
  const done = (r, ok) => {
    if (r?.ok === false) return toast(r.message, 'err');
    if (dlg.open) dlg.close();
    toast(ok);
    render();
  };
  const money = (v) => (v === '' || v == null ? null : Math.round(Number(String(v).replace(',', '.')) * 100));
  switch (f.dataset.form) {
    case 'scan-code': {
      const code = String(fd.get('code') ?? '').trim();
      if (!code) {
        scan.error = 'Typ een lidnummer, bijvoorbeeld LC-0101, of plak de code.';
        return render();
      }
      return handleToken(code);
    }
    case 'award': {
      const amountCents = money(fd.get('amount')) ?? 0;
      scan.amount = String(fd.get('amount') ?? '');
      scan.override = String(fd.get('override') ?? '').trim();
      if (scan.result.error?.code === 'wachttijd' && scan.override.length < 5) {
        scan.result.error = { ...scan.result.error, message: 'Geef een reden van minimaal 5 tekens om de wachttijd over te slaan.' };
        return render();
      }
      const token = scan.result.manual ? scan.result.member.memberNo : S.qrToken(scan.result.member.id);
      const r = S.awardVisit({ token, amountCents, key: scan.key, override: scan.override });
      if (r.ok) scan.result.booked = { points: r.tx.points, capped: r.capped, duplicate: r.duplicate };
      else scan.result.error = r;
      return render();
    }
    case 'adjust': {
      const r = S.adjust({ memberId: id, points: Number(String(fd.get('points')).replace('+', '')), reason: String(fd.get('reason') ?? '') });
      return done(r, 'Correctie geboekt en vastgelegd in het auditlog.');
    }
    case 'loyalty': {
      const n = (k) => Number(fd.get(k) || 0);
      return done(S.saveLoyalty({ mode: fd.get('mode'), perVisit: n('perVisit'), perEuro: n('perEuro'), minSpendCents: n('minSpend') * 100, cooldownHours: n('cooldownHours'), maxPerTx: Math.max(1, n('maxPerTx')), welcome: n('welcome'), expiryMonths: fd.get('expiryMonths') ? n('expiryMonths') : null, terms: String(fd.get('terms')) }), 'Spaarregels opgeslagen. Ze gelden vanaf nu.');
    }
    case 'reward':
      return done(S.saveReward({ id: id || undefined, name: String(fd.get('name')).trim(), description: String(fd.get('description')).trim(), cost: Math.max(1, Number(fd.get('cost'))), active: fd.get('active') === 'on', membersOnly: true }), 'Beloning opgeslagen.');
    case 'cat':
      return done(S.saveCategory({ id, name: String(fd.get('name')).trim(), note: String(fd.get('note')).trim(), visible: fd.get('visible') === 'on' }), 'Categorie opgeslagen.');
    case 'dish':
      return done(S.saveDish({ id, name: String(fd.get('name')).trim(), description: String(fd.get('description')).trim(), price: String(fd.get('price')).trim(), tags: fd.getAll('tag'), allergens: fd.get('unknown') === 'on' ? null : fd.getAll('allergen'), isNew: fd.get('isNew') === 'on', soldOut: fd.get('soldOut') === 'on' }), 'Gerecht opgeslagen. Gasten zien het meteen.');
    case 'event':
      return done(S.saveEvent({ id: id || undefined, title: String(fd.get('title')).trim(), body: String(fd.get('body')).trim(), date: String(fd.get('date')), time: String(fd.get('time')), priceCents: money(fd.get('price')), capacity: fd.get('capacity') ? Number(fd.get('capacity')) : null, image: String(fd.get('image')), membersOnly: fd.get('membersOnly') === 'on', published: true }), 'Experiencia gepubliceerd.');
    case 'offer':
      return done(S.saveOffer({ title: String(fd.get('title')).trim(), body: String(fd.get('body')).trim(), membersOnly: fd.get('membersOnly') === 'on' }), 'Actie gepubliceerd.');
    case 'notify': {
      const r = S.sendNotification({ title: String(fd.get('title')).trim(), body: String(fd.get('body')).trim(), kind: String(fd.get('kind')) });
      return done(r, r.ok ? `Verstuurd naar ${r.count} leden.` : '');
    }
    case 'res-alt':
      return done(S.setReservationStatus(id, 'voorstel', { proposedTime: String(fd.get('time')), message: String(fd.get('message')).trim() }), 'Voorstel verstuurd naar de gast.');
    case 'res-no':
      return done(S.setReservationStatus(id, 'geweigerd', { message: String(fd.get('message')).trim() }), 'De gast krijgt uw bericht.');
    case 'res-phone': {
      const r = S.requestReservation({ memberId: null, name: String(fd.get('name')).trim(), phone: String(fd.get('phone')).trim(), email: '', date: String(fd.get('date')), time: String(fd.get('time')), guests: Number(fd.get('guests')), wishes: [], notes: String(fd.get('notes')).trim(), source: 'telefoon' });
      return done(S.setReservationStatus(r.id, 'bevestigd'), 'Telefonische reservering opgeslagen.');
    }
  }
});

render({ fromRoute: true });
