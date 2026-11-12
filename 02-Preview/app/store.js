// Preview-"backend" in localStorage. Bootst de regels uit 03-Technische-Architectuur.md na:
// onveranderlijk puntenregister, idempotente scans, wachttijd, maximum per transactie, rechten en auditlog.
// Gastenapp en beheer delen deze opslag; het storage-event maakt het "realtime" tussen tabbladen.
import { SITE } from './site-data.js';
import { addDays, todayIso, uid } from './util.js';

const KEY = 'lc-preview-v1';
const SECRET = 'preview-geheim'; // in productie: HMAC-sleutel alleen op de server
const listeners = new Set();

const DAY = 86400000;

export const PERMISSIONS = {
  scan: 'Scannen en bezoek boeken',
  redeem: 'Beloning inwisselen',
  reservations: 'Reserveringen',
  members_view: 'Leden inzien (naam en saldo)',
  members_full: 'Leden volledig inzien',
  adjust: 'Punten corrigeren (met reden)',
  override: 'Wachttijd overslaan (met reden)',
  menu: 'Menukaart en foto’s',
  events: 'Experiencias',
  offers: 'Acties en ledenaanbiedingen',
  notify: 'Meldingen versturen',
  giftcards: 'Cadeaubonnen',
  loyalty: 'Spaarregels en beloningen',
  staff: 'Medewerkers en rechten',
  audit: 'Auditlog inzien',
};

export const ROLES = { bediening: 'Bediening', bedrijfsleider: 'Bedrijfsleider', eigenaar: 'Eigenaar' };

const defaultMatrix = () => ({
  bediening: ['scan', 'redeem', 'reservations', 'members_view', 'giftcards'],
  bedrijfsleider: [
    'scan', 'redeem', 'reservations', 'members_view', 'members_full', 'adjust', 'override', 'menu', 'events',
    'offers', 'notify', 'giftcards', 'audit',
  ],
  eigenaar: Object.keys(PERMISSIONS),
});

const CATS = [
  ['lunch', 'Lunch', 'lunch', 'lunch', `12-uurtje ${SITE.twaalfUurtje.price}: ${SITE.twaalfUurtje.body}`],
  ['salades', 'Salades en planken', 'salads', 'tapas-warm', ''],
  ['entremeses', 'Entremeses', 'starters', 'cazuelas', ''],
  ['tapas', 'Tapas', 'tapasPriced', 'tapas', ''],
  ['tapasdag', 'Tapasdag', null, 'tapas-warm', `${SITE.tapasDay.days}, ${SITE.tapasDay.price} p.p. ${SITE.tapasDay.rules.join(' ')}`],
  ['grill', 'Grill', 'grill', 'grill', SITE.mainsNote],
  ['vis', 'Vis en vegetarisch', 'fish', 'vis', SITE.mainsNote],
  ['paella', 'Paella', 'paella', 'paella', SITE.paellaNote],
  ['ninos', 'Niños', 'ninos', null, `Tapasdag voor kinderen van ${SITE.ninosTapas.age}: ${SITE.ninosTapas.price} (${SITE.ninosTapas.items.join(', ')}).`],
  ['postres', 'Postres', 'desserts', 'churros', ''],
  ['cafe', 'Koffie', 'coffees', null, SITE.coffeeNote],
  ['vinos', 'Wijn en sangria', 'wines', 'wijn', ''],
];

function seedMenu() {
  const categories = [];
  const dishes = [];
  CATS.forEach(([id, name, key, image, note], i) => {
    categories.push({ id, name, image, note, visible: true, sort: i });
    const add = (d, group) =>
      dishes.push({
        id: `${id}-${dishes.length}`,
        cat: id,
        group: group ?? null,
        name: d.name,
        description: d.description ?? '',
        price: d.price ?? '',
        tags: d.tags ?? [],
        allergens: null,
        isNew: false,
        soldOut: false,
      });
    if (id === 'tapasdag') {
      SITE.tapasCold.forEach((d) => add(d, 'Tapas frías'));
      SITE.tapasWarm.forEach((d) => add(d, 'Tapas calientes'));
    } else if (id === 'vinos') {
      SITE.wines.forEach((d) => add(d, 'Wijn'));
      SITE.sangria.forEach((d) => add(d, 'Sangria'));
    } else if (id === 'lunch') {
      SITE.lunch.forEach((d) => add(d));
    } else {
      SITE[key].forEach((d) => add(d));
    }
  });
  return { categories, dishes };
}

