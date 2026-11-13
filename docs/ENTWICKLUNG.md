# Entwicklung Ordo

Ordo ist **ein Plugin und ein Repository** mit zwei Arbeitsbereichen, die getrennt entwickelt werden können
(eigene Claude-Sitzungen „Ordo Backend“ und „Ordo Frontend“, wie bei Mensura). Verbunden sind sie nur über den
**Vertrag** in `docs/contract/`.

| Bereich | Ordner | Inhalt |
|---|---|---|
| **Backend** | `src/Core/`, `src/Service/`, `src/Migration/`, `src/Extension/`, `src/Controller/`, `src/Subscriber/`, `src/Command/`, `src/Resources/config/`, `src/Resources/app/administration/`, `tests/Backend/` | Datenmodell, Status, Services, Admin-API, Store-API, Administration |
| **Frontend** | `src/Resources/app/storefront/`, `src/Resources/views/storefront/`, `src/Resources/snippet/storefront.*`, `tests/Frontend/` | Kundenkonto: Auftragsstand je Position mit Handlungsknopf (KONZEPT E9), später Zahlungsnachforderung |
| **Vertrag** | `docs/contract/` | Store-API-Beschreibung, Schemas, Beispielfälle |
| gemeinsam | `docs/`, `README.md`, `CLAUDE.md`, `composer.json`, `.github/` | Doku, Version, Prüfungen (Version und CLAUDE.md nur in der Hauptsitzung ändern) |

Jeder Bereich ändert nur seine eigenen Ordner. Braucht das Frontend etwas Neues, wird es zuerst im Vertrag ergänzt.

## Branches
- `main` ist immer lauffähig und im Shop getestet.
- `contract/<thema>`: Vertragsänderung, geht zuerst nach `main`.
- Arbeits-Branches `backend/<thema>` bzw. `frontend/<thema>`, regelmäßig `main` holen.
- Schnittstellen zu anderen Plugins zuerst in docs/INTEGRATION.md beschreiben (und im anderen Plugin
  abstimmen), dann umsetzen. Nur erweitern, nie brechen.
- Zusammenführen nur bei grüner Prüfung (.github/workflows/ci.yml); kein Force-Push.

## Prüfen
- Lokal im Container: `docker exec -w /var/www/html/custom/plugins/LdOrdo shopware bash .github/scripts/check-all.sh`
- Prüft PHP-Syntax und Vollständigkeit der Snippets (de-DE/en-GB). Tests kommen nach `tests/`.

## Installieren und bauen
```bash
docker exec shopware bash -c "cd /var/www/html && bin/console plugin:refresh && bin/console plugin:install --activate LdOrdo"
docker exec shopware bash -c "cd /var/www/html && SHOPWARE_ADMIN_BUILD_ONLY_EXTENSIONS=1 bin/build-administration.sh && bin/console assets:install && bin/console cache:clear"
```
Die gebauten Dateien unter `src/Resources/public` werden mit eingecheckt.

## Admin-Design
```bash
cd ~/projekte/sw6-entwicklung-lohndruckerei/ld-admin-design && ./sync.sh ordo
```
