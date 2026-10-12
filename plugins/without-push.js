// Graze only uses local notifications (the Reminder). expo-notifications always adds the
// push entitlement, which a free Apple account can't sign, so the build fails. Drop it.
// Keep this FIRST in app.json plugins: mods run last-registered-first, so it must run after
// expo-notifications has added the key.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
