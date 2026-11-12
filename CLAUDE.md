# Projekt: sw6-ordo (Shopware 6 Plugin „Ordo“ der Lohndruckerei)

Arbeitsname „Ordo“ – Auftragsworkflow und Leitstand: Auftragsannahme, Termine, Lieferantenzuordnung, Zahlung, Rechnung, Kommunikation, Archiv, Arbeitsplätze und Rollen.
Konzept und offene Entscheidungen: docs/KONZEPT.md · Schnittstellen: docs/INTEGRATION.md ·
Branches und Prüfung: docs/ENTWICKLUNG.md (bei Änderungen mitpflegen).
Gesamtablauf der Familie Ordo/Proba/Opus: ../sw6-ordo/docs/KONZEPT.md

## Umgebung
- Shopware 6.7 läuft lokal im gemeinsamen Docker-Container "shopware" (Compose, siehe ../CLAUDE.md)
- Dieser Ordner ist im Container eingebunden unter: /var/www/html/custom/plugins/LdOrdo
- Shopware-Befehle im Container, z. B.:
  docker exec shopware bash -c "cd /var/www/html && bin/console plugin:refresh"
- Administration bauen (nur Plugins, siehe ../CLAUDE.md):
  docker exec shopware bash -c "cd /var/www/html && SHOPWARE_ADMIN_BUILD_ONLY_EXTENSIONS=1 bin/build-administration.sh"
- Shop: http://localhost, Administration: http://localhost/admin

## Plugin
- Technischer Name: LdOrdo
- Namespace: Lohndruckerei\Ordo
- Tabellen-/Entity-Präfix: `ld_ordo_`, ACL-Schlüssel `ld_ordo`, Flow-Ereignisse `ordo.*`
- Admin: Modul `ld-ordo` (Routen `ld.ordo.*`), Komponenten-/CSS-Präfix `lo-`
- Migrationen: Zeitstempel ab 1795000000 (Bereiche der Familie in ../sw6-ordo/docs/INTEGRATION.md)

## Konventionen
- PHP 8.2+, strict_types, Shopware-Coding-Standards; services.xml mit autowire/autoconfigure
- Texte und Snippets auf Deutsch (de-DE) und Englisch (en-GB)
- Keine Fremdplugins als Abhängigkeit; Composer-Bibliotheken sind erlaubt
- Shopware erweitern, nicht ersetzen: Bestell-/Zahlungs-/Lieferstatus, Dokumente, Mail-Templates, Flow Builder,
  Rule Builder und Rollen bleiben Shopware-Standard
- Nichts doppelt bauen, was Mensura, LieferLotse oder Vectura können (Tabelle in docs/INTEGRATION.md);
  nur lose koppeln (IDs ohne Fremdschlüssel, Events), allein lauffähig
- EK/Marge nur mit eigenem Recht, serverseitig geschützt (setzt `ld_mensura.purchase` voraus), nie in die Store-API
- Admin-Design kommt aus ~/projekte/sw6-entwicklung-lohndruckerei/ld-admin-design – dort ändern, nicht lokal:
  `src/Resources/app/administration/src/ld-admin-design/` ist generiert (`./sync.sh ordo`, Präfix `lo-`,
  Store `loDesign`, Mixin `lo-design`); Regeln in dessen DESIGN.md
- Jedes Feld mit Hilfetext und Praxisbeispiel, Erklärkarte je Seite/Arbeitsplatz, Warnungen beim Speichern
- Jede Status- und Datenänderung an Aufträgen protokollieren (wer/Automatik, wann, Grund)
- Kleine, nachvollziehbare Schritte; nach jedem Schritt im Shop testen; Prüfung: `bash .github/scripts/check-all.sh`

## Git
- Repository: git@github.com:Lohndruckerei/sw6-ordo.git (Branch `main`, vom Benutzer anzulegen)
- Zugriff über Deploy-Key `~/.ssh/ordo_deploy` (in `core.sshCommand` hinterlegt, ohne Passphrase)
- Nach jedem abgeschlossenen und im Shop getesteten Schritt committen und den aktuellen Branch pushen;
  halbfertige Zwischenstände nicht pushen. Kurz melden, was gepusht wurde (Commit-Hash).
- Nie force-pushen und keine Historie umschreiben, außer der Benutzer verlangt es ausdrücklich.
