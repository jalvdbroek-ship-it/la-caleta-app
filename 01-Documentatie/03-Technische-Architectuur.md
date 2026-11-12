# 3. Technische architectuur

## 3.1 Keuze in het kort

**Besluit 12-11-2026:** eigen server met PostgreSQL (geen Supabase), en tijdens de testfase
**geen kosten** voor La Caleta of voor ons. Alles draait lokaal; betaalde diensten en hosting
kiezen we pas als de app naar echte gasten gaat.

| Laag | Keuze | Waarom |
| --- | --- | --- |
| Gastenapp + beheer | **Next.js (App Router) + React + TypeScript**, één project met twee strikt gescheiden delen | Eén codebase is minder onderhoud; server components en server actions houden geheimen op de server. Zelfde stack als de Wesley's Ambacht App |
| Database | **PostgreSQL** met **Drizzle ORM** en migraties in git. Testfase: **PGlite** (Postgres als bestand) in `%LOCALAPPDATA%` **buiten OneDrive**. Later: een gewone PostgreSQL via `DATABASE_URL` | Gratis, dezelfde SQL lokaal en in productie; bewezen in de Wesley-app |
| Authenticatie | **Eigen**: wachtwoord met scrypt (`node:crypto`), sessie in een httpOnly-cookie met de sessie in de database, inloglink per e-mail (token gehasht, 15 minuten geldig), medewerkers verplicht met tweestapsverificatie (TOTP, RFC 6238) | Geen externe dienst nodig; scrypt en HMAC voor TOTP zitten in de standaardbibliotheek van Node |
| Bestanden | Foto's op de server in een map buiten de webroot, geserveerd via een route met rechtencheck (publieke menu- en eventfoto's zonder login) | Geen opslagdienst nodig; gaat mee in de back-up |
| Realtime | **Server-Sent Events**, gevoed door Postgres `LISTEN/NOTIFY` | Punten verschijnen direct na het scannen; nieuwe aanvragen direct in het beheer |
| PWA | Web App Manifest + eigen service worker | Installeerbaar op Android, iPhone, tablet en desktop; kaart en ledenkaart offline |
| Push | **Web Push (VAPID)**, verstuurd vanaf de server | Gratis; werkt op `localhost` en later op HTTPS. iPhone vanaf iOS 16.4 als de app op het beginscherm staat |
| E-mail | Testfase: **lokale outbox**. Elke mail (bevestiging, herinnering, inloglink) wordt opgeslagen en is te lezen in het beheer onder "Verstuurde e-mails". Later: SMTP van lacaleta.nl of een maildienst | Geen kosten en geen mail naar echte mensen tijdens het testen |
| QR | Server: ondertekend token (HMAC-SHA256). Gast: QR als SVG. Scannen: `BarcodeDetector` waar beschikbaar, anders een kleine scanbibliotheek | Elke telefoon of tablet aan de bar is een scanner |
| Animatie | **GSAP** 3.15.1, zelfde versie als de website | Eén animatiebibliotheek in het hele merk; alles valt weg bij `prefers-reduced-motion` |
| Hosting | Testfase: deze computer (`npm start`). Later te kiezen: een EU-server met HTTPS | Geen kosten zolang er geen echte gasten zijn |
| Betalen (later) | **Mollie** (iDEAL, kaart), pas na keuze en voorwaarden | Niet in de testfase |

**Bekeken en afgewezen:**
- *Supabase:* minder eigen code voor auth en realtime, maar een externe dienst met
  maandkosten. Op verzoek van de opdrachtgever niet gekozen.
- *Twee losse apps (gast en beheer) in een monorepo:* dubbele deploys voor één restaurant. De
  scheiding regelen we met routes, middleware en rechten (§3.2).
- *Native apps (App Store en Play Store):* kosten per jaar en twee codebases. Een PWA geeft voor
  deze functies hetzelfde gebruik.

## 3.2 Scheiding van de vier delen