const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};
const windowNow = () => Math.floor(Date.now() / 30000);
// Alleen voor de preview; de echte app gebruikt scrypt op de server.
const pwHash = (pw, salt) => `${salt}.${hash(`${salt}:${pw}`)}${hash(`${pw}:${salt}:lc`)}`;
const pwCheck = (pw, stored) => !!stored && pwHash(pw, stored.split('.')[0]) === stored;
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60000;

function seed() {
  const today = todayIso();
  const t0 = Date.now();
  const members = [
    { id: 'm1', memberNo: 'LC-0101', firstName: 'Anna', lastName: 'de Vries', email: 'anna@voorbeeld.nl', phone: '06 12345678', birthday: { d: 14, m: 3 }, joinedAt: t0 - 160 * DAY, test: true, pw: pwHash('tapas2026', 'm1'), consents: { email_marketing: true, push_marketing: true } },
    { id: 'm2', memberNo: 'LC-0102', firstName: 'Mohammed', lastName: 'El Amrani', email: 'mohammed@voorbeeld.nl', phone: '06 23456789', birthday: null, joinedAt: t0 - 90 * DAY, test: true, pw: pwHash('tapas2026', 'm2'), consents: { email_marketing: false, push_marketing: true } },
    { id: 'm3', memberNo: 'LC-0103', firstName: 'Joke', lastName: 'Verbeek', email: 'joke@voorbeeld.nl', phone: '', birthday: { d: 2, m: 12 }, joinedAt: t0 - 30 * DAY, test: true, pw: pwHash('tapas2026', 'm3'), consents: { email_marketing: true, push_marketing: false } },
  ];
  const ledger = [];
  const add = (memberId, kind, points, daysAgo, desc, staffId = 's3') =>
    ledger.push({ id: uid('tx'), memberId, kind, points, at: t0 - daysAgo * DAY, desc, staffId, key: uid('k'), ruleVersion: 1 });
  [150, 120, 95, 60, 33, 12].forEach((d) => add('m1', 'bezoek', 10, d, 'Bezoek'));
  add('m1', 'beloning', -50, 33, 'Ingewisseld: Glas sangria, rood of wit', 's3');
  [80, 45, 20, 6].forEach((d) => add('m2', 'bezoek', 10, d, 'Bezoek'));
  [25, 9].forEach((d) => add('m3', 'bezoek', 10, d, 'Bezoek'));
  add('m3', 'correctie', 10, 8, 'Correctie: bezoek van 9 dagen geleden niet gescand', 's2');
  return {
    v: 2,
    seededAt: t0,
    loyalty: {
      isExample: true,
      version: 1,
      mode: 'visit',
      perVisit: 10,
      perEuro: 1,
      minSpendCents: 0,
      cooldownHours: 4,
      maxPerTx: 100,
      welcome: 0,
      expiryMonths: null,
      terms:
        'Concept, nog vast te stellen door La Caleta. Lidmaatschap is gratis. Punten zijn persoonlijk, niet overdraagbaar en niet inwisselbaar voor geld. La Caleta mag de regels en beloningen aanpassen; dat geldt vanaf het moment van wijzigen en wordt in de app gemeld.',
      updatedAt: t0,
    },
    rewards: [
      { id: 'r1', name: 'Glas sangria, rood of wit', description: 'Huisgemaakte sangria van de kaart.', cost: 50, membersOnly: true, active: true, isExample: true },
      { id: 'r2', name: 'Churros met chocolade-ijs', description: 'Met slagroom, chocoladesaus en suiker.', cost: 100, membersOnly: true, active: true, isExample: true },
      { id: 'r3', name: 'Karaf huisgemaakte sangria', description: 'Een liter, rood of wit.', cost: 250, membersOnly: true, active: true, isExample: true },
    ],
    birthday: { isExample: true, description: 'Een dessert naar keuze bij uw verjaardagsbezoek', validDays: 30 },
    offers: [
      { id: 'o1', title: 'Tapasdag', body: `${SITE.tapasDay.days}: kies uit ${SITE.facts.tapasCount} koude en warme tapas, ${SITE.tapasDay.price} p.p. Inloop ${SITE.tapasDay.walkIn.from} tot ${SITE.tapasDay.walkIn.until}.`, membersOnly: false, published: true, image: 'tapas' },
      { id: 'o2', title: 'Seniorenmenu', body: `${SITE.seniorMenu.courses.map((c) => c.value).join(', ')}. ${SITE.seniorMenu.price}.`, membersOnly: false, published: true, image: 'grill' },
      { id: 'o3', title: '12-uurtje', body: `${SITE.twaalfUurtje.body} ${SITE.twaalfUurtje.price}.`, membersOnly: false, published: true, image: 'lunch' },
    ],
    events: [
      { id: 'e1', title: 'Rioja-avond: Montelciego en Muriel', body: 'Proef de crianza, reserva en gran reserva van beide wijnhuizen naast elkaar, met tapas van de kaart.', date: addDays(today, 16), time: '19:00', priceCents: null, capacity: 24, signups: [{ memberId: 'm1', guests: 2 }], membersOnly: false, published: true, image: 'wijn', isExample: true },
      { id: 'e2', title: 'Paella-avond', body: 'De pan gaat op tafel: paella de marisco en de vegetarische paella, vers bereid voor de hele tafel.', date: addDays(today, 30), time: '18:30', priceCents: null, capacity: 30, signups: [], membersOnly: true, published: true, image: 'paella', isExample: true },
    ],
    giftcard: { isExample: true, amounts: [2500, 5000, 7500], min: 1000, max: 25000, requests: [] },
    blockedDates: [],
    ...seedMenu(),
    members,
    ledger,
    reservations: [
      { id: 'res1', memberId: 'm2', name: 'Mohammed El Amrani', phone: '06 23456789', email: 'mohammed@voorbeeld.nl', date: today, time: '18:30', guests: 4, wishes: ['Kinderstoel'], notes: '', status: 'bevestigd', source: 'app', createdAt: t0 - 2 * DAY, test: true, history: [{ at: t0 - 2 * DAY, status: 'aangevraagd' }, { at: t0 - 2 * DAY + 3600000, status: 'bevestigd', by: 's3' }] },
      { id: 'res2', memberId: null, name: 'Familie Bakker', phone: '06 98765432', email: 'bakker@voorbeeld.nl', date: addDays(today, 1), time: '19:00', guests: 6, wishes: ['Paella vooraf'], notes: 'Paella de marisco voor 4', status: 'aangevraagd', source: 'website', createdAt: t0 - 5 * 3600000, test: true, history: [{ at: t0 - 5 * 3600000, status: 'aangevraagd' }] },
    ],
    giftRequests: [],
    notifications: [],
    staff: [
      { id: 's1', name: 'Eigenaar (test)', role: 'eigenaar', email: 'eigenaar@lacaleta.test', pw: pwHash('eigenaar2026', 's1') },
      { id: 's2', name: 'Bedrijfsleider (test)', role: 'bedrijfsleider', email: 'leiding@lacaleta.test', pw: pwHash('leiding2026', 's2') },
      { id: 's3', name: 'Bediening (test)', role: 'bediening', email: 'bediening@lacaleta.test', pw: pwHash('bediening2026', 's3') },
    ],
    matrix: defaultMatrix(),
    audit: [{ id: uid('a'), at: t0, actor: 'systeem', action: 'Preview gestart met de kaart van de website en voorbeeldwaarden' }],
    session: { memberId: null, staffId: null },
    attempts: {},
    nextMemberNo: 104,
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.v === 2) return s;
    }
  } catch {
    // kapotte opslag: opnieuw beginnen
  }
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function commit(change) {
  // Meegestuurd zodat het andere tabblad weet wat er veranderde.
  state.lastChange = { ...(change ?? {}), at: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(state));
  for (const fn of listeners) fn(change ?? {});
}

