# Ordo – Schnittstellen zu den anderen Plugins

Grundsatz: lose Kopplung. IDs ohne Fremdschlüssel, Aufrufe nur, wenn das andere Plugin aktiv ist
(Service per `has()` bzw. Klassenname prüfen), Daten bevorzugt über Events. Jedes Plugin bleibt allein
lauffähig. Änderungen hier und im jeweiligen Plugin-Dokument gemeinsam pflegen.

## Mensura (vorhanden)

| Was | Wo | Nutzung in Ordo |
|---|---|---|
| Konfiguration je Position | Payload `ldMensura` (schema, calculation, material, format, area, weight, motifs, options[group/value], delivery, reference, sku, configuration) – `LineItemFactory` | Anzeige, Routing in Opus, Prüf-Sollwerte in Proba |
| Liefertermin je Position | Payload `ldDeliveryDate` | Termin (über LieferLotse `DeliveryDateResolver`) |
| Schnappschuss | `ld_mensura_order_line_item` (Extension `orderLineItem.extensions.ldMensura`): `supplierId` (Vorschlag), `supplierProductNumber`, `purchaseTotal` (EK), `saleTotal` (VK), `breakdown` | Lieferantenvorschlag, Marge |
| EK-Schutz | Recht `ld_mensura.purchase`, `PurchaseFieldGuard` | Ordo zeigt EK/Marge nur mit diesem Recht; eigenes Recht `ld_ordo.purchase` setzt es voraus |
| Reserviert | `ldMensura.artwork` | Verknüpfung zu Proba |

Mensura löst derzeit **keine eigenen Events** aus; Neuberechnung bei Auftragsänderung über die
Mensura-Store/Admin-API bzw. einen noch zu vereinbarenden Service (bei Mensura anfragen, nicht kopieren).

## LieferLotse (vorhanden)

| Was | Nutzung |
|---|---|
| `SupplierResolver::resolveOrder()` | Kandidaten je Position |
| `SupplierOrderBuilder::build($order, $supplierId, $ctx, $lineItemIds)` | Lieferantenbestellung bauen |
| `SupplierOrderService::send()` | übertragen; Ergebnis speichert **Ordo** in `ld_ordo_supplier_order` (LieferLotse speichert nichts) |
| `SupplierOrderRequestedEvent::veto()` | Ordo verhindert Senden, solange das Freigabe-Tor zu ist |
| Flow `lieferlotse.supplier_order.sent/failed` | Status der Lieferantenbestellung |
| `lieferlotse.supplier_order.shipping_confirmed` | **nur vorbereitet**, wird noch nicht ausgelöst – Auswertung der Versandmitteilungen kommt mit Vectura (Parser auf `SupplierFileReceivedEvent`) |
| Mail-Typ `ld_supplier_order_cancel` | Storno beim Umleiten; Ordo befüllt den Grund |
| Zweck `artwork_out`, `ld_supplier_artwork` | freigegebene Druckdaten (aus Proba) senden |

## Vectura (in Entwicklung, bisher nur Konzept)

| Geplant in Vectura | Nutzung in Ordo |
|---|---|
| `ScheduleService` / `POST /api/_action/ld-vectura/schedule/{orderId}/{confirm\|hold\|resume\|reschedule}`, Recht `ld_vectura.schedule`, Events `vectura.schedule.confirmed/changed` | Terminbestätigung und -verschiebung |
| `ShipmentService`, Entity `ld_vectura_shipment`, Event `vectura.shipment.created`, Mail-Typ `lv_shipment_notice` | Versandarbeitsplatz, Versandmitteilung an Kunden |
| Versandmitteilungen aus Lieferanten-Dateien (Comdatek-XML, Mail) | Status „versendet“ der Lieferantenbestellung |
| GLS-Labels (ShipIT) – im Vectura-Konzept dem Workflow zugewiesen | Abstimmen: Label-Erzeugung als Service in Vectura, Bedienung im Ordo-Versandarbeitsplatz |
| `order.customFields.ld_delivery_date` | Gesamttermin |

**Lücke:** Ein **Lieferschein** ist in keinem Plugin geplant → Shopware-Dokument „Lieferschein“ nutzen,
von Ordo/Versandarbeitsplatz ausgelöst.

## Proba und Opus (neu)

Siehe deren `docs/KONZEPT.md`, Abschnitt Schnittstellen. Ordo liest den Status über
`ArtworkStatusProvider` bzw. `JobStatusProvider` und hört auf `proba.artwork.*` und `opus.*`.

## Belegte Namen

| Plugin | Admin-Präfix | Tabellen | ACL | Migrationen ab |
|---|---|---|---|---|
| LieferLotse | `ld-` | `ld_supplier*` | `ld_supplier` | 1794004200 |
| Mensura | `lm-` | `ld_mensura_*` | `ld_mensura` | 1794120000 |
| Vectura | `lv-` | `ld_vectura_*` | `ld_vectura` | – |
| **Ordo** | `lo-` | `ld_ordo_*` | `ld_ordo` | **1795000000** |
| **Proba** | `lp-` | `ld_proba_*` | `ld_proba` | **1795500000** |
| **Opus** | `lu-` | `ld_opus_*` | `ld_opus` | **1796000000** |

Flow-Ereignisse: `ordo.*`, `proba.*`, `opus.*`.
