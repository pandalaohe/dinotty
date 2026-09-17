#!/usr/bin/env python3
"""Prepare and prove the canonical custom source used by Dinotty rebuilds."""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time


ROOT = pathlib.Path(__file__).resolve().parents[1]
FORK_GUARD = pathlib.Path(
    "/Volumes/Dev/ai/core/share/codex/skills/upstream-update/scripts/fork_guard.py"
)


def run(args: list[str], cwd: pathlib.Path = ROOT, *, capture: bool = False) -> str:
    result = subprocess.run(args, cwd=cwd, check=True, text=True, capture_output=capture)
    return result.stdout.strip() if capture else ""


def require_build_source_clean(repo: pathlib.Path) -> None:
    status = run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=repo, capture=True)
    blocked: list[str] = []
    for line in status.splitlines():
        state, path = line[:2], line[3:]
        if state != "??" or path.startswith(("frontend/", "src/", "src-tauri/")):
            blocked.append(line)
    if blocked:
        raise RuntimeError("build-bearing source is dirty:\n" + "\n".join(blocked))


def config() -> dict:
    return json.loads((ROOT / ".upstream-update.json").read_text())


def require_allowlisted(paths: list[str], patterns: list[str]) -> None:
    unowned = [path for path in paths if not any(fnmatch.fnmatch(path, p) for p in patterns)]
    if unowned:
        raise ValueError("unowned residual path(s): " + ", ".join(unowned))


def fetch() -> str:
    run(["git", "fetch", "upstream", "+refs/heads/dev:refs/remotes/upstream/dev"])
    return run(["git", "rev-parse", "upstream/dev"], capture=True)


def canonical_custom_path(repo: pathlib.Path = ROOT) -> pathlib.Path:
    output = run(["git", "worktree", "list", "--porcelain"], cwd=repo, capture=True)
    worktree: pathlib.Path | None = None
    for line in output.splitlines():
        if line.startswith("worktree "):
            worktree = pathlib.Path(line.removeprefix("worktree "))
        elif line == "branch refs/heads/custom" and worktree is not None:
            return worktree
    raise RuntimeError("cannot locate the worktree owning refs/heads/custom")


def collab_root(repo: pathlib.Path) -> pathlib.Path | None:
    try:
        common = run(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            cwd=repo,
            capture=True,
        )
    except subprocess.CalledProcessError:
        return None
    if not common:
        return None
    directory = pathlib.Path(common).parent
    for candidate in (directory, *directory.parents):
        if (candidate / ".collab-root").exists():
            return candidate
    return None


def resolve_collab() -> tuple[list[str], dict[str, str]]:
    executable = shutil.which("collab")
    if executable is not None:
        return [executable], {}
    source = os.environ.get("COLLAB_SRC")
    if not source:
        raise RuntimeError("collab kit unresolvable: install collab on PATH or set COLLAB_SRC")
    package = str(pathlib.Path(source) / "src")
    existing = os.environ.get("PYTHONPATH")
    path = f"{package}{os.pathsep}{existing}" if existing else package
    return [sys.executable, "-m", "collab"], {"PYTHONPATH": path}


def mods_validate(repo: pathlib.Path, ref: str) -> tuple[int, dict]:
    root = collab_root(repo)
    if root is None:
        raise RuntimeError(f"no collab root above {repo}")
    argv, extra_env = resolve_collab()
    completed = subprocess.run(
        [
            *argv,
            "mods",
            "validate",
            "--git",
            "--component",
            "dinotty",
            "--head",
            f"dinotty={ref}",
            "--root",
            str(root),
        ],
        cwd=repo,
        env={**os.environ, **extra_env},
        check=False,
        capture_output=True,
        text=True,
    )
    try:
        envelope = json.loads(completed.stdout)
    except ValueError as error:
        raise RuntimeError(
            f"collab mods validate: unparsable output (exit {completed.returncode}): {error}"
        ) from error
    if not isinstance(envelope, dict):
        raise RuntimeError(
            f"collab mods validate: output is not an envelope object (exit {completed.returncode})"
        )
    return completed.returncode, envelope


def ownership(repo: pathlib.Path, ref: str) -> tuple[list[str], list[str]]:
    exit_code, envelope = mods_validate(repo, ref)
    if envelope.get("ok") is False:
        error = envelope.get("error") or {}
        failures = (error.get("detail") or {}).get("errors") or []
        named = "; ".join(
            f"{finding.get('code')}: {finding.get('detail')}" for finding in failures
        )
        message = f"local_mods validate refused: {error.get('code')}: {error.get('message')}"
        raise ValueError(f"{message} ({named})" if named else message)
    if envelope.get("ok") is not True:
        raise RuntimeError(f"collab mods validate exited {exit_code}: envelope has no ok flag")
    if exit_code != 0:
        raise RuntimeError(f"collab mods validate exited {exit_code} with an ok envelope")
    result = envelope.get("result")
    ownership_map = result.get("ownership") if isinstance(result, dict) else None
    component = ownership_map.get("dinotty") if isinstance(ownership_map, dict) else None
    if not isinstance(component, dict):
        raise RuntimeError(
            f"collab mods validate exited {exit_code}: "
            "result.ownership.dinotty is missing or not an object"
        )
    def string_list(field: str) -> list[str]:
        value = component.get(field)
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise RuntimeError(
                f"collab mods validate exited {exit_code}: "
                f"result.ownership.dinotty.{field} is missing or not a list of strings"
            )
        return list(value)

    return string_list("residual"), string_list("patterns")


