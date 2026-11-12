# 1. Onderzoeksrapport: La Caleta, The Guest Experience

Stand: 12 november 2026. Fase 1 van de opdracht.

## 1.1 Wat er onderzocht is

| Bron | Pad of adres | Gebruikt voor |
| --- | --- | --- |
| De website die wij voor La Caleta bouwden (Astro 7) | `01-Websites-Klanten/Restaurant-La-Caleta` | **Primaire bron.** Merk, kleuren, typografie, foto's, hele kaart, acties, openingstijden, reserveringsregels |
| De gegevens van die site | `src/data/site.ts` | Alle feiten, gerechten en prijzen (overgetypt van de kaartscans, gecontroleerd op 11-11-2026) |
| Ontwerpnotitie, opdracht, beeldlijst | `DESIGN.md`, `OPDRACHT.md`, `BEELD.md` | Art direction, bron per feit, licenties van de foto's |
| Redesignplan | `website-la-caleta/.gg/plans/la-caleta-redesign.md` | Keuzes en openstaande punten |
| Social media-portfolio | `website-la-caleta/social-media/` | Toon, bijschriften, wat de klant nog moet bevestigen |
| Prospectdossier | `07-Onderzoek-En-Strategie/Klanten-Trekken/PROSPECT 10 Restaurant La Caleta Rozenburg.md` | Achtergrond (Google-score, kanalen, reserveringen via derden) |
| Eerdere app van ons | `05-Spellen-En-Apps/Wesleys-Ambacht-App` | Bewezen werkwijze: Next.js, PostgreSQL, rollen, back-up |
| Eet.nu-vermelding | eet.nu/rozenburg-zh/la-caleta, bekeken 12-11-2026 | Reserveringskanaal, openingstijden keuken |
| TheFork | thefork.nl | Niet te controleren (de site weigert automatische opvragingen, HTTP 403) |
| lacaleta.nl (Weebly) | lacaleta.nl | Gaf bij opvragen alleen de paginatitel; de inhoud staat al in `site.ts` |

Live preview van onze website: https://0xtsotsi.github.io/la-caleta/ . De website blijft
ongewijzigd; de app is een eigen project.

## 1.2 Het bedrijf (vastgesteld)

| Feit | Waarde | Bron |
| --- | --- | --- |
| Naam | Restaurant La Caleta, "Cocina de España en tu mesa" | site.ts, menukaart |
| Adres | Raadhuisplein 4a, 3181 CG Rozenburg | lacaleta.nl, Eet.nu |
| Telefoon, e-mail | 0181 - 214342, info@lacaleta.nl | lacaleta.nl |
| KvK | 24452536 | OPDRACHT.md |
| Open | wo t/m za vanaf 11:00, zo vanaf 16:00, ma en di gesloten | lacaleta.nl, Google, Eet.nu |
| Keuken | lunch 11:00 tot 17:00, diner 17:00 tot 21:30 (zo 16:00 tot 21:30) | Eet.nu, tapaskaart |
| Tapasdag | wo en do, €34,50 p.p., 32 tapas, inloop 17:00 tot 20:00, max. 2 tapas p.p. per ronde | tapaskaart |
| Seniorenmenu | €28,50, drie gangen | lacaleta.nl/acties |
| 12-uurtje | €14,50 | lunchkaart |
| Niños (tapasdag) | €15,50, 3 tot 10 jaar | tapaskaart |
| Groepen, afhuren, speciaal dieet, cadeaubon (bedrag naar keuze) | aangeboden | menukaart-04 |
| VVV-cadeaukaart, gratis parkeren | ja | lacaleta.nl |
| Familiebedrijf | vader droeg na 17 jaar over aan dochter | welkomstkaart, lacaleta.nl |
| Award | Verkiezing Leukste Restaurant 2018, Gold Award | foto oorkonde |

## 1.3 Merkidentiteit (uit de website, wordt overgenomen)

- **Woordmerk:** "La Caleta" in Dancing Script, met "Spaans restaurant in Rozenburg" eronder.
  Er is geen los logobestand; het merk bestaat als letter. Een app-icoon moet nog ontworpen
  worden (voorstel in het visueel ontwerp).
- **Thesis website:** "Sobremesa in Cádiz". Espresso als basis, crème en zand als papier,
  koper als licht, het La Caleta-rood alleen voor "Reserveer".
- **Signatuur:** de Andalusische boog (*arco*), foto's in een boogvorm. Daarnaast een
  azulejo-tegelband in de footer.