window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return;
  const prev = state;
  state = JSON.parse(e.newValue);
  for (const fn of listeners) fn({ ...(state.lastChange ?? {}), remote: true, prev });
});

export const get = () => state;
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export function reset() {
  state = seed();
  commit({ reset: true });
}

const audit = (actor, action) => state.audit.unshift({ id: uid('a'), at: Date.now(), actor, action });
const staffName = (id) => state.staff.find((s) => s.id === id)?.name ?? 'onbekend';

// ---------- Leden ----------
export const member = (id = state.session.memberId) => state.members.find((m) => m.id === id) ?? null;
export const balance = (id) => state.ledger.filter((t) => t.memberId === id).reduce((n, t) => n + t.points, 0);
export const history = (id) => state.ledger.filter((t) => t.memberId === id).sort((a, b) => b.at - a.at);
export function nextReward(id) {
  const b = balance(id);
  const list = state.rewards.filter((r) => r.active).sort((a, z) => a.cost - z.cost);
  return { next: list.find((r) => r.cost > b) ?? null, available: list.filter((r) => r.cost <= b), balance: b };
}

export function signUp({ firstName, email, password, birthday, consents }) {
  if (state.members.some((m) => m.email.toLowerCase() === email.toLowerCase()))
    return { ok: false, field: 'email', message: 'Er is al een account met dit e-mailadres. Log in of kies een ander adres.' };
  if (password.length < 10) return { ok: false, field: 'password', message: 'Kies een wachtwoord van minimaal 10 tekens.' };
  const m = {
    id: uid('m'),
    memberNo: `LC-${String(state.nextMemberNo++).padStart(4, '0')}`,
    firstName,
    lastName: '',
    email,
    phone: '',
    birthday,
    joinedAt: Date.now(),
    pw: '',
    consents,
    consentLog: Object.entries(consents).map(([channel, granted]) => ({ channel, granted, at: Date.now(), source: 'aanmelden' })),
  };
  m.pw = pwHash(password, m.id);
  state.members.push(m);
  state.session.memberId = m.id;
  if (state.loyalty.welcome > 0)
    state.ledger.push({ id: uid('tx'), memberId: m.id, kind: 'welkom', points: state.loyalty.welcome, at: Date.now(), desc: 'Welkomstpunten', key: uid('k'), ruleVersion: state.loyalty.version });
  audit('gast', `Nieuw lid ${m.memberNo}`);
  commit({ member: m.id });
  return { ok: true, member: m };
}

