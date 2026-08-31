#!/usr/bin/env python3
"""Initialize optional Stitch to Code Strict-mode project state.

Lite mode intentionally creates no Stitch to Code files. It uses the Stitch
DESIGN.md that the project already has plus the current Stitch reference and
repository context.

Stitch to Code never generates .stitch/DESIGN.md. That file belongs to the
Stitch design workflow and should be created/synthesized there, then preserved
and augmented in place only when needed.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
TEMPLATES = SKILL_DIR / "assets" / "templates"


def write_template(src_name: str, dest: Path, replacements: dict[str, str], force: bool) -> str:
    src = TEMPLATES / src_name
    text = src.read_text(encoding="utf-8")
    for old, new in replacements.items():
        text = text.replace(old, new)

    if dest.exists() and not force:
        return f"SKIP  {dest} (exists)"

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")
    return f"WRITE {dest}"


def design_status(root: Path) -> tuple[Path, str]:
    design_path = root / ".stitch" / "DESIGN.md"
    if design_path.exists():
        return design_path, f"KEEP  {design_path} (Stitch-owned; not modified)"
    return design_path, (
        f"MISS  {design_path} "
        "(generate/sync it through Stitch or the official Stitch design-md workflow)"
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Initialize optional Stitch to Code Strict-mode state."
    )
    parser.add_argument("--root", default=".", help="Target repository root.")
    parser.add_argument(
        "--mode",
        choices=("lite", "strict"),
        default="lite",
        help="Lite is a no-op; Strict creates explicit tracking state.",
    )
    parser.add_argument("--project-name", default="[PROJECT_NAME]")
    parser.add_argument("--project-title", default="[STITCH_PROJECT_TITLE]")
    parser.add_argument("--project-id", default="[STITCH_PROJECT_ID]")
    parser.add_argument(
        "--scope",
        choices=("RESPONSIVE_WEB", "NATIVE", "UNIVERSAL"),
        default="RESPONSIVE_WEB",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite Stitch to Code-owned Strict-mode initialized files.",
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    design_path, design_line = design_status(root)

    if args.mode == "lite":
        print(f"Lite mode needs no Stitch to Code initialization at {root}")
        print(design_line)
        print("WRITE none (Lite adds no Stitch to Code project files)")
        print()
        print("Use the skill directly with the current Stitch reference and repository context.")
        if not design_path.exists():
            print("Generate/sync .stitch/DESIGN.md through the Stitch design workflow when your workflow uses it.")
        return 0

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    replacements = {
        "[PROJECT_NAME]": args.project_name,
        "[STITCH_PROJECT_TITLE]": args.project_title,
        "[STITCH_PROJECT_ID]": args.project_id,
        "[RESPONSIVE_WEB | NATIVE | UNIVERSAL]": args.scope,
        "[ISO-8601]": now,
    }

    stitch_dir = root / ".stitch"
    stitch_dir.mkdir(parents=True, exist_ok=True)

    outputs: list[str] = [design_line]
    outputs.append(
        write_template(
            "STITCH_METADATA.template.json",
            stitch_dir / "metadata.json",
            replacements,
            args.force,
        )
    )

    for path in (
        stitch_dir / "designs" / "source",
        stitch_dir / "designs" / "derived",
        stitch_dir / "designs" / "qa",
    ):
        path.mkdir(parents=True, exist_ok=True)

    outputs.append(
        write_template(
            "UI_PATTERNS.template.md",
            root / "docs" / "ui" / "UI_PATTERNS.md",
            replacements,
            args.force,
        )
    )
    outputs.append(
        write_template(
            "UI_SURFACES.template.md",
            root / "docs" / "ui" / "UI_SURFACES.md",
            replacements,
            args.force,
        )
    )

    print(f"Initialized STRICT mode at {root}")
    for line in outputs:
        print(line)
    print("DIR   .stitch/designs/{source,derived,qa}")
    print()
    print("Next:")
    if not design_path.exists():
        print("1. Generate/sync .stitch/DESIGN.md through Stitch (or Google's Stitch design-md/extract-design-md skill).")
        print("2. Let Stitch to Code preserve it and augment only missing, confirmed visual rules.")
        next_number = 3
    else:
        print("1. Keep the existing Stitch DESIGN.md; augment it only when a confirmed visual rule is missing.")
        next_number = 2
    print(f"{next_number}. Fill remaining Strict-mode placeholders that are relevant to your project.")
    print(f"{next_number + 1}. Remove unused template sections instead of keeping speculative rules.")
    print(f"{next_number + 2}. Run validate_project.py --root <repo> (use --allow-placeholders while editing).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
