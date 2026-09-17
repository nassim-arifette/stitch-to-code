"""Stdlib regressions, not an agent benchmark. Run: python -m unittest discover -s tests -v."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skills/stitch-to-code/scripts"


def module(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


validator = module("validate_project")
initializer = module("init_project")
BASE = {"schemaVersion": 2, "activeProject": {"title": "Test", "projectId": "p1", "scope": "RESPONSIVE_WEB",
    "source": "Google Stitch", "lastSyncAt": "2026-09-17T00:00:00Z"}, "screens": [
    {"screenId": "s1", "uxId": "UX-1", "kind": "CANONICAL", "projectId": "p1", "artifacts": {}}]}


class StrictTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def check(self, data):
        errors = []
        validator.check_metadata(self.root, data, errors, [])
        return errors

    def cli(self):
        return subprocess.run([sys.executable, str(SCRIPTS / "validate_project.py"), "--root", str(self.root)],
                              capture_output=True, text=True, timeout=10)

    def test_lite_noop_and_design_untouched(self):
        design = self.root / ".stitch/DESIGN.md"
        design.parent.mkdir(); design.write_text("Legacy design, owned elsewhere")
        before = design.read_bytes()
        result = subprocess.run([sys.executable, str(SCRIPTS / "init_project.py"), "--root", str(self.root)],
                                capture_output=True, timeout=10)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.cli().returncode, 0)
        self.assertEqual(design.read_bytes(), before)
        self.assertFalse((self.root / ".stitch/metadata.json").exists())

    def test_valid_metadata(self):
        self.assertEqual(self.check(copy.deepcopy(BASE)), [])

    def test_nonobject_json(self):
        file = self.root / "metadata.json"
        for value in ([], None, "text", 12):
            with self.subTest(value=value):
                file.write_text(json.dumps(value))
                errors = []
                self.assertIsNone(validator.load_json(file, errors))
                self.assertTrue(errors)

    def test_wrong_field_types_do_not_crash(self):
        for location, key in (("activeProject", "scope"), ("activeProject", "title"), ("screen", "screenId"),
                              ("screen", "kind"), ("screen", "uxId"), ("screen", "supersededBy")):
            for value in ([], {}, 12, True):
                with self.subTest(location=location, key=key, value=value):
                    data = copy.deepcopy(BASE)
                    (data["activeProject"] if location == "activeProject" else data["screens"][0])[key] = value
                    self.assertTrue(self.check(data))

    def test_malformed_artifacts(self):
        for value in ([], {"png": []}, {"png": {"path": []}}, {"png": {"path": "x", "sha256": {}}}):
            with self.subTest(value=value):
                data = copy.deepcopy(BASE); data["screens"][0]["artifacts"] = value
                self.assertTrue(self.check(data))

    def test_hash_and_missing_artifacts(self):
        file = self.root / "screen.html"; file.write_bytes(b"screen")
        data = copy.deepcopy(BASE)
        data["screens"][0]["artifacts"] = {"html": {"path": "screen.html", "sha256": hashlib.sha256(b"screen").hexdigest()}}
        self.assertEqual(self.check(data), [])
        file.write_bytes(b"changed")
        self.assertTrue(any("mismatch" in e for e in self.check(data)))
        file.unlink()
        self.assertTrue(self.check(data))

    def test_paths_cannot_escape_or_hash_directories(self):
        for value in ("../outside.html", str(self.root / "absolute.html"), "."):
            data = copy.deepcopy(BASE); data["screens"][0]["artifacts"] = {"html": {"path": value}}
            self.assertTrue(self.check(data))

    def test_symlink_escape(self):
        with tempfile.TemporaryDirectory() as outside:
            target = Path(outside) / "secret"; target.write_text("fixture")
            try: (self.root / "link").symlink_to(target)
            except (OSError, NotImplementedError): self.skipTest("Symlinks unavailable")
            data = copy.deepcopy(BASE); data["screens"][0]["artifacts"] = {"html": {"path": "link"}}
            self.assertTrue(any("within" in e for e in self.check(data)))

    def test_duplicate_and_broken_supersession(self):
        data = copy.deepcopy(BASE); data["screens"].append(copy.deepcopy(data["screens"][0]))
        self.assertTrue(any("Duplicate" in e for e in self.check(data)))
        data = copy.deepcopy(BASE); data["screens"][0]["supersededBy"] = "missing"
        self.assertTrue(any("missing target" in e for e in self.check(data)))

    def test_long_history_and_cycle(self):
        data = copy.deepcopy(BASE)
        data["screens"] = [{"screenId": f"s{i}", "uxId": f"UX-{i}", "kind": "SUPERSEDED",
                            "supersededBy": f"s{i+1}" if i < 1499 else None} for i in range(1500)]
        self.assertEqual(self.check(data), [])
        data["screens"][-1]["supersededBy"] = "s0"
        self.assertTrue(any("cycle" in e for e in self.check(data)))

    def test_incomplete_strict_and_invalid_utf8_fail_without_traceback(self):
        (self.root / ".stitch").mkdir()
        file = self.root / ".stitch/metadata.json"; file.write_bytes(b"\xff")
        result = self.cli()
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("Traceback", result.stderr)

    def test_json_template_escapes_user_values_and_preserves_literals(self):
        templates = self.root / "templates"; templates.mkdir()
        (templates / "test.json").write_text('{"title":"[TITLE]","id":"[ID]"}')
        text = 'A "quoted" title\\path\n[ID]'
        dest = self.root / "result.json"
        with patch.object(initializer, "TEMPLATES", templates):
            initializer.write_template("test.json", dest, {"[TITLE]": text, "[ID]": "actual-id"}, False)
            self.assertEqual(json.loads(dest.read_text()), {"title": text, "id": "actual-id"})
            before = dest.read_bytes()
            initializer.write_template("test.json", dest, {"[TITLE]": "different", "[ID]": "id"}, False)
            self.assertEqual(dest.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