function attempt(key, ok) {
  state.attempts ??= {};
  const a = state.attempts[key] ?? { n: 0, until: 0 };
  if (ok) {
    delete state.attempts[key];
    return;
  }
  a.n += 1;
  if (a.n >= MAX_TRIES) {
    a.until = Date.now() + LOCK_MS;
    a.n = 0;
  }
  state.attempts[key] = a;
}
const locked = (key) => (state.attempts?.[key]?.until ?? 0) > Date.now();
const LOCK_MSG = 'Te vaak een verkeerd wachtwoord. Probeer het over een kwartier opnieuw.';

export function logIn(email, password) {
  const key = `gast:${email.toLowerCase()}`;
  if (locked(key)) return { ok: false, message: LOCK_MSG };
  const m = state.members.find((x) => !x.deletedAt && x.email.toLowerCase() === email.toLowerCase());
  const ok = !!m && pwCheck(password, m.pw);
  attempt(key, ok);
  if (!ok) {
    commit();
    return { ok: false, message: locked(key) ? LOCK_MSG : 'E-mailadres of wachtwoord klopt niet.' };
  }
  state.session.memberId = m.id;
  commit();
  return { ok: true };
}

export function staffLogIn(email, password) {
  const key = `beheer:${email.toLowerCase()}`;
  if (locked(key)) return { ok: false, message: LOCK_MSG };
  const st = state.staff.find((x) => x.email.toLowerCase() === email.toLowerCase());
  const ok = !!st && pwCheck(password, st.pw);
  attempt(key, ok);
  if (!ok) {
    commit();
    return { ok: false, message: locked(key) ? LOCK_MSG : 'E-mailadres of wachtwoord klopt niet.' };
  }
  state.session.staffId = st.id;
  audit(st.name, 'Ingelogd in het beheer');
  commit();
  return { ok: true, staff: st };
}

export function staffLogOut() {
  const st = staff();
  if (st) audit(st.name, 'Uitgelogd');
  state.session.staffId = null;
  commit();
}