- **Typografie:** Cormorant Garamond (koppen), Jost (tekst en UI), Dancing Script (alleen logo).
  Lokaal gehost via `@fontsource`.
- **Kleur:** OKLCH-tokens in `src/styles/global.css`, alle paren gemeten op WCAG AA.
- **Fotografie:** de foodfoto's en sfeerbeelden zijn **tijdelijke Pexels-stockbeelden**
  (`BEELD.md`). Eigen foto's van het restaurant zijn klein en laag van resolutie
  (interieur, gevel, team 2018, oorkonde).

**Afwijking van de briefing:** de briefing vraagt "diep bordeauxrood en subtiele goudaccenten".
De website gebruikt koper in plaats van goud en een helder rood. Voorstel: de app neemt alle
websitetokens over en voegt er twee aan toe: *vino* (bordeaux) voor de La Caleta Club en
*oro* (licht goud) voor fijne lijnen op bordeaux. Zo blijft de app herkenbaar als hetzelfde merk.

## 1.4 De menukaart

De hele kaart staat als tekst in `site.ts` en gaat één-op-één als startinhoud de database in.

| Onderdeel | Aantal gerechten | Prijzen |
| --- | --- | --- |
| Lunch en 12-uurtje | 20 + 1 | ja |
| Salades en lunchplanken | 7 | ja |
| Entremeses (voorgerechten) | 13 | ja |
| Tapas à la carte | 15 | ja |
| Tapasdag koud / warm | 8 / 24 | vaste prijs €34,50 p.p. |
| Grill | 14 | ja, deels per gewicht |
| Vis en vegetarisch | 6 | ja |
| Paella | 3 | ja, vooraf bestellen |
| Kindermenu | 4 (+ Niños tapasdag) | ja |
| Desserts en ijs | 13 | ja |
| Koffie speciaal | 9 | ja |
| Wijn en sangria | 10 + 4 | ja |

- **Dieetkenmerken:** per gerecht staat vegetarisch, vis, vlees of kip. Dat is afgeleid van de
  kaart, niet door de keuken bevestigd.
- **Allergenen: niet beschikbaar.** De kaartscans noemen geen allergenen. De app toont per
  gerecht "Allergenen nog niet opgegeven, vraag de bediening" tot de keuken de 14 EU-allergenen
  invult in het beheerpaneel. Liever geen informatie dan een gok.
- **Nieuwe gerechten:** er is geen bron die zegt wat nieuw is. Het beheerpaneel krijgt een
  vinkje "Nieuw op de kaart"; tot dan blijft dat blok op de homepage verborgen.

## 1.5 Reserveren: wat wordt er nu gebruikt?

| Kanaal | Bevinding | Status |
| --- | --- | --- |
| Telefoon 0181 - 214342 | Het enige kanaal dat lacaleta.nl noemt (de knop "reserveren" opent het nummer) | in gebruik |
| E-mail info@lacaleta.nl | Werkt, geen vast proces | in gebruik |
| Onze website `/reserveren/` | Formulier in drie stappen, tijdsloten uit de openingstijden, max. 12 personen online. Verstuurt via Web3Forms naar info@lacaleta.nl. **De Web3Forms-sleutel is nog niet aangemaakt** (er is geen `.env`), dus nu opent het formulier een vooringevulde e-mail | gebouwd, nog niet actief |
| Eet.nu | Vermelding met recensies (9,1), menukaart en openingstijden. **Geen reserveerknop** bij controle op 12-11-2026 | geen reserveringen gevonden |
| TheFork | Het prospectdossier noemt TheFork; de pagina was niet op te vragen (HTTP 403) | onbevestigd |

**Conclusie.** Er is geen online reserveringssysteem waarmee we betrouwbaar kunnen koppelen:
geen API en geen widget met beschikbaarheid. Het "bestaande systeem" is de telefoon en de
mailbox, plus ons websiteformulier dat nog aangezet moet worden. Een tweede, los systeem naast
de website zou de dubbele administratie opleveren die de briefing wil voorkomen.

**Voorstel** (zie functioneel ontwerp §2.4 en de vraag aan het eind): één gedeelde
reserveringsinbox in de backend van de app. Het websiteformulier en de app sturen er allebei
naartoe, het personeel bevestigt in het beheerpaneel, de gast krijgt een bevestiging en een
herinnering. Er komt een *adapter* tussen, zodat een echt platform (bijvoorbeeld TheFork Manager,
Zenchef of Formitable) later in de plaats kan komen zonder de app om te bouwen. Gebruikt La Caleta
toch al zo'n platform, dan koppelen we daaraan in plaats van aan de inbox.

