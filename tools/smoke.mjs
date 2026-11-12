// Rooktest van de preview in Chromium: stromen gast + beheer, en geen consolefouten.
// Gebruik: python -m http.server 4190 (in 02-Preview), dan: node tools/smoke.mjs [screenshotmap]
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

async function loadPlaywright() {
  for (const s of ['playwright', 'playwright-core']) {
    try {
      return await import(s);
    } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
    }
  }
  const p = join(process.env.LOCALAPPDATA ?? '', 'GG Coder', 'sidecar', 'node_modules', 'playwright', 'index.mjs');
  if (existsSync(p)) return import(`file://${p.replace(/\\/g, '/')}`);
  throw new Error('Playwright niet gevonden');
}

const BASE = process.env.URL ?? 'http://127.0.0.1:4190/';
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const results = [];
const errors = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const watch = (page, label) => {
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${label}: ${m.text()}`));
};
const staffLogin = async (page, email, pw) => {
  await page.waitForSelector('[data-form="staff-login"]');
  await page.fill('[data-form="staff-login"] input[name="email"]', email);
  await page.fill('[data-form="staff-login"] input[name="password"]', pw);
  await page.click('[data-form="staff-login"] button[type="submit"]');
  await page.waitForSelector('#b-nav a');
};
const staffLogout = async (page) => {
  await page.click('[data-act="logout"]');
  await page.waitForSelector('[data-form="staff-login"]');
};
const GUEST_LEAKS = ['In te vullen', 'Voorbeeld', 'VOORBEELD', 'preview', 'Preview', 'testlid'];
const shot = async (page, name) => {
  if (!shots) return;
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(shots, `${name}.png`) });
};

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const gast = await ctx.newPage();
  watch(gast, 'gast');
  await gast.goto(BASE);
  await gast.waitForURL(/gast\.html/);
  check('start opent de gastenapp', gast.url().includes('gast.html'));
  check('welkomstscherm zichtbaar', await gast.isVisible('#welcome'));
  await shot(gast, 'g-01-welkom');
  await gast.click('[data-act="welcome"][data-id="inloggen"]');
  await gast.fill('[data-input="l-email"]', 'anna@voorbeeld.nl');
  await gast.fill('[data-input="l-password"]', 'fout-wachtwoord');
  await gast.click('[data-form="login"] button[type="submit"]');
  check('verkeerd wachtwoord geweigerd', (await gast.textContent('main')).includes('klopt niet'));
  await gast.fill('[data-input="l-password"]', 'tapas2026');
  await gast.click('[data-form="login"] button[type="submit"]');
  await gast.waitForSelector('.lc-card');
  const before = Number(await gast.textContent('[data-points]'));
  check('testlid ingelogd, saldo 10', before === 10, `saldo ${before}`);
  await shot(gast, 'g-02-club');

  const beheer = await ctx.newPage();
  await beheer.setViewportSize({ width: 1280, height: 900 });
  watch(beheer, 'beheer');
  await beheer.goto(`${BASE}beheer.html#/scannen`);
  check('beheer vraagt eerst om in te loggen', await beheer.isVisible('[data-form="staff-login"]') && !(await beheer.isVisible('#b-nav a')));
  await beheer.fill('[data-form="staff-login"] input[name="email"]', 'eigenaar@lacaleta.test');
  await beheer.fill('[data-form="staff-login"] input[name="password"]', 'verkeerd');
  await beheer.click('[data-form="staff-login"] button[type="submit"]');
  check('beheer weigert verkeerd wachtwoord', (await beheer.textContent('main')).includes('klopt niet'));
  await shot(beheer, 'b-00-inloggen');
  await staffLogin(beheer, 'eigenaar@lacaleta.test', 'eigenaar2026');
  await beheer.click('[data-act="scan-sim"][data-id="m1"]');
  await beheer.waitForSelector('[data-form="award"]');
  await beheer.click('[data-form="award"] button[type="submit"]');
  await beheer.waitForSelector('.scan-result.on-vino');
  check('beheer: bezoek geboekt +10', (await beheer.textContent('.scan-result .big'))?.trim() === '+10');
  await shot(beheer, 'b-01-scan-ok');
  await gast.waitForFunction(() => document.querySelector('[data-points]')?.textContent === '20', null, { timeout: 4000 }).catch(() => {});
  check('gast ziet punten direct (realtime)', (await gast.textContent('[data-points]')) === '20');
  check('gast ziet gescand-melding', await gast.isVisible('.scanned'));
  await shot(gast, 'g-03-gescand');

  const idem = await beheer.evaluate(async () => {
    const S = await import('./app/store.js');
    const n = S.get().ledger.length;
    const key = 'test-dubbel';
    const tok = S.qrToken('m2');
    const a = S.awardVisit({ token: tok, key });
    const b = S.awardVisit({ token: tok, key });
    return { added: S.get().ledger.length - n, a: a.ok, dup: b.duplicate };
  });
  check('dubbele scan wordt één boeking', idem.added === 1 && idem.a && idem.dup, JSON.stringify(idem));

  const tampered = await beheer.evaluate(async () => {
    const S = await import('./app/store.js');
    const t = S.qrToken('m3').split('.');
    t[1] = 'LC-0101';
    return S.lookup(t.join('.')).code;
  });
  check('vervalste QR geweigerd', tampered === 'ongeldig', tampered);

  await beheer.click('[data-act="scan-next"]');
  await beheer.click('[data-act="scan-sim"][data-id="m1"]');
  await beheer.click('[data-form="award"] button[type="submit"]');
  await beheer.waitForSelector('.msg[data-tone="err"]');
  check('wachttijd houdt tweede bezoek tegen', (await beheer.textContent('.msg[data-tone="err"]')).includes('wachttijd'));
  check('eigenaar mag wachttijd overslaan', await beheer.isVisible('input[name="override"]'));
  await shot(beheer, 'b-02-wachttijd');

  await staffLogout(beheer);
  await staffLogin(beheer, 'bediening@lacaleta.test', 'bediening2026');
  check('bediening ziet geen rechtenbeheer', !(await beheer.isVisible('#b-nav a[href="#/rechten"]')));
  await beheer.goto(`${BASE}beheer.html#/scannen`);
  await beheer.click('[data-act="scan-sim"][data-id="m1"]');
  await beheer.click('[data-form="award"] button[type="submit"]');
  await beheer.waitForSelector('.msg[data-tone="err"]');
  check('bediening kan wachttijd niet overslaan', !(await beheer.isVisible('input[name="override"]')) && (await beheer.isVisible('.lock')));
  const adj = await beheer.evaluate(async () => (await import('./app/store.js')).adjust({ memberId: 'm1', points: 50, reason: 'probeersel' }).ok);
  check('bediening kan geen punten corrigeren', adj === false);
  await beheer.goto(`${BASE}beheer.html#/rechten`);
  check('bediening: directe link naar rechten geblokkeerd', (await beheer.textContent('h1')) === 'Geen toegang');
  await beheer.goto(`${BASE}beheer.html#/vandaag`);
  await staffLogout(beheer);
  await staffLogin(beheer, 'eigenaar@lacaleta.test', 'eigenaar2026');

  await gast.goto(`${BASE}gast.html#/reserveren`);
  await gast.waitForSelector('.slot');
  await gast.click('.slot');
  await gast.click('[data-form="reserve"] button[type="submit"]');
  await gast.waitForSelector('[data-success]', { timeout: 3000 });
  check('reserveringsaanvraag verstuurd', (await gast.textContent('h1')).includes('Aanvraag ontvangen'));
  await shot(gast, 'g-04-reservering');
  await beheer.goto(`${BASE}beheer.html#/reserveringen`);
  await beheer.waitForSelector('[data-act="res-ok"]');
  const resCount = await beheer.locator('[data-act="res-ok"]').count();
  check('beheer ziet de aanvraag', resCount >= 2, `${resCount} open`);
  await shot(beheer, 'b-03-reserveringen');
  await beheer.locator('tr', { hasText: 'Anna' }).locator('[data-act="res-ok"]').click();
  await gast.goto(`${BASE}gast.html#/home`);
  await gast.waitForSelector('.status-pill');
  check('gast ziet reservering bevestigd', (await gast.textContent('.res-line .status-pill')) === 'Bevestigd');
  await shot(gast, 'g-05-home');

  await gast.goto(`${BASE}gast.html#/reserveren`);
  await gast.click('[data-act="res-new"]').catch(() => {});
  await gast.fill('[data-input="phone"]', '12');
  await gast.click('.slot');
  await gast.click('[data-form="reserve"] button[type="submit"]');
  check('ongeldig telefoonnummer geeft foutmelding', await gast.isVisible('#err-phone'));
  for (let i = 0; i < 12; i++) await gast.click('[data-act="guests"][data-id="1"]').catch(() => {});
  check('meer dan 12 personen: bel-melding', (await gast.textContent('main')).includes('Voor groepen vanaf 13 personen'));

  await gast.goto(`${BASE}gast.html#/kaart`);
  await gast.fill('[data-input="menu-q"]', 'paella');
  const hits = await gast.locator('#menu-list .dish').count();
  check('zoeken op de kaart vindt paella', hits >= 3, `${hits} treffers`);
  await gast.click('#menu-list .dish');
  check('gerecht opent in sheet met allergenen-status', (await gast.textContent('#sheet')).includes('Nog niet opgegeven'));
  await shot(gast, 'g-06-gerecht');
  await gast.keyboard.press('Escape');

  await beheer.goto(`${BASE}beheer.html#/menukaart`);
  await beheer.click('[data-act="cat-pick"][data-id="paella"]');
  await beheer.click('[data-act="dish-edit"]');
  await beheer.uncheck('#b-dialog input[name="unknown"]');
  await beheer.check('#b-dialog input[value="Schaaldieren"]');
  await beheer.check('#b-dialog input[value="Weekdieren"]');
  await beheer.check('#b-dialog input[name="isNew"]');
  await shot(beheer, 'b-04-gerecht');
  await beheer.click('#b-dialog button[type="submit"]');
  await gast.goto(`${BASE}gast.html#/home`);
  check('nieuw gerecht verschijnt op Home', (await gast.textContent('#h-new + *, section[aria-labelledby="h-new"]')).includes('Paella de marisco'));

  const leaks = [];
  for (const r of ['home', 'kaart', 'reserveren', 'club', 'club/historie', 'experiencias', 'experiencias/e1', 'cadeaubon', 'meer', 'profiel', 'info', 'meldingen', 'voorwaarden']) {
    await gast.goto(`${BASE}gast.html#/${r}`);
    await gast.waitForTimeout(80);
    const txt = await gast.textContent('main');
    for (const w of GUEST_LEAKS) if (txt.includes(w)) leaks.push(`${r}: ${w}`);
  }
  check('gast ziet geen preview- of voorbeeldnotities', !leaks.length, leaks.join(', '));
  for (const r of ['vandaag', 'scannen', 'reserveringen', 'leden', 'leden/m1', 'spaarsysteem', 'menukaart', 'experiencias', 'acties', 'meldingen', 'cadeaubonnen', 'rechten', 'audit']) {
    await beheer.goto(`${BASE}beheer.html#/${r}`);
    await beheer.waitForTimeout(80);
  }
  const audit = await beheer.textContent('#audit-table');
  check('auditlog bevat scans en correcties', audit.includes('+10 punten voor LC-0101') && audit.includes('Gerecht'));

  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const nieuw = await ctx2.newPage();
  watch(nieuw, 'aanmelden');
  await nieuw.goto(`${BASE}gast.html#/aanmelden`);
  await nieuw.click('[data-form="signup"] button[type="submit"]');
  check('aanmelden zonder gegevens geeft fouten', (await nieuw.locator('.field-error').count()) >= 3);
  await nieuw.fill('[data-input="s-firstName"]', 'Lucia');
  await nieuw.fill('[data-input="s-email"]', 'lucia@voorbeeld.nl');
  await nieuw.fill('[data-input="s-password"]', 'eenlangwachtwoord');
  await nieuw.selectOption('[data-input="s-day"]', '12');
  await nieuw.selectOption('[data-input="s-month"]', '11');
  await nieuw.check('[data-input="s-terms"]');
  await shot(nieuw, 'g-07-aanmelden');
  await nieuw.click('[data-form="signup"] button[type="submit"]');
  await nieuw.waitForSelector('.lc-card');
  check('nieuw lid krijgt ledenkaart met lidnummer', (await nieuw.textContent('.lc-card .no')).startsWith('LC-0'));
  await nieuw.waitForTimeout(900);
  await shot(nieuw, 'g-08-nieuw-lid');
  await nieuw.click('main [data-act="open-card"]');
  await nieuw.waitForTimeout(900);
  check('ledenkaart opent groot met aftelling', await nieuw.isVisible('#card-dialog [data-count]'));
  await shot(nieuw, 'g-09-kaart-groot');

  const wide = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const w = await wide.newPage();
  watch(w, 'desktop');
  await w.goto(`${BASE}gast.html#/home`);
  await w.waitForTimeout(500);
  await shot(w, 'd-01-home');
  await w.goto(`${BASE}gast.html#/kaart?cat=grill`);
  await w.waitForTimeout(400);
  await shot(w, 'd-02-kaart');
  await w.goto(`${BASE}beheer.html#/vandaag`);
  await staffLogin(w, 'eigenaar@lacaleta.test', 'eigenaar2026');
  await shot(w, 'd-03-beheer');
  await w.goto(`${BASE}demo.html`);
  await w.waitForTimeout(1200);
  await shot(w, 'd-04-demo');
  await w.setViewportSize({ width: 820, height: 1180 });
  await w.goto(`${BASE}gast.html#/club`);
  await w.waitForTimeout(400);
  await shot(w, 't-01-tablet-club');
} catch (e) {
  errors.push(`script: ${e.message.split(String.fromCharCode(10))[0]}`);
} finally {
  await browser.close();
}

const pass = results.filter((r) => r.ok).length;
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
console.log(`\n${pass}/${results.length} geslaagd, ${errors.length} consolefouten`);
for (const e of errors) console.log(`  fout: ${e}`);
process.exitCode = pass === results.length && !errors.length ? 0 : 1;
