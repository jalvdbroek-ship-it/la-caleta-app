# 5. Gefaseerde ontwikkelplanning

Elke fase eindigt met iets dat je kunt bekijken en goedkeuren. Een volgende fase begint pas na
jouw akkoord. Duur in werkdagen voor één ontwikkelaar, indicatief.

| Fase | Inhoud | Klaar als | Duur |
| --- | --- | --- | --- |
| **1. Onderzoek** | website, merk, kaart, kanalen, ontbrekende gegevens | `01-Onderzoeksrapport.md` | klaar |
| **2. Productontwerp** | functioneel ontwerp, visueel ontwerp, interactieve preview gast + beheer | `02`, `04`, `02-Preview/` | klaar, akkoord 12-11-2026 |
| **3. Technische uitwerking** | Next.js-project in `04-App/`, PostgreSQL (PGlite lokaal, buiten OneDrive) met Drizzle-migraties, databaserollen en triggers, eigen auth (scrypt, sessies, inloglink, TOTP voor medewerkers), rechtenmatrix, QR-token, lokale e-mail-outbox, versies vastpinnen | migraties draaien lokaal; tests voor punten en rechten groen | 3 tot 4 |
| **4. MVP** | Home, accounts, menukaart met beheer, reserveringsinbox (app + website-endpoint), Club met ledenkaart en QR, scannen en punten, beheer (vandaag, scannen, reserveringen, leden, menukaart, spaarsysteem, medewerkers, auditlog), PWA installeerbaar | werkt op een testdomein met testaccounts; jij kunt een volledige avond naspelen | 10 tot 14 |
| **5. Uitbreiding** | beloningen inwisselen, verjaardagscadeau, experiencias met aanmelden en wachtlijst, acties en ledenaanbiedingen, meldingen (push + e-mail, doelgroepen), cadeaubonnen (aanvraag; betalen na keuze Mollie) | alle modules uit de briefing werken | 8 tot 10 |
| **6. Testen** | unit- en databasetests, Playwright-stromen op telefoon, tablet en desktop, rechtenmatrix per cel, misbruikscenario's, offline, toegankelijkheid (toetsenbord, schermlezer, zoom), prestaties op 4G, beveiligingscontrole (headers, RLS, rate limits), hersteltest back-up | testrapport zonder open blokkades | 4 tot 5 |
| **7. Livegang** | domein `app.` en `beheer.lacaleta.nl`, DNS voor e-mail, productieproject, eigen foto's, privacyverklaring en voorwaarden, korte handleiding en uitleg aan het team, eerste back-up | gasten kunnen installeren en lid worden | 2 tot 3 |

## Voorwaarden van jouw kant (per fase)

| Voor fase | Nodig |
| --- | --- |
| 3 | geregeld op 12-11-2026: ontwerp goedgekeurd, gedeelde reserveringsinbox, eigen PostgreSQL, testfase zonder kosten |
| 4 | punten 1, 2 en 10 uit het onderzoeksrapport (§1.8) of akkoord om met voorbeeldwaarden te bouwen |
| 5 | punten 3, 4, 8 en 9; keuze voor betalen (Mollie) als cadeaubonnen online betaald moeten worden |
| 7 | allergenen (6), eigen foto's (11), juridische teksten getoetst, toegang tot DNS van lacaleta.nl (15), lijst medewerkers (14), en akkoord op hosting en e-mail (de eerste kosten) |

## Testfase zonder kosten

Fase 3 tot en met 6 draaien op deze computer: geen hosting, geen abonnementen, geen
maildienst. E-mails komen in een outbox in het beheer en gaan niet naar echte mensen. De app is
alleen met testaccounts te gebruiken tot fase 7.

## Wat bewust niet in de MVP zit

- Online betalen (briefing §4F: pas na keuze provider en voorwaarden).
- Koppeling met een kassasysteem (punten per euro worden ingetikt door de bediening).
- Native apps in de stores.
- Meertaligheid (de app is Nederlands met Spaanse accenten; Engels kan later).

## Hoe de website intact blijft

De website in `01-Websites-Klanten/Restaurant-La-Caleta` wordt niet aangeraakt tot jij het
omzetten van het reserveringsformulier goedkeurt. Dan verandert er één ding: het adres waar het
formulier naartoe post. Al het andere blijft gelijk.
