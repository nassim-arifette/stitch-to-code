#!/usr/bin/env python3
"""Validate optional Stitch to Code Strict-mode tracking invariants."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
from typing import Any

ALLOWED_SCOPES = {"RESPONSIVE_WEB", "NATIVE", "UNIVERSAL"}
ALLOWED_KINDS = {
    "CANONICAL", "RESPONSIVE_STATE", "ACCESSIBILITY_AUDIT", "VARIANT",
    "SUPERSEDED", "FUTURE_NO_CONTRACT",
}
PLACEHOLDER_RE = re.compile(r"\[[A-Z][A-Z0-9_]*(?:\s*\|\s*[A-Z0-9_]+)*\]")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_placeholder(value: Any) -> bool:
    return isinstance(value, str) and bool(PLACEHOLDER_RE.search(value))


def load_json(path: Path, errors: list[str]) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            errors.append(f"{path}: JSON root must be an object")
            return None
        return data
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        errors.append(f"Cannot read metadata JSON {path}: {exc}")
    return None


def check_placeholders(root: Path, allow: bool, errors: list[str], warnings: list[str]) -> None:
    for rel in (".stitch/metadata.json", "docs/ui/UI_PATTERNS.md", "docs/ui/UI_SURFACES.md"):
        path = root / rel
        if not path.exists():
            continue
        try:
            hits = sorted(set(PLACEHOLDER_RE.findall(path.read_text(encoding="utf-8"))))
        except (OSError, UnicodeError) as exc:
            errors.append(f"Cannot read {rel}: {exc}")
            continue
        if hits:
            msg = f"{rel} contains unresolved placeholders: {', '.join(hits[:8])}"
            if len(hits) > 8:
                msg += f" (+{len(hits)-8} more)"
            (warnings if allow else errors).append(msg)


def string_field(data: dict[str, Any], key: str, loc: str, errors: list[str], *, required: bool = True) -> str | None:
    value = data.get(key)
    if not required and value in (None, ""):
        return None
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{loc}.{key} must be a non-empty string")
        return None
    return value


def check_artifacts(root: Path, artifacts: Any, loc: str, errors: list[str]) -> None:
    if not isinstance(artifacts, dict):
        errors.append(f"{loc} must be an object")
        return
    root = root.resolve()
    for name, artifact in artifacts.items():
        where = f"{loc}.{name}"
        if not isinstance(artifact, dict):
            errors.append(f"{where} must be an object")
            continue
        rel = string_field(artifact, "path", where, errors, required=False)
        expected = string_field(artifact, "sha256", where, errors, required=False)
        if not rel or is_placeholder(rel):
            continue
        try:
            source = Path(rel)
            resolved = (root / source).resolve()
            if source.is_absolute() or not resolved.is_relative_to(root):
                errors.append(f"{where}: artifact path must stay within the project root")
                continue
            if not resolved.is_file():
                errors.append(f"{where}: missing or non-file artifact {rel}")
                continue
            if expected and not is_placeholder(expected):
                if not re.fullmatch(r"[a-fA-F0-9]{64}", expected):
                    errors.append(f"{where}: sha256 must contain 64 hexadecimal characters")
                elif sha256(resolved).lower() != expected.lower():
                    errors.append(f"{where}: SHA-256 mismatch for {rel}")
        except (OSError, ValueError, RuntimeError) as exc:
            errors.append(f"{where}: cannot validate artifact {rel}: {exc}")


def check_metadata(root: Path, data: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    if not isinstance(data, dict):
        errors.append("metadata must be an object")
        return
    if data.get("schemaVersion") != 2:
        errors.append("metadata.schemaVersion must be 2")
    active = data.get("activeProject")
    if not isinstance(active, dict):
        errors.append("metadata.activeProject must be an object")
        return
    active_values = {
        key: string_field(active, key, "metadata.activeProject", errors)
        for key in ("title", "projectId", "scope", "source", "lastSyncAt")
    }
    scope = active_values["scope"]
    if scope and scope not in ALLOWED_SCOPES and not is_placeholder(scope):
        errors.append(f"Unsupported activeProject.scope: {scope!r}")
    active_project_id = active_values["projectId"]
    screens = data.get("screens", [])
    if not isinstance(screens, list):
        errors.append("metadata.screens must be an array")
        return

    screen_ids: dict[str, int] = {}
    ux_ids: dict[str, int] = {}
    by_screen: dict[str, dict[str, Any]] = {}
    for idx, screen in enumerate(screens):
        loc = f"metadata.screens[{idx}]"
        if not isinstance(screen, dict):
            errors.append(f"{loc} must be an object")
            continue
        sid = string_field(screen, "screenId", loc, errors)
        uxid = string_field(screen, "uxId", loc, errors)
        kind = string_field(screen, "kind", loc, errors)
        pid = string_field(screen, "projectId", loc, errors, required=False)
        for value, counts in ((sid, screen_ids), (uxid, ux_ids)):
            if value and not is_placeholder(value):
                counts[value] = counts.get(value, 0) + 1
        if sid and not is_placeholder(sid):
            by_screen[sid] = screen
        if kind and kind not in ALLOWED_KINDS and not is_placeholder(kind):
            errors.append(f"{loc}.kind has unsupported value: {kind!r}")
        if (pid and active_project_id and not is_placeholder(pid)
                and not is_placeholder(active_project_id) and pid != active_project_id
                and kind != "SUPERSEDED"):
            errors.append(f"{loc} points to projectId {pid!r}, not active project {active_project_id!r}")
        check_artifacts(root, screen.get("artifacts", {}), f"{loc}.artifacts", errors)
        string_field(screen, "supersededBy", loc, errors, required=False)

    for name, counts in (("screenId", screen_ids), ("uxId", ux_ids)):
        for value, count in counts.items():
            if count > 1:
                errors.append(f"Duplicate {name}: {value!r} appears {count} times")

    edges: dict[str, str] = {}
    for sid, screen in by_screen.items():
        target = screen.get("supersededBy")
        if not isinstance(target, str) or not target or is_placeholder(target):
            continue
        if target not in by_screen:
            errors.append(f"screenId {sid!r} supersededBy missing target {target!r}")
        else:
            edges[sid] = target

    # Iterative traversal also handles long screen histories without recursion errors.
    visited: set[str] = set()
    for start in edges:
        trail: list[str] = []
        positions: dict[str, int] = {}
        node = start
        while node in edges and node not in visited:
            if node in positions:
                cycle = trail[positions[node]:] + [node]
                errors.append("supersededBy cycle: " + " -> ".join(cycle))
                break
            positions[node] = len(trail)
            trail.append(node)
            node = edges[node]
        visited.update(trail)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate optional Stitch to Code Strict-mode tracking state.")
    parser.add_argument("--root", default=".", help="Target repository root.")
    parser.add_argument("--allow-placeholders", action="store_true",
                        help="Report unresolved Strict template placeholders as warnings instead of errors.")
    args = parser.parse_args()
    root = Path(args.root).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []
    metadata_path = root / ".stitch" / "metadata.json"
    strict_paths = (metadata_path, root / "docs/ui/UI_PATTERNS.md", root / "docs/ui/UI_SURFACES.md")
    if not any(path.exists() or path.is_symlink() for path in strict_paths):
        print("PASS: no Strict-mode Stitch to Code state detected; nothing to validate")
        print("INFO: validate .stitch/DESIGN.md separately with @google/design.md when available")
        return 0
    if not (root / ".stitch/DESIGN.md").is_file():
        errors.append("Strict mode expects .stitch/DESIGN.md from the Stitch/DESIGN.md workflow; "
                      "Stitch to Code does not create a replacement")
    for path in strict_paths:
        if not path.is_file():
            errors.append(f"Incomplete Strict mode: missing or non-file {path.relative_to(root)} "
                          "while other Strict-mode state exists")
    if metadata_path.is_file():
        data = load_json(metadata_path, errors)
        if data is not None:
            check_metadata(root, data, errors, warnings)
    check_placeholders(root, args.allow_placeholders, errors, warnings)
    for warning in warnings:
        print(f"WARN  {warning}")
    for error in errors:
        print(f"ERROR {error}")
    if errors:
        print(f"\nFAIL: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"PASS: 0 errors, {len(warnings)} warning(s)")
    print("INFO: validate .stitch/DESIGN.md separately with @google/design.md when available")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
