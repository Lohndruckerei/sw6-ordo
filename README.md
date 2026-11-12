# Ordo – Auftragsworkflow und Leitstand für Shopware 6

> In Entwicklung – Gerüst und Konzept, noch nicht nutzbar.

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
- [SOM-Spiegel (heutiges Workflowsystem)](docs/SOM-SPIEGEL.md)
- [Entwicklung, Prüfung, Build](docs/ENTWICKLUNG.md)

## Installation (Entwicklung)
```bash
docker exec shopware bash -c "cd /var/www/html && bin/console plugin:refresh && bin/console plugin:install --activate LdOrdo"
```
