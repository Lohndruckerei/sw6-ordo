# Ordo – Konzept

Ordo ist der **Auftragsworkflow und Leitstand** der Lohndruckerei. Jeder Kundenauftrag läuft von der
Annahme bis ins Archiv durch Ordo. Mitarbeiter arbeiten in einer schlanken Vollbild-Oberfläche in der
Shopware-Administration und sehen nur den Bereich, den ihre Rolle braucht.

Stand: 2026-11-12 · Status: Konzept, Gerüst angelegt · Fragen und Entscheidungen: Abschnitt 11

---

## 1. Ziele

1. **Ein Ort für jeden Auftrag:** Status, Daten, Lieferant oder Produktion, Zahlung, Versand,
   Kommunikation und Dokumente auf einen Blick.
2. **Automatisch, wo möglich, und von Hand, wo nötig:** Regeln entscheiden vor (Lieferant, interne
   Produktion, Termin); jeder Schritt lässt sich von einem Mitarbeiter übersteuern, und die Übersteuerung
   wird protokolliert.
3. **Einfach zu bedienen:** jede Rolle hat einen eigenen Arbeitsplatz mit Aufgabenliste („Was ist als
   Nächstes zu tun?“), großen Schaltflächen, Ampeln nach Termin und Hilfetext an jedem Feld.
4. **Nichts doppelt:** Shopware, Mensura, LieferLotse und Vectura erledigen, was sie schon können.
   Ordo steuert und verbindet (Abschnitt 3).
5. **Nachvollziehbar:** Jede Statusänderung, Mail, Freigabe und Preisänderung steht in der Auftragsakte
   (Zeitpunkt, Benutzer bzw. „Automatik“, Grund).

## 2. Plugin-Familie und Aufgabenteilung

```
                         Shopware 6.7 (Bestellung, Zahlung, Lieferung, Dokumente, Flow/Rule Builder, Rollen)
                                                      ▲
  ┌──────────────┬──────────────────┬─────────────────┼──────────────────┬──────────────────┐
  │ LdMensura    │ LdLieferLotse    │ LdOrdo          │ LdProba          │ LdOpus            │ LdVectura
  │ Konfiguration│ Lieferanten,     │ Workflow,       │ Druckdaten:      │ interne           │ Versand,
  │ EK/VK,       │ Bestelldateien,  │ Leitstand,      │ Upload, Preflight│ Produktion:       │ Sendungen,
  │ Lieferanten- │ Transporte       │ Arbeitsplätze   │ Korrekturabzug,  │ Stationen,        │ Labels,
  │ vorschlag    │ (FTP/SFTP/Mail)  │ Rollen, Archiv  │ Kundenfreigabe   │ Routing, Laufzettel│ Termine
  └──────────────┴──────────────────┴─────────────────┴──────────────────┴──────────────────┘
```

| Plugin | Zuständig | Nicht zuständig |
|---|---|---|
| **Ordo** (dieses) | Auftragsakte je Bestellung und Position, Positionsstatus, Freigabe-Tor (Daten + Zahlung), Weiterleitung intern/extern, gespeicherte Lieferantenbestellungen mit Status, Terminbestätigung und -verschiebung (über Vectura), Zahlungsinformationen und Zahlungslinks, Rechnungsauslösung, Auftragsänderung mit Preisänderung, Kommunikationsprotokoll, Archiv, DATEV-Übergabe, Arbeitsplätze und Rollen, Dashboard-Kacheln | Preise rechnen (Mensura), Lieferanten-Stammdaten und Dateiübertragung (LieferLotse), Druckdaten prüfen (Proba), Arbeitsschritte der Produktion (Opus), Versandkosten, Sendungen und Labels (Vectura) |
| **Proba** | Upload je Position (Shop und Admin), automatische Prüfung, Prüfbericht, Korrekturabzug, Freigabe- und Ablehnungs-Link in der Mail, Fehlermeldungen (Vorlagen und Freitext), Druckdaten-Archiv auf externem Server | Entscheidung, wohin der Auftrag geht |
| **Opus** | Arbeitsstationen, Routing-Regeln (Konfiguration → Arbeitsschritte), Jobs und Arbeitsschritte, Laufzettel mit QR-Code, Stationsansichten | Kundenkommunikation, Rechnung |
| **Vectura** | Versandart, Versandkosten, Sendungen, Tracking, Labels, Termine (`confirm/hold/resume/reschedule`), Versandmitteilungen aus Lieferanten-Dateien | Auftragsstatus |