```
┌─────────────────────────┐   ┌──────────────────────────────┐
│ 1. Gastenapp            │   │ 2. Beheerpaneel              │
│ app.lacaleta.nl         │   │ beheer.lacaleta.nl           │
│ src/app/(gast)/...      │   │ src/app/beheer/...           │
│ publieke + leden-routes │   │ alleen medewerkers, MFA      │
└───────────┬─────────────┘   └──────────────┬───────────────┘
            │ server actions / route handlers (zod-validatie, rechtencheck)
            ▼                                ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Database (PostgreSQL; testfase PGlite buiten OneDrive)    │
│ tabellen + rechten per databaserol + functies voor punten     │
│ append-only register en auditlog                             │
└───────────┬──────────────────────────────────────────────────┘
            ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Externe integraties (alleen via src/server/integraties/)  │
│ e-mail · web push · reserveringskanaal-adapter · Mollie      │
│ website-formulier (POST naar /api/reserveringen)             │
└──────────────────────────────────────────────────────────────┘
```

- **Middleware** weigert `/beheer` zonder geldige medewerkersessie met tweestapsverificatie.
  Beheer-sessies verlopen na 8 uur. Later kan het beheer op een eigen subdomein.
- **De database is alleen bereikbaar voor de server.** De browser praat nooit direct met
  Postgres; alle toegang loopt via server actions en route handlers in `src/server/`,
  gemarkeerd met `server-only`.
- **De website** blijft een losse Astro-site. De enige koppeling is dat het formulier naar
  `/api/reserveringen` post (CORS alleen voor het websitedomein, honeypot en rate limit).

## 3.3 Mappenstructuur (fase 4)

```
03-App/
├── src/app/(gast)/          home, kaart, reserveren, club, experiencias, cadeaubon, meer, profiel
├── src/app/beheer/          vandaag, scannen, reserveringen, leden, spaarsysteem, menukaart, ...
├── src/app/api/             reserveringen (website), push-abonnement, mollie-webhook (later)
├── src/server/              db-clients, rechten.ts, punten.ts, qr-token.ts, integraties/
├── src/components/          gedeelde UI (boog, knoppen, sheets, ledenkaart)
├── src/lib/                 tijden.ts (gedeeld met de website-logica), validatie (zod)
├── drizzle/                migraties: schema, databaserollen, functies, triggers
├── src/db/                 schema (Drizzle), verbinding (PGlite of DATABASE_URL), seed van de kaart uit site.ts
├── public/                  manifest, iconen, service worker
└── tests/                   vitest (regels, punten, rechten) + Playwright (stromen)
```

## 3.4 Datamodel

