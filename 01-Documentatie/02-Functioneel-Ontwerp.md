# 2. Functioneel ontwerp

Wat de app doet, voor wie, en welke regels gelden. De interactieve preview (`02-Preview/`) laat
elk scherm uit dit document zien.

## 2.1 Gebruikers en rollen

| Rol | Wie | Toegang |
| --- | --- | --- |
| Bezoeker | iedereen met de link of de geïnstalleerde app | Home, menukaart, reserveren, experiencias bekijken, cadeaubon, info. **Geen account nodig.** |
| Lid | gast met een La Caleta Club-account | Daarnaast: ledenkaart met QR, punten, historie, beloningen, verjaardagscadeau, ledenaanbiedingen, aanmelden voor experiencias, profiel |
| Bediening | medewerker | Beheer: scannen en punten toekennen (binnen limieten), reserveringen bevestigen, aanmeldingen zien |
| Bedrijfsleider | vaste kracht | Daarnaast: menukaart, experiencias, acties, meldingen, correcties op punten, leden inzien |
| Eigenaar | Sabrina / La Caleta | Alles, ook spaarregels, beloningen, medewerkers en rechten, export en auditlog |

Rechten zijn per onderdeel instelbaar (zie §2.9). De drie rollen zijn het startpunt.

## 2.2 Navigatie van de gastenapp

Onderbalk op telefoon, zijbalk vanaf tablet in liggende stand en desktop:

| Tab | Inhoud |
| --- | --- |
| **Home** | begroeting, Club-status, punten, vandaag open, aanbiedingen, experiencias, reserveren |
| **Kaart** | digitale menukaart |
| **Reserveer** | middelste, opvallende knop: reserveringsaanvraag |
| **Club** | ledenkaart, punten, beloningen, historie (of aanmelden als je geen lid bent) |
| **Meer** | experiencias, cadeaubon, profiel, info en contact, voorwaarden, privacy |

De vijf belangrijkste acties uit de briefing (reserveren, kaart, punten, beloningen,
evenementen) staan op Home binnen het eerste scherm of één tik verder.

## 2.3 Schermen gastenapp

### A. Home
- Begroeting volgens het tijdstip: *Buenos días* (tot 12:00), *Buenas tardes* (tot 18:00),
  *Buenas noches*. Met voornaam als je bent ingelogd.
- **Vandaag:** open of gesloten, berekend in de browser in Nederlandse tijd (zelfde logica als
  de website). Op wo en do: "Vandaag tapasdag".
- **Club-strook:** punten, voortgang naar de volgende beloning, knop "Toon ledenkaart".
  Niet ingelogd: één regel uitleg en "Word lid", nooit een pop-up.
- **Komende reservering** van het lid, met status (aangevraagd, bevestigd).
- **Nieuw op de kaart:** alleen zichtbaar als er gerechten als nieuw gemarkeerd zijn.
- **Aanbiedingen:** de echte acties (tapasdag, seniorenmenu, 12-uurtje) plus ledenaanbiedingen
  die de eigenaar aanmaakt. Ledenaanbiedingen zijn voor niet-leden zichtbaar met een slot, als
  reden om lid te worden.
- **Experiencias:** de eerstvolgende twee.
- **Reserveer een tafel:** altijd bereikbaar via de onderbalk.

### B. La Caleta Club
- **Aanmelden:** voornaam, e-mail, wachtwoord (of inloglink per e-mail), akkoord met de
  Clubvoorwaarden. Optioneel en los aan te vinken: nieuwsbrief per e-mail, pushmeldingen,
  verjaardag (alleen dag en maand). Klaar in één scherm, onder een minuut.
- **Inloggen:** e-mail + wachtwoord, of een inloglink per e-mail. Wachtwoord vergeten via
  e-mail. Na 5 mislukte pogingen een kwartier wachten.
- **Ledenkaart:** bordeaux kaart met de boog, naam, lidnummer, lid sinds, en de QR-code in de
  boog. De QR-code verandert elke 30 seconden, zodat een schermafbeelding niet werkt. Het scherm
  gaat naar volle helderheid niet automatisch (kan niet in een PWA); er staat een korte hint.
