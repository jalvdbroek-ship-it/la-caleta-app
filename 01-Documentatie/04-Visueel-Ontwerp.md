# 4. Visueel ontwerp

De app is hetzelfde merk als de website, maar dan in je hand. Alles wat de website al besliste
(kleur, letter, boog, toon) blijft staan. Nieuw is alleen wat een app nodig heeft: de ledenkaart,
navigatie met de duim en snelle beheerschermen.

## 4.1 Thesis: "La puerta de La Caleta"

De Andalusische boog was op de website het venster waardoor je naar binnen keek. In de app is
het de **deur**: de ledenkaart is een bordeaux kaart met een boogvormige opening, en in die
opening staat de QR-code. Wie zijn kaart laat scannen, houdt letterlijk de deur van La Caleta
omhoog. Dat is het enige opvallende element. De rest is rustig: crème papier, rechte lijnen,
echte gerechten.

## 4.2 Kleur

Alle websitetokens blijven ongewijzigd. Nieuw: *vino* en *oro*. Gemeten met
`node tools/contrast.mjs` (22 paren, alle WCAG AA).

| Token | OKLCH | Rol | Gemeten |
| --- | --- | --- | --- |
| espresso | 0.2 0.018 50 | kopbalk, onderbalk, zijbalk beheer, donkere hero | crema erop 16,6 |
| espresso-2 | 0.255 0.024 48 | verhoogd vlak op donker | cobre erop 7,2 |
| crema | 0.968 0.014 85 | papier: hoofdachtergrond gastenapp | tinta erop 15,5 |
| arena | 0.925 0.028 78 | tweede papier, werkvlak beheer | tinta-2 erop 6,3 |
| tinta / tinta-2 | 0.23 0.022 50 / 0.44 0.03 50 | tekst / gedempte tekst op licht | 15,5 / 7,2 |
| terracota | 0.5 0.13 40 | links en focusring op licht | 5,8 |
| cobre | 0.76 0.1 62 | koper: accent en focusring op donker, actieve tab | 8,3 op espresso |
| rojo | 0.47 0.17 27 | **alleen** de primaire actie "Reserveer" | crema erop 6,8 |
| **vino** | 0.32 0.1 14 | bordeaux: La Caleta Club, ledenkaart, ledenaanbiedingen | crema erop 12,1 |
| **vino-2** | 0.38 0.12 16 | hoogtepunt op de kaart | oro erop 6,1 |
| **oro** | 0.82 0.09 78 | fijne gouden lijn en tekst op bordeaux en espresso | 7,6 op vino |

Regels: rood is reserveren, bordeaux is de Club, goud alleen als lijn of klein label op bordeaux.
Geen kleurverlopen, behalve het donkere waas onder tekst op foto's.

## 4.3 Typografie

| Rol | Letter | Gebruik |
| --- | --- | --- |
| Display | Cormorant Garamond 500 en 500 cursief | begroeting, paginatitels, gerechtnamen in detail, puntensaldo |
| Tekst en UI | Jost 300, 400, 500 | alles wat gelezen of aangetikt wordt; prijzen met tabulaire cijfers |
| Logo | Dancing Script | alleen het woordmerk "La Caleta" |

Spaanse begroetingen (*Buenas tardes*, *¡Salud!*) staan cursief in Cormorant, de uitleg altijd
in het Nederlands. Basisgrootte 17 px in de gastenapp (ouderen), 15 px in het beheer.

## 4.4 Vorm, ruimte en materiaal

- **Radius 0** op knoppen, velden en vlakken, zoals de website. De enige rondingen zijn de boog
  (foto's, ledenkaart) en het open-bolletje.
- **Geen kaartjes met schaduw.** Groeperen met witruimte en 1 px lijnen. Alleen echte objecten
  zijn een vlak: de ledenkaart, een gerecht dat je opent (sheet), een reservering.
- **Eén kolom van maximaal 30 rem** op de telefoon, 4 px-raster (4/8/12/16/24/32/48).
  Vanaf 900 px een zijbalk en een tweede kolom; de inhoud blijft op dezelfde rail.
- **Doelgrootte** minimaal 44 × 44 px. De onderbalk is 64 px plus de veilige zone van de iPhone.
- **"Nog in te vullen"**: stippelrand in koper met het label "In te vullen door La Caleta". Eén
  herkenbare vorm voor alles wat de eigenaar nog moet aanleveren.
- **"Voorbeeld"**: een klein label op alle voorbeeldinhoud in de preview (beloningen,
  evenementen, testleden).

## 4.5 Beeld

- Grote sfeerbeelden in de boog op Home en bij Experiencias; gerechten liggend 3:2 in de
  kaart, alleen als er echt een foto van dat gerecht of die categorie is.
- De preview gebruikt de foto's van de website. De meeste zijn **tijdelijk stockbeeld**
  (`BEELD.md` van de website). Voor de livegang: eigen foodfotografie, met dezelfde
  bestandsnamen.
- Onder tekst op een foto ligt een espresso-waas van onder naar boven, zodat de tekst altijd
  minimaal 4,5:1 haalt.

## 4.6 Beweging (GSAP 3.15.1)

| Moment | Wat | Duur |
| --- | --- | --- |
| Ledenkaart openen | de boog opent van onder naar boven (clip-path), daarna komt de QR erin | 0,7 s |
| Punten erbij (realtime) | het saldo telt op, een gouden lijn loopt over de voortgangsbalk | 0,9 s |
| Wisselen van scherm | inhoud schuift 8 px in en vervaagt in | 0,3 s |
| Gerecht openen | sheet schuift van onder omhoog, achtergrond dimt | 0,35 s |
| Reservering verstuurd | het vinkje tekent zich, samenvatting komt in beeld | 0,5 s |

Geen fade-up op elke sectie, geen hover-lift, geen automatisch draaiende carrousels. Bij
`prefers-reduced-motion` zijn alle overgangen direct en telt het saldo niet op.

## 4.7 Beheerpaneel

Zelfde merk, andere taak: snel en foutloos tijdens de service.

- Espresso zijbalk met het woordmerk, crème en zand als werkvlak, Jost voor alles; Cormorant
  alleen voor de paginatitel.
- Tabellen met lijnen en tabulaire cijfers, geen tegels met grote getallen zonder betekenis.
  Het overzicht "Vandaag" toont wat er nu moet gebeuren: aanvragen die wachten, de
  reserveringen van vandaag, scans.
- **Scannen** is één grote knop die direct de camera opent; het resultaat is groot leesbaar
  (naam, punten erbij, nieuw saldo, beschikbare beloning) zodat de medewerker het aan de gast
  kan laten zien.
- Rechten zijn zichtbaar: onderdelen zonder recht staan niet in het menu; een actie die
  goedkeuring vraagt, zegt dat vooraf.

## 4.8 App-icoon en installatie

Voorstel: de boog in koper op espresso met een kleine "LC" in Dancing Script. In de preview als
SVG; voor de livegang als PNG 192, 512 en maskable. Splashscherm espresso met het woordmerk.

## 4.9 Bewust vermeden

- Glazen kaarten, neon, paarse kleurverlopen, standaard-dashboardtegels.
- Pop-ups die om een account vragen voordat je de kaart ziet.
- Verzonnen cijfers, reviews of "populair"-labels. Wat er staat, komt uit de kaart of van de
  eigenaar.
- Emoji in de interface; één iconenfamilie (Lucide, zoals de website).
