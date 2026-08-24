#!/usr/bin/env python3
"""Prepare and prove the canonical custom source used by Dinotty rebuilds."""

from __future__ import annotations

import argparse
import fnmatch
import json
import pathlib
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


def active_ledger_ids(repo: pathlib.Path) -> set[str]:
    active: set[str] = set()
    for line in (repo / "LOCAL_MODS.md").read_text().splitlines():
        if not line.startswith("| `"):
            continue
        fields = [field.strip() for field in line.split("|")[1:-1]]
        if len(fields) >= 7 and fields[4] in {"private", "candidate", "filed"}:
            active.add(fields[0].strip("`"))
    return active


def ownership(repo: pathlib.Path, ref: str) -> tuple[list[str], list[str]]:
    integration = config()["integration"]
    owners = integration["residual_owners"]
    configured_ids = {owner["mod_id"] for owner in owners}
    missing = active_ledger_ids(repo) - configured_ids
    if missing:
        raise ValueError("active ledger row(s) without residual owner: " + ", ".join(sorted(missing)))
    patterns = [pattern for owner in owners for pattern in owner["paths"]]
    paths = run(["git", "diff", "--name-only", f"upstream/dev..{ref}"], cwd=repo, capture=True)
    residual = [line for line in paths.splitlines() if line]
    require_allowlisted(residual, patterns)
    return residual, patterns


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
            f"[upstream-custom] conflicts preserved in {worktree}; resolve, update LOCAL_MODS.md, "
            f"commit, then run finish --worktree {worktree} --previous-ref {previous}",
            file=sys.stderr,
        )
        raise
    print(
        f"[upstream-custom] candidate prepared at {worktree}; update LOCAL_MODS.md for upstream "
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
