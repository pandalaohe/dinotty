#!/usr/bin/env python3
import importlib.util
import pathlib
import subprocess
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_module(name: str, relative: str):
    path = ROOT / relative
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class UpstreamPrToolTests(unittest.TestCase):
    def test_private_paths_are_rejected(self):
        tool = load_module("upstream_pr", "scripts/upstream_pr.py")
        for path in (
            "LOCAL_MODS.md",
            ".upstream-update.json",
            "scripts/dinotty-ops.sh",
            "artifacts/result.json",
            "docs/task-files/private.md",
        ):
            with self.subTest(path=path):
                with self.assertRaisesRegex(ValueError, "private or internal"):
                    tool.validate_export_paths([path])

    def test_product_paths_are_accepted(self):
        tool = load_module("upstream_pr_product", "scripts/upstream_pr.py")
        paths = [
            "frontend/src/App.vue",
            "frontend/src/test/appPaneClose/system-keyboard.test.ts",
        ]
        self.assertEqual(tool.validate_export_paths(paths), paths)


class UpstreamCustomToolTests(unittest.TestCase):
    def test_residual_paths_must_be_allowlisted(self):
        tool = load_module("upstream_custom", "scripts/upstream_custom.py")
        patterns = ["frontend/src/**", "src/**", "LOCAL_MODS.md"]
        tool.require_allowlisted(
            ["frontend/src/App.vue", "src/session/mod.rs", "LOCAL_MODS.md"], patterns
        )
        with self.assertRaisesRegex(ValueError, "unowned residual"):
            tool.require_allowlisted(["mystery/private.txt"], patterns)

    def test_rebuild_entrypoints_enforce_preflight_internally(self):
        body = (ROOT / "scripts/dinotty-ops.sh").read_text()
        for function in ("rebuild_prod", "rebuild_test"):
            start = body.index(f"{function}()")
            end = body.index("\n}", start)
            self.assertIn("preflight", body[start:end])
            self.assertIn("assert_source_unchanged", body[start:end])
        launcher = (ROOT / "scripts/dinotty").read_text()
        self.assertNotIn("DINOTTY_SKIP_PREFLIGHT", launcher)

    def test_cleanliness_allows_internal_untracked_but_rejects_build_source(self):
        tool = load_module("upstream_custom_clean", "scripts/upstream_custom.py")
        with tempfile.TemporaryDirectory() as directory:
            repo = pathlib.Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
            (repo / "README.md").write_text("ok\n")
            subprocess.run(["git", "add", "README.md"], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "base"], cwd=repo, check=True)
            (repo / "artifacts").mkdir()
            (repo / "artifacts/result.txt").write_text("ignored by build\n")
            tool.require_build_source_clean(repo)
            (repo / "frontend").mkdir()
            (repo / "frontend/new.ts").write_text("build input\n")
            with self.assertRaisesRegex(RuntimeError, "build-bearing source is dirty"):
                tool.require_build_source_clean(repo)


if __name__ == "__main__":
    unittest.main()