```sql
-- Personen
profiles (id uuid pk, email citext unique, password_hash text, first_name, last_name, phone,
          birthday_day smallint, birthday_month smallint,      -- geen geboortejaar nodig
          member_no text unique, joined_at, blocked_at, deleted_at)
consents (profile_id, channel text check in ('email_marketing','push_marketing','birthday'),
          granted boolean, source text, text_version text, at timestamptz)   -- historie, nooit overschrijven
staff (profile_id pk, role text check in ('bediening','bedrijfsleider','eigenaar'),
       totp_secret_enc text, active boolean, invited_by, created_at)
sessions (id_hash text pk, profile_id, kind text check in ('gast','beheer'), mfa boolean,
          expires_at, created_at, user_agent)
login_tokens (token_hash text pk, profile_id, purpose text, expires_at, used_at)
login_attempts (key text, at timestamptz)          -- rate limiting per e-mail en IP
outbox (id, to_email, subject, body_html, kind, created_at, sent_at null)  -- testfase: niet verstuurd
staff_permissions (role, permission text, allowed boolean)    -- matrix §2.9, aanpasbaar door eigenaar

-- Spaarsysteem
loyalty_rules (id, version int, mode text, points_per_visit int, points_per_euro numeric,
               min_spend_cents int, cooldown_hours int, max_points_per_tx int,
               welcome_points int, expiry_months int null, terms_md text,
               is_example boolean, valid_from timestamptz, created_by)   -- nieuwe versie per wijziging
rewards (id, name, description, points_cost int, members_only bool, active_from, active_to,
         max_per_member int null, image_path, sort, archived_at)
point_ledger (id bigserial, profile_id, kind text check in
              ('bezoek','beloning','verjaardag','welkom','correctie','vervallen'),
              points int,               -- + of -
              amount_cents int null, reward_id null, rule_version int,
              idempotency_key text unique,   -- voorkomt dubbele boekingen
              staff_id null, reason text null, created_at)
-- saldo = som(points); view member_balance. GEEN update of delete op point_ledger (trigger weigert).

birthday_gifts (profile_id, year int, issued_at, redeemed_at, expires_at, unique(profile_id, year))

-- Menukaart
menu_categories (id, slug, name, intro, note, sort, visible, image_path)
dishes (id, category_id, name, description, price_text, price_cents null, tags text[],
        allergens text[] null,         -- null = nog niet opgegeven; [] = geen allergenen
        is_new bool, sold_out bool, image_path, sort, updated_by, updated_at)

-- Reserveringen
reservations (id, profile_id null, source text check in ('app','website','telefoon','platform'),
              name, phone, email, date, time, guests int check (guests between 1 and 12),
              wishes text[], notes text, status text check in
              ('aangevraagd','bevestigd','voorstel','geweigerd','geannuleerd','no_show'),
              proposed_time null, external_ref null, created_at, updated_at)
reservation_events (reservation_id, status, message, staff_id, at)
blocked_dates (date, reason)

-- Experiencias, acties, cadeaubonnen, meldingen
events (id, title, body, starts_at, ends_at, image_path, price_cents null, capacity int null,
        members_only bool, signup_open bool, published_at, archived_at)
event_signups (event_id, profile_id, guests int, status text, created_at, unique(event_id, profile_id))
offers (id, title, body, members_only bool, active_from, active_to, published bool)
gift_cards (id, code text unique, amount_cents, balance_cents, buyer_profile_id null,
            recipient_name, message, status text, payment_ref null, valid_until, created_at)
gift_card_tx (gift_card_id, delta_cents, staff_id, idempotency_key unique, at)
push_subscriptions (profile_id, endpoint, keys jsonb, created_at)
notifications (id, title, body, audience jsonb, scheduled_at, sent_at, sent_count, created_by)

-- Controle
audit_log (id bigserial, actor_id, actor_role, action, entity, entity_id, before jsonb,
           after jsonb, ip_hash, at)    -- append-only, ook via trigger op gevoelige tabellen
```

## 3.5 Punten toekennen: de enige weg

Punten ontstaan nooit door een `insert` vanuit de app. Er is één databasefunctie die alle regels
afdwingt, aangeroepen door de server na de scan:

```sql
award_visit(p_token text, p_amount_cents int, p_idempotency_key text, p_override_reason text)
  -- databasefunctie; de app-rol mag point_ledger alleen via deze functies vullen
  1. controleer dat de aanroeper actieve staff is met recht 'scan'
  2. controleer het QR-token: HMAC klopt, tijdvenster ≤ 60 s, lid niet geblokkeerd
  3. weiger als de medewerker en het lid hetzelfde account of e-mailadres hebben
  4. haal de geldige loyalty_rules-versie op
  5. bereken punten (per bezoek en/of per euro, minimale besteding), cap op max_points_per_tx
  6. wachttijd: laatste 'bezoek' van dit lid < cooldown_hours?
       → weiger, tenzij p_override_reason gevuld én de medewerker heeft recht 'override'
  7. insert in point_ledger met idempotency_key (unique: tweede poging geeft het eerste resultaat terug)
  8. insert in audit_log
  9. return saldo en de volgende beloning
```

