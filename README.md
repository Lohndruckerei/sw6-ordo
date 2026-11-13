# Ordo – Auftragsworkflow und Leitstand für Shopware 6

> In Entwicklung. Stand 0.2.0: Auftragsakte, Positionsstatus mit Protokoll, Leitstand-Liste.

## Was schon geht (0.2.0)
- **Auftragsakte:** Jede neue Bestellung bekommt automatisch eine Akte (`ld_ordo_order`); jede Produkt-Position
  bekommt einen eigenen Status (`ld_ordo_position`, Status-Maschine `ld_ordo_position.state`, 15 Status, siehe
  `src/Service/PositionState.php` und KONZEPT 4.2). Ältere Bestellungen: `bin/console ordo:order:sync [--limit=500]`.
- **Statuswechsel** nur über `POST /api/_action/ld-ordo/position/{id}/transition/{action}` (Body `reason`, bei `hold`
  Pflicht); erlaubte Schritte: `GET /api/_action/ld-ordo/position/{id}/transitions`. Jeder Wechsel landet mit
  Benutzer und Grund im Protokoll (`ld_ordo_event`); Notizen: `POST /api/_action/ld-ordo/order/{id}/note`.
- **Administration:** Hauptmenü „Ordo“ → Liste mit Filtern „Braucht Aktion / Offen / Abgeschlossen / Alle“ und
  Auftragsakte mit Positionen, „Status ändern“, Notizen und Protokoll.
- **Rechte:** `ld_ordo.viewer` (lesen), `ld_ordo.editor` (Status ändern, Notizen).
- **Deinstallation** ohne „Daten behalten“ entfernt Tabellen und Status-Maschine; Bestellungen bleiben unverändert.

Shopware-6.7-Plugin der Lohndruckerei. Jeder Kundenauftrag läuft durch Ordo: Auftragsannahme,
Terminbestätigung, Zuordnung an Lieferanten oder interne Produktion, Druckdatenprüfung, Zahlung,
Versand, Rechnung, Buchhaltung (DATEV) und Archiv. Mitarbeiter arbeiten in einem Vollbild-Arbeitsplatz
in der Administration und sehen nur ihren Bereich (Chef, Kundenservice, Datenprüfung, Produktion, Versand).

| Plugin | Aufgabe |
|---|---|
| **Ordo** (dieses) | Workflow, Leitstand, Arbeitsplätze, Rollen |
| [Proba](https://github.com/Lohndruckerei/sw6-proba) | Druckdaten: Upload, Prüfung, Korrekturabzug, Freigabe |
| [Opus](https://github.com/Lohndruckerei/sw6-opus) | interne Produktion: Stationen, Routing, Laufzettel |
| Mensura · LieferLotse · Vectura | Konfiguration/Kalkulation · Lieferanten · Versand/Termine (vorhanden) |

## Dokumentation
- [Konzept, Statusmodell, Rollen, Fahrplan, offene Entscheidungen](docs/KONZEPT.md)
- [Schnittstellen zu Mensura, LieferLotse, Vectura; belegte Namen](docs/INTEGRATION.md)
- [Recherche Online-Druckereien und Workflow-Software](docs/RECHERCHE.md)
- [SOM-Spiegel (heutiges Workflowsystem)](docs/SOM-SPIEGEL.md) · [SOM-Auswertung](docs/SOM-AUSWERTUNG.md)
- [Entwicklung, Prüfung, Build](docs/ENTWICKLUNG.md)

## Installation (Entwicklung)
```bash
docker exec shopware bash -c "cd /var/www/html && bin/console plugin:refresh && bin/console plugin:install --activate LdOrdo"
```
