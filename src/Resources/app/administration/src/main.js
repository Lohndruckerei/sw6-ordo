// Admin-Design: generiert aus ~/projekte/sw6-entwicklung-lohndruckerei/ld-admin-design (dort ändern, nicht hier)
import './ld-admin-design';
import './module/ld-ordo';

import deDE from './snippet/de-DE.json';
import enGB from './snippet/en-GB.json';

Shopware.Locale.extend('de-DE', deDE);
Shopware.Locale.extend('en-GB', enGB);