Op dezelfde manier: `redeem_reward(...)` (saldo moet voldoende zijn, `SELECT ... FOR UPDATE` op
het lid om gelijktijdige inwisselingen te voorkomen), `adjust_points(...)` (alleen
bedrijfsleider en eigenaar, reden verplicht) en `issue_birthday_gift(...)` (dagelijkse taak,
uniek per lid per jaar).

**QR-token:** `LC1.<lidnummer>.<tijdvenster>.<handtekening>`, met tijdvenster = Unix-tijd / 30 en
handtekening = eerste 16 tekens van HMAC-SHA256(geheim, lidnummer + venster). De app haalt elke
30 seconden een nieuw token op bij de server; de server accepteert het huidige en het vorige
venster. Het geheim staat alleen op de server. Offline toont de app het lidnummer; boeken op
lidnummer vraagt een extra bevestiging van de medewerker en wordt in het dagoverzicht gemarkeerd.

## 3.6 Rechten in twee lagen

1. **Server:** elke server action en route handler controleert sessie, rol en recht
   (`src/server/rechten.ts`, matrix uit §2.9 van het functioneel ontwerp). Gasten zien alleen
   hun eigen rijen: elke query filtert op het profiel van de sessie.
2. **Database:** de app verbindt met een rol zonder `UPDATE` en `DELETE` op `point_ledger`,
   `gift_card_tx` en `audit_log`. Triggers weigeren wijzigingen ook als iemand het toch
   probeert. Een aparte rol voert alleen migraties uit.

| Gegeven | Gast (eigen account) | Medewerker | Anoniem |
| --- | --- | --- | --- |
| Profiel | eigen gegevens lezen en wijzigen (niet lidnummer of blokkade) | volgens recht 'leden' | nee |
| Puntenregister | eigen regels lezen | lezen volgens recht 'leden'; schrijven alleen via de functies | nee |
| Kaart, acties, experiencias, beloningen (gepubliceerd) | lezen | schrijven volgens recht | lezen (ledenaanbieding: titel wel, details niet) |
| Reserveringen | eigen lezen, aanvragen, annuleren | volgens recht 'reserveringen' | aanvragen via de API met honeypot en rate limit |
| Auditlog | nee | lezen volgens recht 'audit' | nee |
| Medewerkers, rechten, spaarregels | publieke regels lezen | alleen eigenaar schrijft | nee |

Tests dekken elke cel van deze matrix (fase 6).

## 3.7 Beveiliging

- **Invoer:** elke actie valideert met zod op de server; de browser-validatie is alleen gemak.
- **Wachtwoorden:** minimaal 10 tekens, scrypt met eigen salt per wachtwoord, vergelijken in
  constante tijd, nooit gelogd. Sessietokens en inloglinks staan alleen gehasht in de database.
- **Rate limiting:** inloggen, aanmelden, reserveren en scannen per IP en per account.
- **Medewerkers:** verplicht tweestapsverificatie (TOTP), uitnodiging via de outbox (geen standaardwachtwoorden), toegang
  direct intrekbaar.
- **Headers:** strikte Content-Security-Policy, HSTS, `frame-ancestors 'none'` op het beheer,
  `Referrer-Policy`, `Permissions-Policy` (camera alleen op `/beheer/scannen`).
- **Geheimen:** alleen in de omgevingsvariabelen van de host; `.env` nooit in git; `.env.example`
  zonder waarden.
- **Afhankelijkheden:** exacte versies, `npm audit` in de bouwstap, maandelijkse update.
- **Logging:** fouten zonder persoonsgegevens; het auditlog is de bron voor wie-deed-wat.

## 3.8 AVG en toestemming

