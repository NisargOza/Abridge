import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def fake_command(directory: Path, name: str, body: str) -> None:
    path = directory / name
    path.write_text("#!/bin/sh\n" + body + "\n")
    path.chmod(0o755)


def terminal_environment(directory: Path) -> dict[str, str]:
    # Isolate discovery from whichever package managers happen to be on the host.
    for name, path in [("bash", "/bin/bash"), ("dirname", "/usr/bin/dirname")]:
        (directory / name).symlink_to(path)
    return {**os.environ, "PATH": str(directory)}


def test_installed_pnpm_is_preferred_and_arguments_are_preserved(tmp_path: Path) -> None:
    fake_command(tmp_path, "pnpm", 'printf "pnpm:%s\\n" "$@"')
    fake_command(tmp_path, "corepack", "exit 90")
    result = subprocess.run(
        [str(ROOT / "scripts/pnpm.sh"), "dev", "argument with spaces"],
        env=terminal_environment(tmp_path),
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert result.stdout.splitlines() == ["pnpm:dev", "pnpm:argument with spaces"]


def test_regular_terminal_uses_corepack_in_web_project(tmp_path: Path) -> None:
    fake_command(tmp_path, "corepack", 'printf "%s\\n" "$PWD" "$@"')
    result = subprocess.run(
        [str(ROOT / "scripts/pnpm.sh"), "--version"],
        env=terminal_environment(tmp_path),
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert result.stdout.splitlines() == [str(ROOT / "web"), "pnpm", "--version"]


def test_missing_package_manager_fails_before_any_service_starts(tmp_path: Path) -> None:
    marker = tmp_path / "service-started"
    fake_command(tmp_path, "uv", f'/usr/bin/touch "{marker}"')
    result = subprocess.run(
        [str(ROOT / "scripts/dev.sh"), "--ai"],
        env=terminal_environment(tmp_path),
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 127
    assert "Neither pnpm nor Corepack" in result.stderr
    assert "Abridge: http" not in result.stdout
    assert not marker.exists()
