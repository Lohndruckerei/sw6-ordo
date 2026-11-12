# Recherche: Online-Druckereien und Workflow-Software

Stand: 2026-11-12 · nur öffentliche Quellen, nichts bestellt. Unsicheres ist mit (?) markiert.

## 1. Bestellverlauf bei Online-Druckereien

| Anbieter | Auffällig |
|---|---|
| **WIRmachenDRUCK** | Nummerierte Statuskette im Konto, blockierende Status mit Zusatz „(Auftrag verzögert sich)“: Neu → Warten auf Bezahlung → Keine Druckdaten → Druckdaten fehlerhaft → Warten auf Druckfreigabe → Produktion (Rechnung im Anhang) → Versendet; dazu Storniert und Qualitätssicherung. Korrekturabzug bei gebuchter Qualitätskontrolle oder hohem Auftragswert. |
| **FLYERALARM** | Upload nach der Bestellung im Konto, automatischer Basis-Check inklusive, Profi-Datencheck kostenpflichtig, optional „manuelle Druckfreigabe“. Lieferzeit läuft ab Werktag nach Daten **und** Zahlung vor Annahmeschluss, sonst +1 Werktag. Storno nur bis „Daten gehen in Druck“, Änderungen pauschal kostenpflichtig. Nachreichfrist ca. 7–10 Tage (?). |
| **Digitaldruck-Fabrik** | Automatische Prüfung sofort beim Upload (Standard/Profi), Autokorrekturen, Mail mit Fehlerbeschreibung. Upload auch per Mail mit Bestell- und **Positions-ID**. Status je Position; „Druckdaten in Druck“ = Point of no Return. Vorkasse: Produktion ab Wertstellung. Rechnung als PDF zur Bestellbestätigung. |
| **Probo** | Reiner B2B-Anbieter; sauber dokumentierte API-Status: accepted / not_accepted → in_production → logistics → shipment_created → in_transit / delayed / delivered, plus Webhooks. |
| **SAXOPRINT** | Fehlerprotokoll per Mail und im Konto, PDF-Proof mit Freigabe im Konto, nachträglich online bezahlen. |

**Typische Kette:** Bestellung → (Warten auf Zahlung) → Daten fehlen → Datencheck → (fehlerhaft ↺) →
(Warten auf Freigabe) → In Produktion (Point of no Return) → Versandvorbereitung → Versendet → Zugestellt.

**Übernommen in Ordo/Proba:** Status je Position; blockierende Status mit Grund und Handlungsknopf für den
Kunden; Termin = nächster Werktag nach max(Daten/Freigabe, Zahlung) vor Annahmeschluss, automatische
Neuberechnung mit Mitteilung; „Daten später hochladen“ und Zuordnung per Positions-ID; Prüfung sofort
beim Upload mit Fehlerprotokoll; optionale Freigabe/Korrekturabzug mit Protokoll; nachträglich bezahlen
per Link; Self-Service bis zum Point of no Return; Tracking-Mail je Paket; Statuscodes und Webhooks für
Wiederverkäufer (später).

Quellen: wir-machen-druck.de/statusinformationen.html · flyeralarm.com/blog/de/datenupload-bei-flyeralarm/ ·
flyeralarm-AGB Unternehmer (PDF) · digitaldruck-fabrik.de/kundenservice/bestellung-produktion.aspx ·
apidocs.proboprints.com/guides/order-status · saxoprint.de/service-und-hilfe/faq

## 2. Workflow- und Produktionssoftware

| Software | Kategorie | Idee für uns |
|---|---|---|
| Printplus, Keyline, Optimus, Theurer, Lead Office, PrintVis, EFI Pace | Print-MIS | Jobticket als zentrales Objekt, Laufzettel mit Barcode, Betriebsdatenerfassung je Arbeitsgang, Plantafel je Station |
| Infigo, OnPrintShop, Pressero/Aleyant | Web-to-Print | Proof-Freigabe per Link mit Versionen, Sofort-Preflight beim Upload, Weiterleitung an Partner-Druckereien (?) |
| Enfocus Switch + PitStop, callas pdfToolbox | Preflight/Workflow | regelbasiertes Routing über Metadaten, Prüfprofile, Prüfbericht, „Checkpoint“ für manuelle Freigabe; callas per CLI aus PHP nutzbar |
| Caldera, Onyx, Asanti, Fiery | RIP Großformat | Nesting/Sammelformen nach Material, Schneidmarken + Barcode für Schneidetische, Hotfolder je Material |
| Pickware ERP/Shipping, Sendcloud, Shipcloud | Shopware-Umfeld | Picklisten, Labels mehrerer Dienstleister, Tracking zurück in die Lieferung |

**Bedienung in der Produktion:** Vollbild je Station, Scan-to-Start/Finish, große Knöpfe (≥ 48–64 px),
Ampel nach Termin, Sortierung nach Fälligkeit, „Problem melden“, Etikettendruck beim Statuswechsel,
jede Aktion protokolliert.

## 3. Shopware 6.7 – nutzen statt nachbauen

State Machines (Bestellung, Zahlung, Lieferung; auch für eigene Entities), Dokumente (Rechnung,
Lieferschein, Gutschrift, Storno; E-Rechnung ZUGFeRD/XRechnung seit 6.6.10), Flow Builder (eigene
Ereignisse und Aktionen), Rule Builder, ACL-Rollen, Bestellbearbeitung mit Versionen, Mail-Templates,
Message Queue, Scheduled Tasks. Shopware Commercial (Angebote, B2B) ist lizenzpflichtig – vor
Eigenentwicklung prüfen, ob vorhanden.

## 4. Rechtliches

- **E-Rechnung B2B:** Empfang seit 01.01.2025 Pflicht; Ausstellung ab 01.01.2027 für Unternehmen mit
  Vorjahresumsatz > 800.000 €, ab 01.01.2028 für alle. Formate EN 16931 (XRechnung, ZUGFeRD ≥ 2.0.1,
  nicht MINIMUM/BASIC-WL). Diskussion über Verschiebung (?).
- **GoBD:** Bei E-Rechnungen ist das XML das Original; Buchungsbelege 8 Jahre, Geschäftsbriefe 6 Jahre;
  keine Änderung erstellter Dokumente (Korrektur nur per Storno/Gutschrift); Verfahrensdokumentation.
- **DATEV:** DATEV-Format (EXTF-CSV „Buchungsstapel“, Zeichensatz prüfen) + Belege; Online-APIs
  (Rechnungsdatenservice/Belege online) nur mit DATEV-Partnerschaft.

Quellen: developer.datev.de/datev/platform/en/dtvf · ihk.de (E-Rechnung, BMF-Schreiben 15.10.2024 und
15.10.2025) · xictron.com (Shopware ZUGFeRD) · developer.shopware.com/docs