## 1.6 Acties, evenementen en cadeaubonnen

- **Echte, terugkerende acties:** tapasdag, seniorenmenu, 12-uurtje, groepen, afhuren, dieet,
  cadeaubon, VVV-cadeaukaart. Deze gaan als startinhoud in de app.
- **Evenementen:** het dossier noemt Koningsdag 2026 (met Crazy Company) en Nieuwjaar, de oude
  fotogalerij Paasbrunch, Moederdag en Valentijnsdag. Datums, prijzen en beschikbaarheid van
  komende evenementen zijn **onbekend**. De module Experiencias start leeg; de preview toont
  duidelijk gemarkeerde voorbeelden.
- **Cadeaubon:** "met een bedrag naar keuze" staat op de kaart. Vaste bedragen, geldigheid en
  online betalen zijn niet bekend. Betaalprovider en voorwaarden worden eerst vastgesteld
  (briefing §4F).
- **Loyaliteit:** er is geen bestaand spaarprogramma, stempelkaart of klantenbestand gevonden.

## 1.7 Gasten en gebruik

- Gasten uit Rozenburg en omgeving, vaak op de telefoon en vaak kort van tevoren. Ook ouderen
  (seniorenmenu), gezinnen (Niños) en groepen.
- Publieke kanalen: Google (4,4 uit 364 reviews op 1 november 2026), Facebook (± 1.500 volgers),
  Instagram (± 333 volgers), Eet.nu (9,1).
- Gevolg voor de app: kaart en reserveren werken zonder account, de Club is een aanbod en geen
  drempel, tekst is groot en duidelijk, en installeren als app is een keuze.

## 1.8 Ontbrekende gegevens: in te vullen door La Caleta

Deze punten zijn in de app zichtbaar als "Nog in te vullen" en in het beheerpaneel aanpasbaar.
Zonder antwoord gaat de betreffende functie niet live.

| # | Wat | Nodig voor |
| --- | --- | --- |
| 1 | Spaarregels: punten per bezoek of per euro, minimale besteding, maximum per dag | Club |
| 2 | Beloningen en bij hoeveel punten ze vrijkomen | Club |
| 3 | Verjaardagscadeau: wat, en hoe lang geldig | Club |
| 4 | Ledenaanbiedingen en de voorwaarden van de Club | Club, juridisch |
| 5 | Of punten vervallen, en na hoe lang | Club, voorwaarden |
| 6 | Allergenen per gerecht (14 EU-allergenen) | Menukaart, informatieplicht |
| 7 | Welke gerechten nieuw zijn; actuele prijzen (datum scans onbekend) | Menukaart |
| 8 | Komende evenementen: titel, datum, prijs, plaatsen | Experiencias |
| 9 | Cadeaubon: vaste bedragen, geldigheid, betaalprovider, btw-behandeling | Cadeaubonnen |
| 10 | Reserveren: gebruikt La Caleta een platform (TheFork, Eet.nu)? Wie bevestigt, hoe snel? | Reserveren |
| 11 | Eigen foto's in hoge resolutie (de stockbeelden zijn tijdelijk) | Hele app |
| 12 | Jaar van overdracht (2024 of december 2023), "sinds 2007", sluitingstijd 22:00 | Info |
| 13 | Social-URL's bevestigen | Info |
| 14 | Wie krijgt toegang tot het beheerpaneel, met welke rol | Rechten |
| 15 | Afzenderadres voor e-mail (bijv. club@lacaleta.nl) en toegang tot de DNS van lacaleta.nl | E-mail, domein |

## 1.9 Risico's en aandachtspunten

- **Naamverwarring:** "Restaurante La Caleta" op Tenerife is een ander restaurant (ook op
  TheFork en Dinnersite). Gebruik nooit gegevens of reviews daarvan.
- **Stockbeeld:** de app gaat niet live met stockfoto's die lijken alsof ze uit de eigen keuken
  komen. Eigen fotografie is een voorwaarde voor livegang.
- **Klein team** (2 tot 5 medewerkers volgens het dossier): beheer moet in een paar tikken kunnen,
  ook tijdens de service. Een ledenkaart scannen mag niet langer duren dan afrekenen.
- **iPhone-pushmeldingen** werken alleen als de gast de app op het beginscherm zet (iOS 16.4 en
  hoger). E-mail blijft daarom het hoofdkanaal voor bevestigingen.
- **Misbruik van punten:** zonder controle kan een medewerker of gast punten aanmaken. Het
  ontwerp gaat uit van een onveranderlijk puntenregister met rechten en limieten (technische
  architectuur §3.5).
