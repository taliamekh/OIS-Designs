"""Read-only verification of the frozen furniture handoff and its dependencies.

This checks evidence bindings, not every model's visual/design quality or native GL.
"""
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FURNITURE = ROOT / "furniture"
RELEASE = FURNITURE / "releases/library-2026-11-10-r1"
issues = []


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        issues.append(message)


def bound_path(base, relative):
    path = (base / relative).resolve()
    if not path.is_relative_to(base.resolve()):
        raise ValueError(f"Escaping dependency path: {relative}")
    return path


milestone = read_json(RELEASE / "milestone.json")
for relative, expected in milestone["proofSha256"].items():
    path = bound_path(RELEASE, relative)
    require(path.is_file() and digest(path) == expected, f"Release proof: {relative}")

audit = read_json(RELEASE / "completion-audit.json")
manifest = read_json(RELEASE / "manifest.json")
require(audit["pass"] and not audit["errors"], "Producer completion audit is not passing")
require(digest(RELEASE / "manifest.json") == audit["manifestSha256"], "Manifest binding")
for relative, expected in audit["dependencySha256"].items():
    path = bound_path(FURNITURE, relative)
    require(path.is_file() and digest(path) == expected, f"Dependency: {relative}")

rows = {a["id"]: a for a in manifest["assets"]}
new = [a for a in manifest["assets"] if a["id"].startswith("ois.design.")]
accepted = [a for a in new if a["qualityStatus"] == "internally-accepted"]
variants = [a for a in new if a["qualityStatus"] == "reviewed-variant"]
require(len(new) == audit["newModelFiles"] == 439, "439 new model rows")
require(len(accepted) == audit["acceptedDistinct"] >= 300, "Distinct accepted count")
require(len(variants) == audit["reviewedVariants"], "Variant count")
require(len(accepted) + len(variants) == len(new), "Unreviewed/rework new model row")
require(len({a["familyId"] for a in accepted}) == len(accepted), "Repeated accepted family")
require(all(a["countEligible"] for a in accepted), "Ineligible accepted row")
require(not any(a["countEligible"] for a in variants), "Variant inflates distinct count")
require(Counter(a["roomTags"][0] for a in accepted) == audit["roomCoverage"], "Room coverage")
require(Counter(a["theme"] for a in accepted) == audit["themeCoverage"], "Theme coverage")

for a in audit["assets"]:
    current = rows.get(a["id"], {})
    require(all(current.get(k) == a[k] for k in ["version", "sha256", "qualityStatus"]), f"Release row: {a['id']}")
    report = read_json(bound_path(FURNITURE, a["formalReport"]))
    require(report["sha256"] == a["sha256"], f"Formal identity: {a['id']}")
    formal = report["report"]["issues"]
    require(formal["numErrors"] == formal["numWarnings"] == 0 and not formal["truncated"], f"Formal result: {a['id']}")
    contact = read_json(bound_path(FURNITURE, a["contactReport"]))
    require(contact["sha256"] == a["sha256"] and contact["sourceSha256"] == a["sourceModelSha256"], f"Contact identity: {a['id']}")
    require(contact["componentCount"] == a["contactComponents"], f"Contact component count: {a['id']}")

sizes = {"queen": (1.524, 2.032), "full": (1.3716, 1.905), "king": (1.9304, 2.032), "twin": (0.9652, 1.905)}
adult = {family: entries for family, entries in audit["bedFamilies"].items() if set(entries) == set(sizes)}
require(len(adult) == 12, "Twelve adult bed groups with four permitted mattress sizes")
for family, entries in adult.items():
    for size, entry in entries.items():
        a = rows.get(entry["id"], {})
        require(a.get("sha256") == entry["sha256"], f"Bed revision: {family}/{size}")
        require(all(abs(value - expected) < 1e-6 for value, expected in zip(entry["mattressMetres"][:2], sizes[size])), f"Mattress dimensions: {family}/{size}")

browser = read_json(RELEASE / "browser-import.json")
require(browser["sourceManifestSha256"] == audit["manifestSha256"], "Browser manifest binding")
require(browser["count"] == len(new) and browser["failed"] == 0 and not browser["errors"], "Producer browser import result")
browser_ids = {(a["id"], a["version"], a["sha256"]) for a in browser["rows"]}
require(browser_ids == {(a["id"], a["version"], a["sha256"]) for a in new}, "Producer browser exact revision coverage")

result = {
    "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
    "release": str(RELEASE.relative_to(ROOT)).replace("\\", "/"),
    "milestoneSha256": digest(RELEASE / "milestone.json"),
    "manifestSha256": audit["manifestSha256"],
    "dependencyFilesVerified": len(audit["dependencySha256"]),
    "newModelRows": len(new), "acceptedDistinct": len(accepted), "reviewedVariants": len(variants),
    "adultBedGroupsWithFourSizes": len(adult),
    "issues": issues,
    "limits": "Independent byte/count/report correspondence. Formal validator separately run by coordinator. Producer browser evidence is verified, not independently reexecuted here. Mattress values are declared metadata, not a new vertex measurement. Visual quality, construction safety, Expo adoption and physical devices remain separate.",
}
(ROOT / "docs/coordination/library-release-audit.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
raise SystemExit(bool(issues))
