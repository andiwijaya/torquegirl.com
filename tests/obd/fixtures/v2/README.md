# V2 representative corpus

All eight CSV fixtures in this directory are **synthetic / representative**, authored for deterministic tests. None is a genuine real-device export. Exporter labels describe supported header conventions and never certify a specific application/version.

| Fixtures | Coverage |
| --- | --- |
| torque-iso, torque-clock | Device/GPS time conventions, banked trims, oxygen bank/sensor, custom combined pressure, °F/°C, sparse values |
| fusion-seconds, fusion-banks | Time (sec)/(seconds), descriptive SAE-style aliases, km/h/mph, bank 1/2 trims, lambda/AFR separation |
| forscan-ms, forscan-mixed | time(ms), RPM(1/min), VSS, SHRTFT/LONGFT, TP/APP, O2S11/O2S21, semicolons, psi/kPa |
| generic-ambiguous, generic-tabs | Missing units, explicit manual time selection, ambiguous pressure, duplicate names, malformed record, custom text, bar and TSV |

Exporter docs establish that CSV exports exist, but do not supply a complete invariant schema: [Torque support](https://torque-bhp.com/community/main-forum/general-faq/paged/21/), [OBD Fusion](https://www.obdsoftware.net/software/obdfusiondesktop), [FORScan export discussion](https://forum.forscan.org/viewtopic.php?t=17696). No production compatibility claim is inferred from synthetic fixtures alone.