| Onderwerp | Invulling |
| --- | --- |
| Grondslag Club | uitvoering van de overeenkomst (de Clubvoorwaarden), art. 6 lid 1b AVG |
| Grondslag marketing | toestemming per kanaal, los aan te vinken, standaard uit; vastgelegd met tekstversie en tijd (`consents`) |
| E-mailmarketing | toestemming vooraf (art. 11.7 Telecommunicatiewet); afmeldlink in elke mail |
| Minimale gegevens | voornaam, e-mail; telefoon en achternaam optioneel; verjaardag zonder jaar |
| Rechten van de gast | inzien en downloaden, wijzigen, verwijderen in de app zelf; verzoeken binnen een maand |
| Bewaartermijn (voorstel) | inactieve accounts na 24 maanden een mail, na 27 maanden verwijderd; reserveringen 12 maanden na datum geanonimiseerd; auditlog 7 jaar zonder contactgegevens (fiscale bewaarplicht bij geldmutaties) |
| Verwerkers | testfase: geen (alles lokaal, alleen testgegevens). Bij livegang: verwerkersovereenkomst met de host, de maildienst en later Mollie; alle data in de EU |
| Cookies | alleen functionele cookies (sessie); geen tracking, dus geen cookiebanner. Statistiek alleen privacyvriendelijk zonder cookies, als daar om gevraagd wordt |
| Documenten | privacyverklaring en Clubvoorwaarden, door La Caleta laten toetsen voor livegang |
| Datalek | procedure: binnen 72 uur melden bij de AP; contactpersoon vastleggen |

De juridische teksten zijn een concept van ons en geen juridisch advies. De eigenaar laat ze
voor de livegang controleren.

## 3.9 Back-ups en herstel

- **Testfase:** de database staat in `%LOCALAPPDATA%\LaCaletaApp\pglite`, bewust buiten
  OneDrive (OneDrive vergrendelt bestanden tijdens het synchroniseren en beschadigt een
  draaiende database). In het beheer: **Back-up downloaden** (`.tar.gz`) en per tabel een CSV.
  Die back-up mag wel in OneDrive. Terugzetten: app stoppen, map hernoemen, back-up uitpakken,
  starten. Zelfde werkwijze als de Wesley-app.
- **Productie (later):** elke nacht een versleutelde `pg_dump` naar een tweede EU-locatie,
  30 dagen bewaard; de foto-map in dezelfde back-up.
- Hersteltest: bij de oplevering en daarna elk kwartaal een back-up terugzetten.
- Alle schemawijzigingen via migraties in git; nooit met de hand.

## 3.10 Externe integraties

| Integratie | Status | Aanpak |
| --- | --- | --- |
| Websiteformulier | gebouwd, nog op Web3Forms | in fase 4 een endpoint; omzetten na jouw akkoord, met terugval op mailto |
| Reserveringsplatform | geen gevonden | adapter-interface; koppelen als La Caleta een platform met API kiest |
| E-mail | testfase: lokale outbox | bij livegang SMTP of maildienst, DNS-records op lacaleta.nl |
| Web Push | gratis | VAPID-sleutels op de server; werkt op localhost |
| Mollie | na keuze en voorwaarden | betalingen, webhook, terugbetalen; cadeaubon pas uitgeven na status `paid` |
| Google Business, Instagram | buiten scope | alleen links |

## 3.11 Kosten

**Testfase: € 0.** Geen hosting, geen database-abonnement, geen maildienst, geen
betaalprovider. Alles draait op deze computer met gratis software (Node.js, PostgreSQL via
PGlite, Web Push).

Pas bij livegang, na jouw akkoord, komen er keuzes met kosten: een EU-server met HTTPS, een
maildienst of de SMTP van lacaleta.nl, en Mollie (alleen per transactie).

## 3.12 Prestaties en kwaliteit

- Doel op een middenklasse telefoon via 4G: eerste weergave onder 2 seconden, interactie
  (INP) onder 200 ms, CLS onder 0,1.
- Foto's via de Next.js-afbeeldingscomponent in WebP met `srcset`; de boog via CSS, geen extra
  beeld.
- Fonts lokaal, alleen de gebruikte gewichten, met `font-display: swap`.
- Toegankelijkheid: WCAG 2.2 AA als ondergrens; doelgrootte minimaal 44 px; alle animatie uit
  bij `prefers-reduced-motion`; werkt met toetsenbord en schermlezer (getest in fase 6).