**Warum drei Plugins statt einem?** Proba hat einen eigenen Teil im Shop-Frontend (Upload, Freigabe) und
lässt sich ohne Ordo testen; Opus wird an Arbeitsplätzen in der Halle betrieben und hat eigene Regeln.
Getrennt bleiben die Plugins klein, einzeln testbar und unabhängig aktualisierbar. Ordo bindet die
Oberflächen von Proba und Opus in seine Arbeitsplätze ein; ist eins der Plugins nicht installiert,
blendet Ordo den Bereich aus.

## 3. Was Ordo nutzt, statt es selbst zu bauen

| Vorhanden | Woher | Nutzung in Ordo |
|---|---|---|
| Bestell-, Zahlungs-, Lieferstatus | Shopware State Machines (`order.state`, `order_transaction.state`, `order_delivery.state`) | bleiben die kundensichtbaren Status; Ordo setzt sie über Übergänge, nie direkt in der Datenbank |
| Rechnung, Lieferschein, Gutschrift, Storno, Nummernkreise | Shopware-Dokumente | Ordo löst sie aus; neuer Dokumenttyp nur für die **Auftragsbestätigung** (gibt es in Shopware nicht) |
| E-Rechnung (ZUGFeRD/XRechnung, EN 16931) | Shopware ab 6.6.10 | für die Rechnung verwenden; Pflicht zur Ausstellung ab 2027/2028 |
| Mailvorlagen, Flow Builder | Shopware | alle Kundenmails als Mail-Template-Typen; Ordo löst Flow-Ereignisse aus, damit Mails und Automatik ohne Programmierung angepasst werden können |
| Rule Builder | Shopware | Bedingungen für Automatik (z. B. Kundengruppe, Zahlungsart) |
| Benutzer und Rollen | Shopware ACL | keine eigene Benutzerverwaltung |
| Auftragsbearbeitung mit Neuberechnung | Shopware-Bestellbearbeitung (versioniert) | Grundlage für Änderungen am Auftrag (Abschnitt 6) |
| Konfiguration, EK/VK, Lieferantenvorschlag | Mensura-Schnappschuss `ld_mensura_order_line_item` | Anzeige, Marge, Vorschlag für die Zuordnung |
| Lieferantenkandidaten, Bestelldatei, Versand an Lieferant | LieferLotse `SupplierResolver`, `SupplierOrderBuilder`, `SupplierOrderService` | Ordo entscheidet und ruft auf; LieferLotse bestellt nie von selbst |
| Liefertermin aus der Bestellung | LieferLotse `DeliveryDateResolver`, Mensura `ldDeliveryDate`, Vectura `ld_delivery_date` | Ordo rechnet keinen eigenen Termin |
| Sendungen, Tracking, Labels, Termine | Vectura (in Entwicklung) | Ordo ruft auf; bis Vectura so weit ist, nur manuelle Sendungserfassung über Shopware-Tracking-Codes |

## 4. Statusmodell

Zwei Ebenen, damit der Kunde wenige, klare Status sieht und intern genau gesteuert werden kann.

### 4.1 Kundensicht (Shopware, Bestellung)
`Offen` → `In Bearbeitung` → `Abgeschlossen` (bzw. `Storniert`); Zahlung und Lieferung mit ihren
Shopware-Status. Neue Shopware-Status nur, wenn der Kunde sie wirklich sehen muss (Entscheidung offen).

### 4.2 Positionsstatus (Ordo, je Bestellposition)

| Status | Bedeutung | Blockiert? | Wer handelt |
|---|---|---|---|
| `new` Neu | Bestellung eingegangen, noch nicht geprüft | – | Automatik |
| `awaiting_artwork` Daten fehlen | Kunde hat noch keine Druckdaten geliefert | ja („Auftrag verzögert sich“) | Kunde, Erinnerung |
| `artwork_check` In Datenprüfung | Proba prüft automatisch oder ein Mitarbeiter prüft | – | Datenprüfung |
| `artwork_rejected` Daten fehlerhaft | Fehlermeldung an Kunden versendet | ja | Kunde |
| `awaiting_approval` Warten auf Freigabe | Korrekturabzug versendet | ja | Kunde |
| `awaiting_payment` Warten auf Zahlung | Vorkasse bzw. Nachforderung offen | ja | Kunde, Buchhaltung |
| `released` Freigegeben | Daten **und** Zahlung in Ordnung – darf produziert/bestellt werden | – | Automatik oder Kundenservice |
| `supplier_ordered` Beim Lieferanten bestellt | Lieferantenbestellung übertragen | – | Automatik/Kundenservice |
| `in_production` In Produktion | interner Job in Opus läuft (Station sichtbar) | – | Produktion |
| `ready_to_ship` Versandbereit | intern fertig bzw. Lieferant meldet fertig | – | Versand |
| `shipped` Versendet | Sendung mit Tracking | – | Versand/Lieferant |
| `delivered` Zugestellt | laut Tracking zugestellt | – | Automatik |
| `on_hold` Angehalten | manuell gestoppt (Rückfrage, Problem) mit Grund | ja | jeder Berechtigte |
| `cancelled` Storniert | Position storniert | – | Kundenservice |

