# SOM – Auswertung

Stand: 2026-11-13 · Grundlage: SOM-Spiegel (Code + Datenbank `somsystem`, siehe SOM-SPIEGEL.md).
**SOM wird nicht nachgebaut.** Die Auswertung zeigt, wie heute gearbeitet wird, und dient nur als
Ideengeber für Ordo, Proba und Opus. Keine personenbezogenen Daten in diesem Dokument. Zugangsdaten werden hier bewusst nicht wiedergegeben.

## 1. Kurzfassung

SOM ist ein frei konfigurierbarer Leitstand: **Jeder Status ist ein „Arbeitsplatz“**. Positionen wandern
von Arbeitsplatz zu Arbeitsplatz; welcher der nächste ist, entscheiden **Regeln** über Auftrags- und
Positionsfelder. Automatische Arbeitsplätze („C“ im Namen) werden per Cron geleert und lösen dabei
Plugins aus (Mail, XML, Dateikopie, GLS-Label, Rechnungs-CSV). Daten liegen in einem generischen
Feldmodell (EAV, 326 Felder).

| Kennzahl | Wert |
|---|---|
| Aufträge pro Jahr | ca. 1.600 (2025: 1.611, 2026 bis Nov.: 1.492) |
| Positionen je Auftrag | ca. 2 |
| Arbeitsplatz-Wechsel je Position | ca. 28 (2026) – viele davon automatisch |
| Aktive Benutzer 2026 | 6 (11 angelegt) |
| Arbeitsplätze | 81, davon ~75 aktiv |
| Regeln | 107 Regeln, 202 Bedingungen |
| Lieferanten | 23 |
| Kundenmail-Vorlagen | 23 |
| Automatik-Jobs (Cron) | 22 |

## 2. Ablauf heute (vereinfacht)

```
Import aus Shopware (alle 5 Min.)
  → Auftrag → LD Auftrag (Terminbestätigung-Mail)
  → [Vorkasse?] LD C Vorkasse Mail … LD Vorkasse nach Daten/Artikelprüfung
  → [Sonderfälle] Keine Kundennummer · ACHTUNG prüfen/löschen · Warten auf Infos
  → LD Artikel prüfen
  → Datenprüfung je Produktart: Banner · Folienplott · PSP Platten/Rolle · SH Platte · Sonstige Platten · Rolle
       ↺ „Warten Daten …“ (Datenfehler-Mail, Erinnerung, Terminbestätigung geändert)
  → Datei-Manager (Druckdaten von final/ nach output/<Lieferant>/)
  ├─ extern: „LD <Lieferant> Versand“ → Bestellmail (vendor_order) → LD Bestellt / PSP Bestellt
  │          → PSP: XML-Datei, warten auf Paketlink (XML-Rückmeldung) → Versandmail
  └─ intern: LD Rip → Mimaki 160 A/B/C/D → Laminieren → Mimaki Plott / Hand schneiden / Wild
             → Verpackung → GLS Versand (Label) → GLS Paketlink senden (Versandmail)
  → LD C Verwaltung → Rechnung: Coloroprint Rechnung erzeugen/prüfen · PSP Rechnung · SH Rechnung prüfen
  → C Abschliessen automatik → Archiv
```

**Liegezeiten 2026 (Ø Stunden bis zum nächsten Wechsel, Arbeitsplätze mit ≥ 150 Durchläufen):**
Laminieren 19,1 · Mimaki 160 A/B/C/D 12–15 · Mimaki Plott 16,4 · Verpackung 10,0 · Rip 1,0 ·
Daten Rolle/PSP prüfen ~2 · PSP Bestellt 11,4 · PSP warten auf Paketlink 21,5 ·
Coloroprint Rechnung erzeugen 99,3 · PSP Rechnung 73,2. → Engpässe liegen in Druck/Laminieren und in der
Rechnungsstellung, nicht in der Datenprüfung.

## 3. Bausteine von SOM und ihr Platz im neuen System

