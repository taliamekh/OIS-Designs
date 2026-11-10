# Integrated iOS and Android Hermes checkpoint

Both platforms compile from the same immutable unmodified production source b729696d… . iOS and Android source maps each match all 56 compiled app modules, including native platform adapters and the house/room integration. The three catalogue JSON input hashes are checked separately because Hermes source maps omit JSON-only modules. The [machine-readable summary](summary.json) pins exact source, compiler, output and audit hashes.

Actual Hermes v99 output sizes: iOS 7,484,064 bytes; Android 7,704,624 bytes. Headers match installed compiler260318099.0.5. Each export contains all 1,187 retained GLB revisions with exact hashes/bytes, totaling294,090,088 bytes; zero audit errors. No source changed in the frozen copy during export.

This extends the earlier825-model/native checkpoint to the completed retained library and newer house-view,inside-face,clearance/history/lock integration. Each UI/runtime test still retains its own source scope; one successful native export does not retrospectively verify every later UI revision.

Actual bytecode compilation/export only. Native linking,VM/device launch,EXGL texture decoding/upload,physical gestures,large OS text,FPS/thermals and OS interruption remain unverified. Original Phase1 physical acceptance and overallPhase2/3 gates remain open. No phone,SDK installation,production changes or Git mutation was used here. Work continues through at least06:53UTC.