export function logOut() {
  state.session.memberId = null;
  commit();
}

export function updateProfile(id, patch) {
  const m = member(id);
  if (!m) return;
  if (patch.consents) {
    m.consentLog = m.consentLog ?? [];
    for (const [channel, granted] of Object.entries(patch.consents))
      if (m.consents?.[channel] !== granted) m.consentLog.push({ channel, granted, at: Date.now(), source: 'profiel' });
  }
  Object.assign(m, patch);
  commit();
}

export function deleteAccount(id) {
  const m = member(id);
  if (!m) return;
  // Historie blijft voor de administratie, maar zonder persoonsgegevens.
  Object.assign(m, { firstName: 'Verwijderd lid', lastName: '', email: `verwijderd-${m.id}`, phone: '', birthday: null, consents: {}, deletedAt: Date.now() });
  state.session.memberId = null;
  audit('gast', `Account ${m.memberNo} verwijderd op verzoek van het lid`);
  commit();
}

// ---------- QR-token ----------
export function qrToken(id) {
  const m = member(id);
  const w = windowNow();
  return `LC1.${m.memberNo}.${w}.${hash(`${m.memberNo}.${w}.${SECRET}`)}`;
}
export const qrSecondsLeft = () => 30 - (Math.floor(Date.now() / 1000) % 30);

function verifyToken(token) {
  const t = String(token).trim();
  if (/^LC-\d{4}$/i.test(t)) {
    const m = state.members.find((x) => x.memberNo.toUpperCase() === t.toUpperCase() && !x.deletedAt);
    return m ? { ok: true, member: m, manual: true } : { ok: false, code: 'onbekend', message: 'Geen lid gevonden met dit lidnummer.' };
  }
  const parts = t.split('.');
  if (parts.length !== 4 || parts[0] !== 'LC1') return { ok: false, code: 'ongeldig', message: 'Dit is geen La Caleta-ledenkaart.' };
  const [, no, w, sig] = parts;
  if (hash(`${no}.${w}.${SECRET}`) !== sig) return { ok: false, code: 'ongeldig', message: 'De QR-code klopt niet. Vraag de gast de kaart opnieuw te openen.' };
  const age = windowNow() - Number(w);
  if (age < 0 || age > 1) return { ok: false, code: 'verlopen', message: 'Deze QR-code is verlopen. Vraag de gast de kaart opnieuw te openen.' };
  const m = state.members.find((x) => x.memberNo === no && !x.deletedAt);
  if (!m) return { ok: false, code: 'onbekend', message: 'Dit lid bestaat niet (meer).' };
  if (m.blockedAt) return { ok: false, code: 'geblokkeerd', message: 'Dit account is geblokkeerd. Overleg met de bedrijfsleider.' };
  return { ok: true, member: m };
}

// ---------- Rechten ----------
export const staff = (id = state.session.staffId) => state.staff.find((s) => s.id === id);
export const can = (perm, id = state.session.staffId) => {
  const s = staff(id);
  return !!s && state.matrix[s.role]?.includes(perm);
};
// ---------- Punten: de enige wegen ----------
export function lookup(token) {
  return verifyToken(token);
}