| SOM | Was es tut | Neu |
|---|---|---|
| Arbeitsplätze + `workspace_order` | Status = Arbeitsplatz, Reihenfolge | Ordo: Positionsstatus (feste Hauptstufen) + **Stationen** in Opus (frei anlegbar); Lieferanten nicht mehr als eigene Arbeitsplätze, sondern als Ziel der Position (LieferLotse) |
| Regeln (UND zwischen Regeln, ODER innerhalb; Operatoren leer/nicht leer/gleich/enthält/<,≤,>,≥) | Routing + Sperre „Regel nicht erfüllt“ | Opus-Routing-Regeln und Ordo-Zuordnungsregeln mit denselben Operatoren, auf Mensura-Konfiguration statt Freitext-Feldern; manuelles Übersteuern bleibt |
| Feld „Herstellername“ (aus Shopware-Hersteller) | Schlüssel für die Lieferantenwahl | Lieferantenvorschlag aus Mensura (`supplierId`) bzw. LieferLotse-Produktzuordnung – kein Missbrauch des Herstellers mehr |
| Masken je Arbeitsplatz (anzeigen/bearbeiten/verbergen, 22.491 Einstellungen) | Was der Mitarbeiter sieht | feste, rollenbezogene Arbeitsplätze in Ordo; Konfiguration nur, wo nötig |
| Automatik-Arbeitsplätze + Cron (`move_all`) | Mails, XML, Dateikopie, GLS, Rechnung | Shopware Flow Builder + Scheduled Tasks; Ereignisse statt „Durchlauf-Arbeitsplätze“ |
| Import (Shopware v5/v6, Statuswechsel zurück) | Auftragseingang | entfällt – Ordo arbeitet direkt in Shopware |
| `shopware_api` (Rückschreiben Status, Lexware-Positionstext) | Status zurück an Shop | entfällt bzw. Ordo setzt Shopware-Status direkt |
| `vendor_order` (Mail mit Kopf/Position/Fuß-Vorlage) | Lieferantenbestellung | LieferLotse (Formate, Transporte) + Ordo (Auslösung, Status) |
| `xml` / `import_xml` (PSP) | Bestell-XML, Paketlink-Rückmeldung | LieferLotse-Formatter/-Transporte, Rückmeldung über Eingang + Vectura-Parser |
| `file_handler` (final → output/<Lieferant>) | Druckdaten an Lieferanten | Proba (Ablage) + LieferLotse `artwork_out` |
| `downloader` (Upload-Links aus dem Shop) | Druckdaten holen | Proba (Upload direkt am Auftrag) – aktuell hängen alle 11 offenen Downloads mit Schreibfehler |
| Datenprüfung (Checkboxen „Datencheck I–VI“, manuell) | Prüfung | Proba: automatische Prüfung + manuelle Warteschlange |
| `customer_notification` (23 Vorlagen) | Kundenmails je Arbeitsplatz | Shopware-Mailvorlagen + Flow (Datenfehler je Material, Terminbestätigung/-änderung, Vorkasse, Produktion, Versand) |
| `gls_api`, `dpd_api`, `tnt_api`, `camel_api`, `trex_gel_api` | Labels, Tracking | Vectura (GLS zuerst) |
| `pdf_filler` (Lieferschein, Laufzettel, AB-Prüfung) | Dokumente | Shopware-Dokumente (Lieferschein, Rechnung), Opus-Laufzettel, Ordo-AB |
| `shipping_list` | Versandliste mit Colli | Versandarbeitsplatz (Vectura/Ordo) |
| Rechnungs-CSV/-Tabellen (Coloroprint, PSP, SH) | Abrechnung | Shopware-Rechnung (E-Rechnung), DATEV-Export; Klärung Coloroprint (Frage F2) |
| Barcode Code 128 `Auftrag-Position`, Scanner-/App-Schnittstelle (`interface`, Android-App) | Scan an Stationen | Opus: Laufzettel mit QR, Scan-to-Start/Finish |
| Archiv (mit Flow-Historie, PDF) | Archiv | Ordo-Archiv (Bestellung bleibt in Shopware, Protokoll bleibt) |
| Berechnete Felder (Werktage, m², Mindest-1 m², Versand-/Verpackungskosten, Gewicht) | Kennzahlen | Mensura (Fläche, Preis, Gewicht), Vectura (Termine, Versandkosten) – nicht nachbauen |

