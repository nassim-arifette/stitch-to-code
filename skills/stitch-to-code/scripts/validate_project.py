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
    "CANONICAL",
    "RESPONSIVE_STATE",
    "ACCESSIBILITY_AUDIT",
    "VARIANT",
    "SUPERSEDED",
    "FUTURE_NO_CONTRACT",
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
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"Missing required file: {path}")
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON in {path}: {exc}")
    return None


def check_placeholders(root: Path, allow: bool, errors: list[str], warnings: list[str]) -> None:
    candidates = [
        root / ".stitch" / "metadata.json",
        root / "docs" / "ui" / "UI_PATTERNS.md",
        root / "docs" / "ui" / "UI_SURFACES.md",
    ]
    for path in candidates:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        hits = sorted(set(PLACEHOLDER_RE.findall(text)))
        if not hits:
            continue
        msg = f"{path.relative_to(root)} contains unresolved placeholders: {', '.join(hits[:8])}"
        if len(hits) > 8:
            msg += f" (+{len(hits)-8} more)"
        (warnings if allow else errors).append(msg)


def check_metadata(root: Path, data: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    if data.get("schemaVersion") != 2:
        errors.append("metadata.schemaVersion must be 2")

    active = data.get("activeProject")
    if not isinstance(active, dict):
        errors.append("metadata.activeProject must be an object")
        return

    for key in ("title", "projectId", "scope", "source", "lastSyncAt"):
        if key not in active or active[key] in ("", None):
            errors.append(f"metadata.activeProject.{key} is required")

    scope = active.get("scope")
    if scope not in ALLOWED_SCOPES and not is_placeholder(scope):
        errors.append(f"Unsupported activeProject.scope: {scope!r}")

    active_project_id = active.get("projectId")
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

        sid = screen.get("screenId")
        uxid = screen.get("uxId")
        kind = screen.get("kind")

        if not sid:
            errors.append(f"{loc}.screenId is required")
        elif not is_placeholder(sid):
            screen_ids[sid] = screen_ids.get(sid, 0) + 1
            by_screen[sid] = screen

        if not uxid:
            errors.append(f"{loc}.uxId is required")
        elif not is_placeholder(uxid):
            ux_ids[uxid] = ux_ids.get(uxid, 0) + 1

        if kind not in ALLOWED_KINDS and not is_placeholder(kind):
            errors.append(f"{loc}.kind has unsupported value: {kind!r}")

        pid = screen.get("projectId")
        if (
            pid
            and active_project_id
            and not is_placeholder(pid)
            and not is_placeholder(active_project_id)
            and pid != active_project_id
            and kind != "SUPERSEDED"
        ):
            errors.append(
                f"{loc} points to projectId {pid!r}, not active project {active_project_id!r}"
            )

        artifacts = screen.get("artifacts", {})
        if isinstance(artifacts, dict):
            for artifact_name, artifact in artifacts.items():
                if not isinstance(artifact, dict):
                    continue
                rel = artifact.get("path")
                expected = artifact.get("sha256")
                if not rel or is_placeholder(rel):
                    continue
                path = root / rel
                if not path.exists():
                    errors.append(f"{loc}.artifacts.{artifact_name}: missing file {rel}")
                    continue
                if expected and not is_placeholder(expected):
                    actual = sha256(path)
                    if actual.lower() != str(expected).lower():
                        errors.append(
                            f"{loc}.artifacts.{artifact_name}: SHA-256 mismatch for {rel}"
                        )

    for sid, count in screen_ids.items():
        if count > 1:
            errors.append(f"Duplicate screenId: {sid!r} appears {count} times")
    for uxid, count in ux_ids.items():
        if count > 1:
            errors.append(f"Duplicate uxId: {uxid!r} appears {count} times")

    # Validate supersededBy targets and cycles.
    edges: dict[str, str] = {}
    for sid, screen in by_screen.items():
        target = screen.get("supersededBy")
        if not target or is_placeholder(target):
            continue
        if target not in by_screen:
            errors.append(f"screenId {sid!r} supersededBy missing target {target!r}")
        else:
            edges[sid] = target

    visiting: set[str] = set()
    visited: set[str] = set()

    def walk(node: str, trail: list[str]) -> None:
        if node in visited:
            return
        if node in visiting:
            cycle_start = trail.index(node) if node in trail else 0
            cycle = trail[cycle_start:] + [node]
            errors.append("supersededBy cycle: " + " -> ".join(cycle))
            return
        visiting.add(node)
        target = edges.get(node)
        if target:
            walk(target, trail + [node])
        visiting.remove(node)
        visited.add(node)

    for node in list(edges):
        walk(node, [])


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate optional Stitch to Code Strict-mode tracking state."
    )
    parser.add_argument("--root", default=".", help="Target repository root.")
    parser.add_argument(
        "--allow-placeholders",
        action="store_true",
        help="Report unresolved Strict template placeholders as warnings instead of errors.",
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []

    metadata_path = root / ".stitch" / "metadata.json"
    patterns_path = root / "docs" / "ui" / "UI_PATTERNS.md"
    surfaces_path = root / "docs" / "ui" / "UI_SURFACES.md"
    strict_paths = (metadata_path, patterns_path, surfaces_path)
    strict_present = [path for path in strict_paths if path.exists()]

    if not strict_present:
        print("PASS: no Strict-mode Stitch to Code state detected; nothing to validate")
        print("INFO: validate .stitch/DESIGN.md separately with @google/design.md when available")
        return 0

    design_path = root / ".stitch" / "DESIGN.md"
    if not design_path.exists():
        errors.append(
            "Strict mode expects .stitch/DESIGN.md from the Stitch/DESIGN.md workflow; "
            "Stitch to Code does not create a replacement"
        )

    for path in strict_paths:
        if not path.exists():
            errors.append(
                f"Incomplete Strict mode: missing {path.relative_to(root)} "
                "while other Strict-mode state exists"
            )

    if metadata_path.exists():
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