export function awardVisit({ token, amountCents = 0, key, override = '' }) {
  const sid = state.session.staffId;
  if (!can('scan')) return { ok: false, code: 'recht', message: 'U heeft geen recht om punten toe te kennen.' };
  const prev = state.ledger.find((t) => t.key === key);
  if (prev) return { ok: true, duplicate: true, tx: prev, member: member(prev.memberId), balance: balance(prev.memberId) };
  const v = verifyToken(token);
  if (!v.ok) return v;
  const m = v.member;
  const me = staff(sid);
  if (me.email && me.email.toLowerCase() === m.email.toLowerCase())
    return { ok: false, code: 'eigen', message: 'U kunt geen punten op uw eigen account boeken.' };
  const L = state.loyalty;
  if (L.mode !== 'visit' && amountCents < L.minSpendCents)
    return { ok: false, code: 'minimum', message: `Punten vanaf een besteding van €${(L.minSpendCents / 100).toFixed(2).replace('.', ',')}.` };
  let points = 0;
  if (L.mode === 'visit' || L.mode === 'both') points += L.perVisit;
  if (L.mode === 'euro' || L.mode === 'both') points += Math.floor((amountCents / 100) * L.perEuro);
  if (points <= 0) return { ok: false, code: 'nul', message: 'Vul het bedrag van de rekening in.' };
  const capped = points > L.maxPerTx;
  points = Math.min(points, L.maxPerTx);
  const last = state.ledger.filter((t) => t.memberId === m.id && t.kind === 'bezoek').sort((a, b) => b.at - a.at)[0];
  const since = last ? (Date.now() - last.at) / 3600000 : Infinity;
  if (since < L.cooldownHours) {
    if (!override)
      return {
        ok: false,
        code: 'wachttijd',
        member: m,
        canOverride: can('override'),
        message: `${m.firstName} kreeg ${Math.round(since * 60)} minuten geleden al punten. De wachttijd is ${L.cooldownHours} uur.`,
      };
    if (!can('override')) return { ok: false, code: 'recht', message: 'Alleen een bedrijfsleider of de eigenaar kan de wachttijd overslaan.' };
  }
  const tx = {
    id: uid('tx'),
    memberId: m.id,
    kind: 'bezoek',
    points,
    amountCents: amountCents || null,
    at: Date.now(),
    desc: override ? `Bezoek (wachttijd overgeslagen: ${override})` : 'Bezoek',
    staffId: sid,
    key,
    ruleVersion: L.version,
    manual: !!v.manual,
  };
  state.ledger.push(tx);
  audit(me.name, `+${points} punten voor ${m.memberNo}${v.manual ? ' (handmatig lidnummer)' : ''}${override ? `, wachttijd overgeslagen: ${override}` : ''}${capped ? ', afgetopt op maximum' : ''}`);
  commit({ tx: tx.id, memberId: m.id });
  return { ok: true, tx, member: m, balance: balance(m.id), capped, manual: !!v.manual };
}

export function redeem({ memberId, rewardId, key }) {
  if (!can('redeem')) return { ok: false, message: 'U heeft geen recht om beloningen in te wisselen.' };
  if (state.ledger.some((t) => t.key === key)) return { ok: true, duplicate: true };
  const r = state.rewards.find((x) => x.id === rewardId && x.active);
  const m = member(memberId);
  if (!r || !m) return { ok: false, message: 'Beloning of lid niet gevonden.' };
  if (balance(m.id) < r.cost) return { ok: false, message: `Niet genoeg punten: ${balance(m.id)} van de ${r.cost}.` };
  const tx = { id: uid('tx'), memberId: m.id, kind: 'beloning', points: -r.cost, at: Date.now(), desc: `Ingewisseld: ${r.name}`, staffId: state.session.staffId, key, ruleVersion: state.loyalty.version };
  state.ledger.push(tx);
  audit(staffName(state.session.staffId), `${m.memberNo} wisselde "${r.name}" in (-${r.cost})`);
  commit({ tx: tx.id, memberId: m.id });
  return { ok: true, tx, balance: balance(m.id) };
}

export function adjust({ memberId, points, reason }) {
  if (!can('adjust')) return { ok: false, message: 'Alleen een bedrijfsleider of de eigenaar kan punten corrigeren.' };
  if (!reason || reason.trim().length < 5) return { ok: false, field: 'reason', message: 'Geef een reden van minimaal 5 tekens.' };
  if (!Number.isInteger(points) || points === 0) return { ok: false, field: 'points', message: 'Vul een geheel aantal punten in, positief of negatief.' };
  if (balance(memberId) + points < 0) return { ok: false, field: 'points', message: 'Het saldo mag niet onder nul komen.' };
  const tx = { id: uid('tx'), memberId, kind: 'correctie', points, at: Date.now(), desc: `Correctie: ${reason.trim()}`, staffId: state.session.staffId, key: uid('k'), ruleVersion: state.loyalty.version };
  state.ledger.push(tx);
  audit(staffName(state.session.staffId), `Correctie ${points > 0 ? '+' : ''}${points} voor ${member(memberId).memberNo}: ${reason.trim()}`);
  commit({ tx: tx.id, memberId });
  return { ok: true };
}

