#!/usr/bin/env python3
"""Prepare, verify, and publish one clean upstream PR from a custom commit range."""

from __future__ import annotations

import argparse
import fnmatch
import json
import pathlib
import re
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
FORK_GUARD = pathlib.Path(
    "/Volumes/Dev/ai/core/share/codex/skills/upstream-update/scripts/fork_guard.py"
)
INFRA_GUARD = pathlib.Path("/Volumes/Dev/ai/core/scripts/infra-git-hygiene.sh")
DENIED_PATTERNS = (
    "LOCAL_MODS.md",
    ".upstream-update*",
    ".audit/**",
    ".collab/**",
    ".codex/**",
    ".claude/**",
    "artifacts/**",
    "docs/task-files/**",
    "scripts/dinotty",
    "scripts/dinotty-ops.sh",
    "scripts/upstream_*.py",
    "scripts/test-upstream-workflows.py",
)


def run(args: list[str], cwd: pathlib.Path = ROOT, *, capture: bool = False) -> str:
    result = subprocess.run(args, cwd=cwd, check=True, text=True, capture_output=capture)
    return result.stdout.strip() if capture else ""


def github_owner(worktree: pathlib.Path) -> str:
    remote = run(["git", "remote", "get-url", "origin"], cwd=worktree, capture=True)
    tail = remote.rstrip("/").rsplit("/", 1)[-1]
    if tail.endswith(".git"):
        tail = tail[:-4]
    owner = remote.rstrip("/").rsplit("/", 2)[-2] if "/" in remote else ""
    if not owner or not tail:
        raise RuntimeError(f"cannot determine GitHub owner from origin URL: {remote}")
    return owner


def existing_pr(repo: str, owner: str, branch: str, cwd: pathlib.Path) -> str | None:
    result = subprocess.run(
        [
            "gh",
            "pr",
            "list",
            "--repo",
            repo,
            "--head",
            f"{owner}:{branch}",
            "--state",
            "all",
            "--json",
            "url",
        ],
        cwd=cwd,
        check=False,
        text=True,
        capture_output=True,
    )
    if result.returncode:
        return None
    rows = json.loads(result.stdout or "[]")
    return rows[0]["url"] if rows else None


def pr_url_from_output(output: str) -> str | None:
    match = re.search(r"https://github\.com/[^\s)]+/pull/\d+", output)
    return match.group(0) if match else None


def validate_export_paths(paths: list[str]) -> list[str]:
    if not paths:
        raise ValueError("at least one export path is required")
    normalized: list[str] = []
    for raw in paths:
        path = pathlib.PurePosixPath(raw).as_posix()
        while path.startswith("./"):
            path = path[2:]
        if not path or path == "." or path.startswith("../"):
            raise ValueError(f"invalid export path: {raw}")
        if any(fnmatch.fnmatch(path, pattern) for pattern in DENIED_PATTERNS):
            raise ValueError(f"private or internal path cannot enter an upstream PR: {path}")
        normalized.append(path)
    return normalized


def config() -> dict:
    return json.loads((ROOT / ".upstream-update.json").read_text())


def fetch_upstream() -> str:
    run(["git", "fetch", "upstream", "+refs/heads/dev:refs/remotes/upstream/dev"])
    return run(["git", "rev-parse", "upstream/dev"], capture=True)


def guard_args(worktree: pathlib.Path, branch: str, paths: list[str]) -> list[str]:
    args = [
        "python3",
        str(FORK_GUARD),
        "check-pr",
        "--repo",
        str(worktree),
        "--upstream-ref",
        "upstream/dev",
        "--pr-ref",
        branch,
    ]
    for path in paths:
        args += ["--allow-path", path]
    for pattern in DENIED_PATTERNS:
        args += ["--deny-path", pattern]
    return args


def run_declared_checks(worktree: pathlib.Path) -> None:
    if not (worktree / "frontend/node_modules").exists():
        run(["pnpm", "install", "--frozen-lockfile"], cwd=worktree / "frontend")
    for step in config()["verify"]["steps"]:
        cwd = worktree / step["cwd"]
        print(f"[upstream-pr] verify {step['id']}: {' '.join(step['argv'])}")
        subprocess.run(step["argv"], cwd=cwd, check=True, timeout=step["timeout_s"])