**Freigabe-Tor:** Eine Position geht erst an Lieferant oder Produktion, wenn Druckdaten freigegeben sind
**und** die Zahlung erfüllt ist (bezahlt, Rechnungskauf oder SEPA erlaubt). Das Tor öffnet automatisch
oder per Knopf „Freigeben“ mit Grund.

**Point of no Return:** Ab `supplier_ordered` bzw. `in_production` sind Datentausch und kostenlose
Stornierung nicht mehr möglich (Kundenhinweis im Shop, Wortlaut in den AGB festlegen).

Technisch: eigene State Machine `ld_ordo_position.state` über die Shopware-State-Machine-Tabellen,
damit Übergänge, Verlauf und Flow-Ereignisse einheitlich funktionieren.

## 5. Ablauf eines Auftrags

1. **Auftragsannahme** – Bestellung eingegangen (`CheckoutOrderPlacedEvent`). Ordo legt die
   Auftragsakte an, übernimmt Konfiguration und EK/VK aus Mensura und prüft die Zielmarge.
2. **Terminbestätigung** – Vectura bestätigt den Termin (`schedule/confirm`), Ordo versendet die
   Auftragsbestätigung (Mail + AB-Dokument).
3. **Zuordnung** – je Position Vorschlag: interne Produktion (Opus-Regeln) oder Lieferant
   (Mensura-Vorschlag, sonst LieferLotse-Priorität). Automatisch nach Regeln oder von Hand.
4. **Druckdaten** – Proba prüft beim Upload. Fehler → Fehlermeldung (Vorlage oder Freitext) mit Link zum
   erneuten Upload. Korrekturabzug → Mail mit Knöpfen „Freigeben“ / „Neue Daten hochladen“.
5. **Termin anpassen** – fehlen Daten, Freigabe oder Zahlung nach dem Annahmeschluss, verschiebt Vectura
   den Termin (`hold`/`resume`/`reschedule`) automatisch; der Kunde wird informiert. Von Hand jederzeit.
6. **Zahlung** – Vorkasse: Zahlungsinformation bzw. Zahlungslink, Erinnerung. Status aus Shopware.
7. **Freigabe-Tor** → Lieferantenbestellung über LieferLotse (gespeichert mit Status) bzw. Job in Opus.
8. **Überwachung** – Lieferant: Bestätigung, Versandmitteilung (Import über LieferLotse-Eingang und
   Vectura-Parser), Warnung bei Verzug. Intern: aktuelle Station sichtbar.
9. **Versand** – Versandarbeitsplatz: Adresse, Versanddienstleister (Vorschlag, änderbar), Lieferschein,
   Label. Versandmitteilung an den Kunden mit Tracking.
10. **Zusammenführen und Rechnung** – sind alle Positionen versendet (intern und extern), erzeugt Ordo die
    Rechnung (E-Rechnung) und sendet sie. Teillieferungen werden abgebildet (Entscheidung offen:
    Teilrechnung ja/nein).
11. **Buchhaltung** – DATEV-Übergabe (Abschnitt 8).
12. **Archiv** – Auftrag abgeschlossen; Akte, Dokumente und Kommunikation bleiben les- und suchbar.

## 6. Änderungen am Auftrag

Der Kundenservice kann jederzeit (bis zum Point of no Return ohne Rückfrage, danach mit Warnung):

- eine Position **an einen anderen Lieferanten oder in die interne Produktion umleiten** – eine
  bestehende Lieferantenbestellung wird storniert (LieferLotse-Vorlage `ld_supplier_order_cancel`) und
  neu bestellt;
- **Auftragsdaten bearbeiten** (Menge, Konfiguration, Adresse, Versandart) über die
  Shopware-Bestellbearbeitung; Konfigurationsänderungen rechnet Mensura neu.

Ändert sich der Preis, führt ein Assistent durch die Folgen:

