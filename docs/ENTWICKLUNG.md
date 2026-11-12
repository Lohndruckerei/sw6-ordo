# Entwicklung Ordo

## Branches
- `main` ist immer lauffähig und im Shop getestet.
- Arbeits-Branches `backend/<thema>` bzw. `frontend/<thema>` (Storefront), regelmäßig `main` holen.
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