## 4. Was SOM gut macht – übernehmen

1. Positionsgenauer Ablauf mit lückenlosem Protokoll (alt/neu, Benutzer, Zeit).
2. Regeln schlagen vor, Mitarbeiter darf übersteuern; Sperre, wenn Voraussetzungen fehlen.
3. Automatik-Schritte nehmen Routinearbeit ab (Mails, Dateien, Labels).
4. Kundenmails passend zum Problem (Datenfehler je Produktart, Erinnerung, geänderter Termin).
5. Scan `Auftrag-Position` an den Stationen.
6. Rechte je Gruppe auf Arbeitsplatz-Ebene.

## 5. Was besser werden muss

1. **Zu viele Zwischen-Arbeitsplätze** (~28 Wechsel je Position, ein Arbeitsplatz je Lieferant und Hilfsschritt):
   neu wenige klare Status + Ereignisse.
2. **Routing über den Herstellernamen** (Kürzel-Listen wie LIN, PXL, PSP, SH …) ist fehleranfällig.
3. **Keine automatische Druckdatenprüfung**; Downloads scheitern still.
4. **Rechnungsstellung dauert** (Ø 73–99 h in den Rechnungs-Arbeitsplätzen).
5. **Archiv unvollständig** (747 von ~3.800 abgeschlossenen Aufträgen), Archiv-/Backup-Job nicht im Cron.
6. **Doppelte Datenhaltung** (Import, Rückschreiben, EAV) entfällt, weil Ordo direkt in Shopware arbeitet.

## 6. Sicherheitsbefunde

Befunde zum laufenden SOM sind vertraulich und stehen nur lokal im nicht versionierten Spiegel-Ordner
(`docker/som-spiegel/daten/SICHERHEITSBEFUNDE-SOM.md`).

## 7. Folgen für das Konzept

- Statusmodell Ordo (KONZEPT 4) bestätigt; ergänzt um **„Warten auf Infos“** (Rückfrage an Kunden) und
  **„Artikel prüfen“** als Teil der Auftragsannahme.
- Opus-Stationen aus der Praxis: **Rip → Druck (Mimaki 160 A–D) → Laminieren → Schneiden (Mimaki Plott,
  Hand schneiden, Wild) → Verpacken → Versand**; Druckmaschinen als einzelne Stationen bzw. Ressourcen
  einer Station „Druck“.
- Datenprüfung braucht **Prüfprofile je Produktart** (Banner, Folienplott, Platten, Rolle) wie heute.
- Lieferanten-Rückmeldungen per XML (PSP) und Paketlink-Mails müssen in Vectura/LieferLotse ankommen.
- Ordo ersetzt Import und Rückschreiben vollständig; **Übergang** (Parallelbetrieb) planen.

## 8. Antworten (2026-11-13)

| # | Frage | Antwort |
|---|---|---|
| F1 | Kürzel | LIN, PXL, PSP, SH, DZ, KFL, SW, HSF, KER, HL, DP … sind **Hersteller-/Lieferantenkürzel**. Wild, Mimaki A–D, Laminieren, Hand schneiden sind **Stationen der Produktion**. |
| F2 | Coloroprint | **COL = interne Produktion** → Opus. |
| F3 | Displayhaus | Displayhaus = Lohndruckerei und wird es in dieser Form nicht mehr geben. **Ordo führt nur Aufträge der Lohndruckerei.** |
| F4 | Lexware/Rechnung | Lexware fakturiert nicht. Rechnungen erzeugt und versendet heute der **Shopware-5-Shop**; die Buchhaltung lädt **monatlich die DATEV-Datei** herunter und liest sie in **Lexware** ein. |
| F5 | Parallelbetrieb | **Kein Parallelbetrieb.** Laufende Aufträge möglichst vor dem Umzug abschließen, Rest ggf. übertragen. Kein Archiv-Import aus SOM. |
| F6 | App/Scanner | Kein Scanner. Eine **Android-App** (Auftrag an die nächste Station weiterleiten, Stand verfolgen) ist eine gute Idee – **eigenes Projekt, später**. |