1. Differenz anzeigen (alt/neu, netto/brutto, Marge).
2. Kunde informieren (Mail mit Begründung, optional Zustimmung einholen).
3. Neue Auftragsbestätigung; ist schon eine Rechnung erstellt: Storno bzw. Gutschrift und neue Rechnung
   (nie ein Dokument überschreiben – GoBD); neuer Lieferschein, falls noch nicht versendet.
4. Mehrbetrag: Zahlungsnachforderung per Mail mit Zahlungslink; Minderbetrag: Gutschrift/Erstattung.

## 7. Arbeitsplätze, Rollen und Oberfläche

**Oberfläche:** Vollbild-Arbeitsplatz in der Shopware-Administration (eigene Route ohne Shopware-Menü,
öffnet auf Wunsch als eigenes Browserfenster). Mitarbeiter mit ausschließlich Ordo-Rechten sehen und
erreichen keine anderen Shopware-Bereiche. Design aus `ld-admin-design` (Präfix `lo-`).

| Rolle | Arbeitsplatz | Sieht | Darf |
|---|---|---|---|
| **Chef** | Leitstand + alle | alles inkl. EK/Marge, Kennzahlen | alles, Workflow-Administration |
| **Kundenservice** | Auftragsliste, Auftragsakte | alle Aufträge, Status jeder Station | Zuordnen, Umleiten, Bearbeiten, Mails, Termin, Freigabe-Tor; EK/Marge nur mit Recht |
| **Datenprüfung** | Prüf-Warteschlange (Proba) | Positionen mit Druckdaten, Prüfbericht | Freigeben, Fehlermeldung, Korrekturabzug |
| **Produktion** | Stationen (Opus) | nur eigene Stationen + wo ein Auftrag gerade liegt | Arbeitsschritt starten/beenden, Problem melden |
| **Versand** | Versand-Warteschlange | Adressen, Versandart, Pakete | Dienstleister ändern, Lieferschein, Label |
| **Workflow-Admin** | Einstellungen | Regeln, Stationen, Vorlagen, Fristen | konfigurieren |

Rechte als ACL-Schlüssel `ld_ordo.*` (Bereiche je Arbeitsplatz, `purchase` für EK/Marge, `admin`),
die Rollen werden in Shopware aus diesen Rechten zusammengestellt; Ordo liefert Vorschläge.

**Bedienregeln** (zusätzlich zu `ld-admin-design/DESIGN.md`): Aufgabenliste statt Menüs; Sortierung nach
Termin, Ampel rot/gelb/grün (nie nur Farbe); eine Hauptaktion je Ansicht; große Schaltflächen an
Produktions- und Versandplätzen (Touch, Scanner); Hilfetext mit Praxisbeispiel an jedem Feld;
Erklärkarte je Arbeitsplatz; jede Aktion mit Bestätigung bzw. „Rückgängig“, wo möglich.

**Dashboard:** Kacheln im Shopware-Dashboard (Aufträge je Status, überfällige Aufträge, Umsatz,
Marge unter Ziel) mit Sprung in den passenden Arbeitsplatz. Sichtbar je nach Recht.

## 8. Zahlung, Rechnung, DATEV, Archiv

- **Zahlung:** Status aus `order_transaction`; Ordo zeigt ihn, versendet Vorkasse-Informationen und
  Zahlungslinks (Anbieter offen) und Erinnerungen.
- **Rechnung:** Shopware-Rechnung mit E-Rechnung (ZUGFeRD/XRechnung), ausgelöst bei vollständiger
  Lieferung aller Positionen.
- **DATEV:** erste Stufe Export DATEV-Format (EXTF-Buchungsstapel) + Rechnungsbelege (PDF/XML) je
  Zeitraum; spätere Stufe DATEV-Online-Schnittstelle (Partnerschaft nötig). Vor eigener Entwicklung
  vorhandene Shopware-DATEV-Erweiterungen prüfen.
- **Archiv:** Aufträge bleiben in Shopware; Ordo bietet eine Archivsuche (Kunde, Nummer, Zeitraum,
  Lieferant, Produkt). Dokumente und Druckdaten unveränderbar; Aufbewahrung: Rechnungen 8 Jahre,
  Geschäftsbriefe 6 Jahre. Druckdaten-Archiv auf externem Server (Proba).
- **Kommunikation:** jede Mail an Kunde und Lieferant (Text, Anhänge, Zeitpunkt) sowie eingehende
  Lieferantendateien in der Auftragsakte.

## 9. Datenmodell (Entwurf)