def run_steps(repo: pathlib.Path, key: str) -> None:
    for step in config()[key]["steps"]:
        print(f"[upstream-custom] {key} {step['id']}: {' '.join(step['argv'])}")
        subprocess.run(
            step["argv"], cwd=repo / step["cwd"], check=True, timeout=step["timeout_s"]
        )


def guard(repo: pathlib.Path, ref: str, previous: str, patterns: list[str]) -> None:
    command = [
        "python3",
        str(FORK_GUARD),
        "check-integration",
        "--repo",
        str(repo),
        "--upstream-ref",
        "upstream/dev",
        "--integration-ref",
        ref,
        "--previous-ref",
        previous,
        "--ledger",
        "LOCAL_MODS.md",
    ]
    for pattern in patterns:
        command += ["--allow-path", pattern]
    run(command, cwd=repo)


def check(args: argparse.Namespace) -> None:
    canonical = canonical_custom_path()
    if ROOT != canonical:
        raise RuntimeError(f"check must run from canonical custom worktree: {canonical}")
    upstream = fetch()
    ref = args.ref
    require_build_source_clean(ROOT)
    if run(["git", "branch", "--show-current"], capture=True) != "custom":
        raise RuntimeError("canonical worktree must be on custom")
    behind = int(run(["git", "rev-list", "--count", f"{ref}..upstream/dev"], capture=True))
    if behind:
        raise RuntimeError(f"{ref} is behind upstream/dev by {behind} commit(s)")
    residual, _ = ownership(ROOT, ref)
    if args.full:
        run_steps(ROOT, "survival")
        run_steps(ROOT, "verify")
    print(
        f"[upstream-custom] READY ref={run(['git', 'rev-parse', ref], capture=True)} "
        f"upstream={upstream} residual_paths={len(residual)} dirty=0"
    )


def prepare(args: argparse.Namespace) -> None:
    canonical = canonical_custom_path()
    if ROOT != canonical:
        raise RuntimeError(f"prepare must run from canonical custom worktree: {canonical}")
    if run(["git", "branch", "--show-current"], capture=True) != "custom":
        raise RuntimeError("prepare must run from canonical custom")
    require_build_source_clean(ROOT)
    upstream = fetch()
    previous = run(["git", "rev-parse", "custom"], capture=True)
    behind = int(run(["git", "rev-list", "--count", "custom..upstream/dev"], capture=True))
    if not behind:
        print(f"[upstream-custom] already contains upstream/dev@{upstream}")
        return
    stamp = time.strftime("%Y%m%d-%H%M%S")
    branch = args.branch or f"codex/custom-align-{stamp}"
    worktree = pathlib.Path(args.worktree or f"/Volumes/Dev/ai/sandbox/dinotty-custom-align-{stamp}")
    tag = f"pre-update-custom-{stamp}"
    run(["git", "tag", tag, previous])
    run(["git", "worktree", "add", "-b", branch, str(worktree), previous])
    try:
        run(["git", "merge", "--no-edit", "upstream/dev"], cwd=worktree)
    except subprocess.CalledProcessError:
        print(
            f"[upstream-custom] conflicts preserved in {worktree}; resolve, "
            f"update local_mods (collab mods set), "
            f"commit, then run finish --worktree {worktree} --previous-ref {previous}",
            file=sys.stderr,
        )
        raise
    print(
        f"[upstream-custom] candidate prepared at {worktree}; "
        f"update local_mods (collab mods set) for upstream "
        f"{upstream}, commit it, then run finish --worktree {worktree} --previous-ref {previous}"
    )


def finish(args: argparse.Namespace) -> None:
    repo = pathlib.Path(args.worktree).resolve()
    canonical = canonical_custom_path(repo)
    require_build_source_clean(repo)
    fetch()
    candidate = run(["git", "rev-parse", "HEAD"], cwd=repo, capture=True)
    behind = int(run(["git", "rev-list", "--count", f"{candidate}..upstream/dev"], capture=True))
    if behind:
        raise RuntimeError(f"candidate is already behind upstream/dev by {behind} commit(s)")
    _, patterns = ownership(repo, candidate)
    run_steps(repo, "survival")
    run_steps(repo, "verify")
    guard(repo, candidate, args.previous_ref, patterns)
    if run(["git", "rev-parse", "custom"], cwd=canonical, capture=True) != args.previous_ref:
        raise RuntimeError("canonical custom moved after candidate creation; do not advance")
    require_build_source_clean(canonical)
    if run(["git", "branch", "--show-current"], cwd=canonical, capture=True) != "custom":
        raise RuntimeError("canonical worktree is no longer on custom; do not advance")
    run(["git", "merge", "--ff-only", candidate], cwd=canonical)
    print(f"[upstream-custom] canonical custom advanced to {candidate}; rebuild all is still not run")


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    sub = result.add_subparsers(dest="command", required=True)
    chk = sub.add_parser("check")
    chk.add_argument("--ref", default="custom")
    chk.add_argument("--full", action="store_true")
    chk.set_defaults(func=check)
    prep = sub.add_parser("prepare")
    prep.add_argument("--branch")
    prep.add_argument("--worktree")
    prep.set_defaults(func=prepare)
    finish_parser = sub.add_parser("finish")
    finish_parser.add_argument("--worktree", required=True)
    finish_parser.add_argument("--previous-ref", required=True)
    finish_parser.set_defaults(func=finish)
    return result


def main() -> int:
    try:
        args = parser().parse_args()
        args.func(args)
        return 0
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"upstream-custom: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