- **Punten:** saldo, voortgang naar de eerstvolgende beloning, "nog X punten".
- **Historie:** elke mutatie met datum, omschrijving en wie hem deed (bijvoorbeeld "Bezoek,
  +10"). Gasten zien nooit de naam van de medewerker, wel "La Caleta".
- **Beloningen:** lijst met puntenprijs. Beschikbaar of "nog X punten". Een beloning inwisselen
  doet de bediening bij de kassa na het scannen van de kaart (zo kan een gast niet thuis per
  ongeluk inwisselen). De gast ziet de inwisseling direct in de app.
- **Verjaardagscadeau:** als de verjaardag is ingevuld, staat het cadeau vanaf de ingestelde
  dag in de app en is het een ingestelde periode geldig. Eén keer per jaar.
- **Ledenaanbiedingen:** aanbiedingen met het label "Alleen voor leden".
- **Voorwaarden:** de tekst die de eigenaar instelt, met datum van de laatste wijziging.

### C. Digitale menukaart
- Categorieën als horizontale tabs, volgorde en namen uit het beheer (start: Lunch, Entremeses,
  Tapas, Tapasdag, Grill, Vis en vegetarisch, Paella, Niños, Postres, Koffie, Wijn en sangria).
- Zoeken op gerechtnaam en omschrijving.
- Filter op dieetkenmerk: vegetarisch, vis, vlees, kip; later ook "zonder gluten" enzovoort zodra
  allergenen zijn ingevuld.
- Gerecht openen: naam (Spaans), omschrijving (Nederlands), prijs, kenmerken, allergenen of
  "Allergenen nog niet opgegeven, vraag de bediening", foto als die er is.
- Notities van de kaart blijven staan (bijvoorbeeld "Paella graag vooraf bestellen").
- Werkt zonder account en offline (laatste versie wordt bewaard).

### D. Reserveren
Zelfde regels als het formulier op de website, uit dezelfde gegevens:

| Regel | Waarde |
| --- | --- |
| Gesloten dagen | maandag, dinsdag, en dagen die het restaurant in het beheer blokkeert |
| Tijdsloten | elk half uur vanaf opening, laatste slot 21:00 (keuken sluit 21:30) |
| Vandaag | niet later dan een uur van tevoren |
| Personen | 1 tot 12 online; meer dan 12: "Bel ons voor groepen" met belknop |
| Gegevens | naam, telefoon, e-mail (bij leden vooraf ingevuld) |
| Speciale wensen | vrij veld + vinkjes: paella vooraf, verjaardag, kinderstoel, rolstoel, dieet |

Stroom: **aanvraag** → het personeel bevestigt of stelt een andere tijd voor in het beheer →
de gast krijgt een **bevestiging** per e-mail (en push als die aan staat) → **herinnering** een
dag van tevoren (instelbaar) met "Kan het niet doorgaan? Annuleer". Tot de bevestiging staat er
eerlijk "Aangevraagd, u hoort binnen [instelbare tijd] van ons".

### E. Experiencias
- Lijst met kaarten: foto, titel, datum en tijd, prijs (of "Gratis" of niet getoond),
  beschikbaarheid ("Nog 6 plaatsen", "Vol, zet me op de wachtlijst").
- Detail: omschrijving, aanmelden met aantal personen. Aanmelden vraagt een account (de
  organisatie moet de gast kunnen bereiken), behalve als de eigenaar dat uitzet.
- Bevestiging en herinnering zoals bij reserveringen.
- Betaalde evenementen: eerst alleen "Aanmelden, betalen in het restaurant"; online betalen pas
  na de keuze van een betaalprovider.

### F. Cadeaubonnen
- Bedrag kiezen (vaste bedragen uit het beheer of vrij bedrag binnen grenzen), naam ontvanger,
  persoonlijke boodschap, voorbeeld van de bon.
- **Tot de betaalprovider vaststaat:** de knop wordt "Aanvraag versturen". La Caleta neemt contact
  op voor betaling, of de gast koopt de bon in het restaurant. De VVV-cadeaukaart wordt
  genoemd.
- **Daarna:** betalen met iDEAL en kaart, bon als PDF en in de app met een unieke code, saldo
  en geldigheid, inwisselen via het beheer (scannen van de boncode).

### Meer, profiel en privacy
- Profiel wijzigen, toestemmingen per kanaal aan en uit, verjaardag verwijderen.
- **Mijn gegevens downloaden** (JSON) en **account verwijderen** (punten vervallen, historie
  wordt geanonimiseerd voor de administratie).
- Info: adres, kaart, openingstijden, telefoon, gratis parkeren, VVV-cadeaukaart.
- App installeren: knop op Android en desktop; uitleg "Zet op beginscherm" op iPhone.

## 2.4 Reserveringen: één systeem voor website en app

```
Website /reserveren/ ─┐
                      ├─► Reserveringsinbox (database) ─► Beheer: bevestigen / ander tijdstip / weigeren
App Reserveer ────────┘            │                                   │
Telefoon (personeel voert in) ─────┘                                   ▼
                                                      E-mail + push naar gast, herinnering
```

- De website stuurt zijn bestaande formulier naar het nieuwe endpoint in plaats van naar
  Web3Forms. Tot dat is omgezet blijft de website werken zoals nu. De website zelf verandert
  pas als jij dat goedkeurt.
- Telefonische reserveringen kan het personeel in het beheer invoeren, zodat alles op één lijst
  staat. Dat is optioneel.
- **Adapter:** de code praat met een `ReserveringsKanaal`. Variant 1 is de eigen inbox. Variant 2
  kan een platform zijn als La Caleta dat kiest. Het scherm van de gast blijft gelijk.

## 2.5 Spaarsysteem (instelbaar door de eigenaar)

| Instelling | Mogelijkheden | Start in de preview (voorbeeld) |
| --- | --- | --- |
| Manier van sparen | per bezoek, per euro, of beide | per bezoek |
| Punten per bezoek | getal | 10 |
| Punten per euro | getal, afgerond naar beneden | 1 |
| Minimale besteding voor punten | bedrag | geen |
| Wachttijd tussen twee bezoeken | uren | 4 |
| Maximum punten per transactie | getal | 100 |
| Welkomstpunten bij aanmelden | getal | 0 |
| Punten vervallen | nooit, of na X maanden zonder bezoek | nooit |
| Beloningen | naam, omschrijving, puntenprijs, alleen leden, actief van/tot, max. per lid | 3 voorbeelden |
| Verjaardagscadeau | omschrijving, dagen geldig, vanaf hoeveel dagen lid | voorbeeld |
| Voorwaarden | vrije tekst met versie en datum | concepttekst |

Alle startwaarden in de preview zijn **voorbeelden** en dragen dat label, tot de eigenaar ze
vaststelt. Een wijziging van de regels geldt vanaf het moment van opslaan; oude transacties
veranderen niet. Elke wijziging komt in het auditlog.

## 2.6 Controle op misbruik

| Risico | Maatregel |
| --- | --- |
| Gast deelt een schermafbeelding van de QR | QR bevat een ondertekend token dat 30 seconden geldig is (plus 30 seconden speling) |
| Dubbel scannen of twee keer tikken | elke scan heeft een unieke sleutel; de database weigert een tweede boeking met dezelfde sleutel |
| Twee bezoeken kort na elkaar | wachttijd tussen bezoeken; daarbinnen alleen met bedrijfsleider-goedkeuring en reden |
| Medewerker geeft te veel punten | maximum per transactie; handmatige correcties alleen voor bedrijfsleider en eigenaar, altijd met reden |
| Medewerker geeft zichzelf punten | medewerker kan niet scannen op een lidaccount met hetzelfde e-mailadres; alle mutaties met naam van de medewerker in het auditlog |
| Gast wisselt in zonder bezoek | inwisselen alleen in het beheer, na scan |
| Punten wissen of terugdraaien | het register is onveranderlijk: correcties zijn nieuwe regels ("Correctie, -10, reden") |
| Ongewone patronen | dagoverzicht in het beheer: punten per medewerker, correcties, scans buiten openingstijd |

## 2.7 Meldingen

| Melding | Kanaal | Toestemming |
| --- | --- | --- |
| Reservering ontvangen, bevestigd, gewijzigd, herinnering | e-mail, push | nodig voor de dienst, geen marketing |
| Punten ontvangen, beloning bereikt | push (in-app altijd) | push aan |
| Verjaardagscadeau klaar | e-mail, push | lid heeft verjaardag ingevuld |
| Nieuwe experiencia, ledenaanbieding | e-mail, push | **alleen met aparte marketingtoestemming** |

Het beheer stuurt een melding naar een doelgroep (alle leden met toestemming, leden die X
maanden niet geweest zijn, leden die jarig zijn) en toont vooraf hoeveel mensen hem krijgen.
Maximaal één marketingmelding per week (instelbaar), zodat leden niet afhaken.

## 2.8 Beheerpaneel

| Onderdeel | Taken |
| --- | --- |
| Vandaag | reserveringen van vandaag, open aanvragen, scans en punten van vandaag, verjaardagen |
| Scannen | camera opent direct; bezoek boeken (en bedrag bij sparen per euro), beloning inwisselen, cadeaubon inwisselen; handmatig lidnummer als reserve |
| Reserveringen | inbox, bevestigen, ander tijdstip voorstellen, weigeren met bericht, telefonische reservering invoeren, dagen blokkeren |
| Leden | zoeken, profiel, saldo, historie, correctie met reden, account blokkeren |
| Spaarsysteem | regels, beloningen, verjaardagscadeau, voorwaarden |
| Menukaart | categorieën (naam, volgorde, zichtbaar), gerechten (naam, omschrijving, prijs, kenmerken, allergenen, nieuw, tijdelijk uitverkocht, foto) |
| Foto's | uploaden, bijsnijden naar boog en liggend, alt-tekst |
| Experiencias | aanmaken, publiceren, plaatsen, aanmeldingen, wachtlijst |
| Acties | aanbiedingen, alleen voor leden, periode |
| Meldingen | opstellen, doelgroep, inplannen, verstuurd-overzicht |
| Cadeaubonnen | aanvragen, uitgegeven bonnen, saldo, inwisselen |
| Medewerkers en rechten | uitnodigen, rol, rechten per onderdeel, toegang intrekken |
| Auditlog | alles wat er veranderd is, door wie, wanneer; filteren en exporteren |

## 2.9 Rechtenmatrix (start)

| Onderdeel | Bediening | Bedrijfsleider | Eigenaar |
| --- | --- | --- | --- |
| Scannen, bezoek boeken | ja | ja | ja |
| Beloning inwisselen | ja | ja | ja |
| Reserveringen | ja | ja | ja |
| Leden inzien | naam en saldo | ja | ja |
| Punten corrigeren | nee | ja, met reden | ja, met reden |
| Menukaart, foto's | nee | ja | ja |
| Experiencias, acties | nee | ja | ja |
| Meldingen versturen | nee | ja | ja |
| Cadeaubonnen | inwisselen | ja | ja |
| Spaarregels en beloningen | nee | nee | ja |
| Medewerkers en rechten | nee | nee | ja |
| Auditlog, export | nee | inzien | ja |

## 2.10 Lege, fout- en randtoestanden

- **Geen internet:** kaart, ledenkaart (laatst bekende QR met melding "offline, toon je
  lidnummer") en info werken; reserveren wordt bewaard en verstuurd zodra er weer verbinding is,
  met een duidelijke melding.
- **Nog niet ingevuld door La Caleta:** een herkenbaar blok met stippelrand "Nog in te vullen",
  in de preview; in productie verborgen voor gasten en zichtbaar in het beheer als taak.
- **Fouten** zeggen wat er gebeurde en wat de gast kan doen (bijvoorbeeld "Deze QR-code is
  verlopen. Vraag de gast de kaart opnieuw te openen.").
- **Dubbel versturen** van formulieren is uitgesloten: de knop wacht en de server controleert.