Präfix `ld_ordo_`. Fremde Daten nur per ID ohne Fremdschlüssel (lose Kopplung).

| Entity | Inhalt |
|---|---|
| `ld_ordo_order` | Auftragsakte je Bestellung: Gesamtstatus, Zielmarge-Warnung, Verantwortlicher, Notizen |
| `ld_ordo_position` | je Bestellposition: State-Machine-Status, Ziel (`internal`/`supplier`), `supplierId`, Grund der Zuordnung (Regel/Hand), Termin, Sperrgrund |
| `ld_ordo_supplier_order` | gespeicherte Lieferantenbestellung: Nummer, Lieferant, Positionen, Status (`sent`, `failed`, `confirmed`, `shipped`, `cancelled`), Transport-Ergebnis, Datei |
| `ld_ordo_event` | Auftragsprotokoll: Art, Text, Daten (JSON), Benutzer/Automatik, Zeitpunkt |
| `ld_ordo_message` | Kommunikation: Richtung, Kanal, Empfänger, Betreff, Mail-Template, Anhänge |
| `ld_ordo_rule` | Automatik-Regeln (Zuordnung, Freigabe, Erinnerungen) mit Shopware-Regel-ID |
| `ld_ordo_message_template` | vordefinierte Texte (Fehlermeldungen, Rückfragen) für den Kundenservice |

## 10. Fahrplan

| Schritt | Inhalt |
|---|---|
| 1 | Gerüst, Dokumentation, Docker, Design-Anbindung ✔ |
| 2 | SOM-Spiegel aufsetzen und heutigen Ablauf auswerten → Konzept schärfen |
| 3 | Auftragsakte + Positionsstatus (State Machine), Protokoll, Auftragsliste im Leitstand |
| 4 | Vollbild-Arbeitsplatz, Rollen und Rechte |
| 5 | Lieferantenzuordnung + gespeicherte Lieferantenbestellungen (LieferLotse), Umleiten/Storno |
| 6 | Proba Stufe 1 (Upload, Prüfung, Freigabe) und Freigabe-Tor |
| 7 | Zahlung, Termine (Vectura), Kundenmails |
| 8 | Opus Stufe 1 (Stationen, Routing, Laufzettel) |
| 9 | Versandarbeitsplatz (Vectura), Versandmitteilungen |
| 10 | Rechnung bei Vollständigkeit, Auftragsänderung mit Preisänderung |
| 11 | DATEV, Archiv, Dashboard-Kacheln |

## 11. Offene Entscheidungen

| # | Frage | Vorschlag |
|---|---|---|
| E1 | Zahlungsanbieter für Zahlungslinks (Mollie, PayPal, Stripe, Unzer …)? | vorhandenen Anbieter des Shops nutzen |
| E2 | Versanddienstleister (GLS laut Vectura; weitere? Spedition?) | GLS zuerst |
| E3 | Preflight-Werkzeug: callas pdfToolbox (Lizenz) oder Open Source (Ghostscript/qpdf/pdfcpu)? | Stufe 1 Open Source, callas bei Bedarf |
| E4 | Externer Druckdatenserver: Art (SFTP, NAS, S3) und Aufbewahrungsdauer? | – |
| E5 | DATEV: Export-Datei an Steuerberater oder DATEV Unternehmen online? Berater-/Mandantennummer, Kontenrahmen (SKR03/04)? | Export-Datei zuerst |
| E6 | Zielmarge: ein Wert, je Produkt/Kalkulation oder je Kundengruppe? | je Kalkulation mit Standardwert |
| E7 | Fristen: Daten-Nachreichung, Freigabe, Zahlung – wann Erinnerung, wann Storno? | Erinnerung nach 2 und 5 Werktagen, kein automatisches Storno |
| E8 | Rechnung: erst bei vollständiger Lieferung (gewünscht) – Teilrechnungen bei Teillieferung? | eine Rechnung am Ende, Teilrechnung nur von Hand |
| E9 | Eigene kundensichtbare Bestellstatus (z. B. „In Produktion“)? | Status im Kundenkonto aus Ordo anzeigen, Shopware-Status nicht erweitern |
| E10 | Geräte in Produktion/Versand: Tablets/PCs, Barcode-Scanner, Etiketten- und Lieferscheindrucker? | – |
| E11 | Wann ist ein Korrekturabzug Pflicht (immer, ab Auftragswert, bei Freiformschnitt, auf Wunsch)? | auf Wunsch + Freiformschnitt |
| E12 | Ergebnisse der SOM-Auswertung (Schritt 2) | – |