export function birthdayGift(id) {
  const m = member(id);
  if (!m?.birthday) return null;
  const year = new Date().getFullYear();
  const bday = new Date(Date.UTC(year, m.birthday.m - 1, m.birthday.d));
  const diff = (bday - new Date(`${todayIso()}T00:00:00Z`)) / DAY;
  return { ...state.birthday, date: bday, daysUntil: Math.round(diff), active: diff <= 0 && diff > -state.birthday.validDays };
}

// ---------- Beheer: instellingen ----------
export function saveLoyalty(patch) {
  if (!can('loyalty')) return { ok: false, message: 'Alleen de eigenaar kan de spaarregels wijzigen.' };
  state.loyalty = { ...state.loyalty, ...patch, version: state.loyalty.version + 1, updatedAt: Date.now(), isExample: false };
  audit(staffName(state.session.staffId), `Spaarregels gewijzigd (versie ${state.loyalty.version})`);
  commit();
  return { ok: true };
}
export function saveReward(r) {
  if (!can('loyalty')) return { ok: false, message: 'Alleen de eigenaar kan beloningen wijzigen.' };
  const i = state.rewards.findIndex((x) => x.id === r.id);
  if (i >= 0) state.rewards[i] = { ...state.rewards[i], ...r, isExample: false };
  else state.rewards.push({ ...r, id: uid('r'), active: true, isExample: false });
  audit(staffName(state.session.staffId), `Beloning "${r.name}" opgeslagen`);
  commit();
  return { ok: true };
}
export function saveDish(d) {
  if (!can('menu')) return { ok: false, message: 'U heeft geen recht om de menukaart te wijzigen.' };
  const i = state.dishes.findIndex((x) => x.id === d.id);
  state.dishes[i] = { ...state.dishes[i], ...d };
  audit(staffName(state.session.staffId), `Gerecht "${state.dishes[i].name}" gewijzigd`);
  commit();
  return { ok: true };
}
export function saveCategory(c) {
  if (!can('menu')) return { ok: false, message: 'U heeft geen recht om de menukaart te wijzigen.' };
  const i = state.categories.findIndex((x) => x.id === c.id);
  state.categories[i] = { ...state.categories[i], ...c };
  audit(staffName(state.session.staffId), `Categorie "${state.categories[i].name}" gewijzigd`);
  commit();
  return { ok: true };
}
export function moveCategory(id, dir) {
  if (!can('menu')) return;
  const list = [...state.categories].sort((a, b) => a.sort - b.sort);
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i].sort, list[j].sort] = [list[j].sort, list[i].sort];
  commit();
}
export function saveEvent(e) {
  if (!can('events')) return { ok: false, message: 'U heeft geen recht om experiencias te beheren.' };
  if (!e.title?.trim() || !e.date) return { ok: false, message: 'Vul minimaal een titel en een datum in.' };
  const i = state.events.findIndex((x) => x.id === e.id);
  if (i >= 0) state.events[i] = { ...state.events[i], ...e, isExample: false };
  else state.events.push({ signups: [], published: true, image: 'kaarsen', ...e, id: uid('e'), isExample: false });
  audit(staffName(state.session.staffId), `Experiencia "${e.title}" opgeslagen`);
  commit();
  return { ok: true };
}
export function saveOffer(o) {
  if (!can('offers')) return { ok: false, message: 'U heeft geen recht om acties te beheren.' };
  if (!o.title?.trim()) return { ok: false, message: 'Vul een titel in.' };
  const i = state.offers.findIndex((x) => x.id === o.id);
  if (i >= 0) state.offers[i] = { ...state.offers[i], ...o };
  else state.offers.push({ published: true, image: null, ...o, id: uid('o') });
  audit(staffName(state.session.staffId), `Actie "${o.title}" opgeslagen`);
  commit();
  return { ok: true };
}
export function togglePermission(role, perm) {
  if (!can('staff')) return { ok: false, message: 'Alleen de eigenaar beheert rechten.' };
  if (role === 'eigenaar') return { ok: false, message: 'De eigenaar houdt altijd alle rechten.' };
  const list = state.matrix[role];
  state.matrix[role] = list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm];
  audit(staffName(state.session.staffId), `Recht "${PERMISSIONS[perm]}" ${list.includes(perm) ? 'ingetrokken bij' : 'gegeven aan'} ${ROLES[role]}`);
  commit();
  return { ok: true };
}

