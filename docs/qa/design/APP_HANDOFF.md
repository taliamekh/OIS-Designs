# Exact app repair handoff — native surface maps

QA-NATIVE01 reproduction is executable with the bundled Node runtime:

```powershell
& 'C:\Users\talia\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' docs\qa\design\native-texture-source-probe.cjs
```

The probe extracts and executes the actual RoomScene raw.map callback. Input matches installed Fiber9.8.2/native TextureLoader output: base THREE.Texture, `image={data:{localUri},width,height}`, `isDataTexture=true`. Prior output lost that flag at t.clone(); source locations, package versions and hashes are pinned in native-texture-source-probe.json. Exact reasoning and primary docs are in NATIVE_SOURCE_AUDIT.md.

The latest source conditionally preserves that adapter flag. Focused actual-callback retest passes3 cases, coordinator passes24 cases, and actual browser material workflow passes8 cases with visually inspected distinct maps/no captured errors. Source-contract repair is accepted. This is a handoff of the exact fixture, not a request for the absent user or authorization to change unrelated files. App owns production; QA writes only its reports/harnesses. Physical EXGL is still untested.
