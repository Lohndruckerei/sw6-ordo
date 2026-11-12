# SOM-Spiegel – Vorschlag

SOM (`http://10.167.80.235:1234/som/`) ist das heutige Workflowsystem und ein **Produktivsystem**.
Am Original wird nichts gespeichert, geändert oder angeklickt, was etwas auslösen könnte. Bisher wurde
nur die Login-Seite einmal gelesen (PHP-Anwendung mit Sitzungs-Cookie).

Entschieden (2026-11-12): **Docker-Spiegel** – SOM läuft als Kopie isoliert auf dem Entwicklungsrechner.

## Was ich brauche (vom Administrator)

1. **Programmcode:** Archiv des SOM-Verzeichnisses (z. B. `tar czf som-code.tgz /pfad/zu/som`),
   inkl. `includes/` und Konfigurationsdateien.
2. **Datenbank-Dump:** nur lesend erzeugt, z. B.
   `mysqldump --single-transaction --quick --routines --triggers <db> | gzip > som-db.sql.gz`
   (sperrt keine Tabellen; am besten außerhalb der Hauptarbeitszeit).
3. **Eckdaten:** PHP-Version, Datenbank (MySQL/MariaDB + Version), Webserver, verwendete PHP-Erweiterungen,
   Cronjobs (`crontab -l`), angebundene Dienste (Mailserver, FTP, Shop-Schnittstellen, Drucker).
4. Optional: ein Test-Login für die Kopie (oder ich setze im Spiegel ein Passwort neu).

Ablage: `~/projekte/sw6-entwicklung-lohndruckerei/docker/som-spiegel/daten/` – **nicht versioniert**
(enthält Kundendaten, DSGVO). Nach Abschluss der Auswertung löschen.

## Aufbau

- Eigener Compose-Ordner `docker/som-spiegel/` mit `php:<version>-apache` und `mariadb:<version>`,
  getrennt vom Shopware-Container.
- **Abgeschottet:** eigenes Docker-Netz ohne Route ins Firmennetz (`internal: true`), Ports nur auf
  `127.0.0.1`. So kann die Kopie weder Mails versenden noch das Original, FTP-Server oder Lieferanten
  erreichen.
- Mails landen in **Mailpit** (sichtbar, aber nie zugestellt).
- Keine Cronjobs; Konfiguration (DB-Zugang, Mailserver, externe URLs) im Spiegel auf lokale Werte
  umgestellt, bevor die Anwendung das erste Mal startet.
- Optional anonymisieren (Namen, Mail-Adressen, Telefon), falls die Daten den Rechner verlassen könnten.

## Auswertung

Ergebnis kommt nach `docs/SOM-AUSWERTUNG.md`: Statusliste und Übergänge, Bildschirme je Rolle,
Mailtexte und -anlässe, Felder je Auftrag, Sonderfälle, Kennzahlen. Daraus werden Statusmodell
(KONZEPT 4) und offene Entscheidungen (KONZEPT 11) geschärft; nichts wird 1:1 übernommen, ohne es mit
dem Benutzer abzustimmen.

## Umgesetzt (2026-11-12)

- Ordner `docker/som-spiegel/` im Oberverzeichnis: `docker-compose.yml`, `Dockerfile` (PHP 7.4 + Apache wie
  XAMPP, Erweiterungen aus der php.ini), `proxy.conf`. Daten in `daten/` (nicht versioniert).
- SOM-PC: XAMPP, PHP 7.4.33, MariaDB 10.4.27, Datenbank `somsystem` (62 Tabellen, InnoDB), Code unter
  `C:\xampp\htdocs\som`, Apache auf Port 1234.
- Start: `cd docker/som-spiegel && docker compose up -d` → SOM http://localhost:1234/som/ ,
  abgefangene Mails http://localhost:8025 . Ende der Auswertung: `docker compose down -v` und `daten/` löschen.
- Geprüft: Der SOM-Container erreicht weder das Internet noch das Original (10.167.80.235).
- Code wird unter `daten/code/som/` erwartet (entpacktes Verzeichnis `som`).