def verify(worktree: pathlib.Path, branch: str, paths: list[str], *, full: bool) -> None:
    fetch_upstream()
    if run(["git", "status", "--porcelain"], cwd=worktree, capture=True):
        raise RuntimeError(f"PR worktree is dirty: {worktree}")
    run(guard_args(worktree, branch, paths), cwd=worktree)
    run(["bash", str(INFRA_GUARD), "check", "--pre-pr", str(worktree)], cwd=worktree)
    if full:
        run_declared_checks(worktree)


def prepare(args: argparse.Namespace) -> None:
    paths = validate_export_paths(args.path)
    upstream_oid = fetch_upstream()
    worktree = pathlib.Path(args.worktree).resolve()
    if worktree.exists():
        raise RuntimeError(f"worktree path already exists: {worktree}")
    run(["git", "worktree", "add", "-b", args.branch, str(worktree), upstream_oid])
    try:
        patch = subprocess.run(
            ["git", "diff", "--binary", args.source_from, args.source_to, "--", *paths],
            cwd=ROOT,
            check=True,
            stdout=subprocess.PIPE,
        ).stdout
        if not patch:
            raise RuntimeError("selected source range and paths produced an empty patch")
        subprocess.run(["git", "apply", "--3way", "-"], cwd=worktree, input=patch, check=True)
        changed = run(["git", "diff", "HEAD", "--name-only"], cwd=worktree, capture=True).splitlines()
        if sorted(changed) != sorted(paths):
            raise RuntimeError(f"replay changed unexpected paths: {changed}")
        run(["git", "add", "--", *paths], cwd=worktree)
        run(["git", "commit", "-m", args.message], cwd=worktree)
        verify(worktree, args.branch, paths, full=args.full)
    except Exception:
        print(f"[upstream-pr] preserved failed worktree for inspection: {worktree}", file=sys.stderr)
        raise
    print(f"[upstream-pr] READY branch={args.branch} base={upstream_oid} worktree={worktree}")


def publish(args: argparse.Namespace) -> None:
    paths = validate_export_paths(args.path)
    worktree = pathlib.Path(args.worktree).resolve()
    verify(worktree, args.branch, paths, full=True)
    run(["git", "push", "-u", "origin", args.branch], cwd=worktree)
    owner = args.head_owner or github_owner(worktree)
    prior = existing_pr(args.repo, owner, args.branch, worktree)
    if prior:
        print(prior)
        return
    command = [
        "gh",
        "pr",
        "create",
        "--repo",
        args.repo,
        "--base",
        "dev",
        "--head",
        f"{owner}:{args.branch}",
        "--title",
        args.title,
        "--body-file",
        args.body_file,
    ]
    result = subprocess.run(command, cwd=worktree, check=False, text=True, capture_output=True)
    if result.returncode:
        # A transient API failure can happen after the branch is pushed. Re-query so a
        # successful server-side create is reported idempotently on the next run.
        prior = existing_pr(args.repo, owner, args.branch, worktree)
        if prior:
            print(prior)
            return
        detail = (result.stderr or result.stdout).strip()
        prior = pr_url_from_output(f"{result.stdout}\n{result.stderr}")
        if prior:
            print(prior)
            return
        raise RuntimeError(f"gh pr create failed ({result.returncode}): {detail}")
    print(result.stdout.strip())


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    sub = result.add_subparsers(dest="command", required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("--branch", required=True)
    prep.add_argument("--worktree", required=True)
    prep.add_argument("--source-from", required=True)
    prep.add_argument("--source-to", required=True)
    prep.add_argument("--path", action="append", required=True)
    prep.add_argument("--message", required=True)
    prep.add_argument("--full", action="store_true")
    prep.set_defaults(func=prepare)
    pub = sub.add_parser("publish")
    pub.add_argument("--branch", required=True)
    pub.add_argument("--worktree", required=True)
    pub.add_argument("--path", action="append", required=True)
    pub.add_argument("--repo", default="xichan96/dinotty")
    pub.add_argument("--head-owner")
    pub.add_argument("--title", required=True)
    pub.add_argument("--body-file", required=True)
    pub.set_defaults(func=publish)
    return result


def main() -> int:
    try:
        args = parser().parse_args()
        args.func(args)
        return 0
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"upstream-pr: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