// ---------- Reserveringen ----------
export function requestReservation(r) {
  const res = { ...r, id: uid('res'), status: 'aangevraagd', createdAt: Date.now(), history: [{ at: Date.now(), status: 'aangevraagd' }] };
  state.reservations.push(res);
  audit(r.memberId ? member(r.memberId)?.memberNo ?? 'gast' : 'gast', `Reserveringsaanvraag ${r.date} ${r.time}, ${r.guests} pers. (${r.source})`);
  commit({ reservation: res.id });
  return res;
}
export function setReservationStatus(id, status, extra = {}) {
  if (!can('reservations')) return { ok: false, message: 'U heeft geen recht om reserveringen te beheren.' };
  const r = state.reservations.find((x) => x.id === id);
  Object.assign(r, extra, { status });
  r.history.push({ at: Date.now(), status, by: state.session.staffId, ...extra });
  audit(staffName(state.session.staffId), `Reservering ${r.name} ${r.date} ${r.time}: ${status}`);
  commit({ reservation: id });
  return { ok: true };
}
export function cancelReservation(id) {
  const r = state.reservations.find((x) => x.id === id);
  if (!r) return;
  r.status = 'geannuleerd';
  r.history.push({ at: Date.now(), status: 'geannuleerd', by: 'gast' });
  audit('gast', `Reservering ${r.date} ${r.time} geannuleerd door de gast`);
  commit({ reservation: id });
}
export function toggleBlocked(iso) {
  if (!can('reservations')) return;
  state.blockedDates = state.blockedDates.includes(iso) ? state.blockedDates.filter((d) => d !== iso) : [...state.blockedDates, iso];
  audit(staffName(state.session.staffId), `Datum ${iso} ${state.blockedDates.includes(iso) ? 'geblokkeerd' : 'vrijgegeven'} voor online reserveren`);
  commit();
}

// ---------- Experiencias, cadeaubon, meldingen ----------
export function signUpEvent(eventId, memberId, guests) {
  const e = state.events.find((x) => x.id === eventId);
  const taken = e.signups.reduce((n, s) => n + s.guests, 0);
  if (e.signups.some((s) => s.memberId === memberId)) return { ok: false, message: 'U bent al aangemeld.' };
  if (e.capacity && taken + guests > e.capacity) return { ok: false, message: `Er zijn nog ${e.capacity - taken} plaatsen.` };
  e.signups.push({ memberId, guests, at: Date.now() });
  audit(member(memberId).memberNo, `Aangemeld voor "${e.title}" met ${guests} pers.`);
  commit();
  return { ok: true };
}
export function cancelEvent(eventId, memberId) {
  const e = state.events.find((x) => x.id === eventId);
  e.signups = e.signups.filter((s) => s.memberId !== memberId);
  commit();
}
export function requestGiftcard(g) {
  state.giftRequests.push({ ...g, id: uid('g'), at: Date.now(), status: 'aangevraagd' });
  audit(g.memberId ? member(g.memberId).memberNo : 'gast', `Cadeaubon aangevraagd: ${(g.amountCents / 100).toFixed(2)} euro`);
  commit();
}
export function audience(kind) {
  const active = state.members.filter((m) => !m.deletedAt);
  if (kind === 'marketing') return active.filter((m) => m.consents?.push_marketing || m.consents?.email_marketing);
  if (kind === 'inactief')
    return active.filter((m) => (m.consents?.push_marketing || m.consents?.email_marketing) && !state.ledger.some((t) => t.memberId === m.id && t.kind === 'bezoek' && Date.now() - t.at < 60 * DAY));
  return active;
}
export function sendNotification({ title, body, kind }) {
  if (!can('notify')) return { ok: false, message: 'U heeft geen recht om meldingen te versturen.' };
  const to = audience(kind).map((m) => m.id);
  state.notifications.unshift({ id: uid('n'), title, body, kind, to, at: Date.now(), by: state.session.staffId });
  audit(staffName(state.session.staffId), `Melding "${title}" naar ${to.length} leden`);
  commit();
  return { ok: true, count: to.length };
}
export const inbox = (id) => state.notifications.filter((n) => n.to.includes(id));
export { staffName };
