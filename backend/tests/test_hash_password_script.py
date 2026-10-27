"""scripts/hash_password.py: hidden input, and the plaintext printed only by --generate."""
import subprocess
import sys
from pathlib import Path

import pytest

from core.security import verify_password
from scripts import hash_password as script

BACKEND_DIR = Path(__file__).resolve().parents[1]
TYPED_PASSWORD = "a typed password 123"
HASH_PREFIX = "ADMIN_PASSWORD_HASH="


def prompt_returning(*answers):
    remaining = list(answers)

    def prompt(label):
        return remaining.pop(0)

    return prompt


def hash_lines(text):
    return [line for line in text.splitlines() if line.startswith(HASH_PREFIX)]


def run_script(*args):
    return subprocess.run(
        [sys.executable, "-m", "scripts.hash_password", *args],
        cwd=BACKEND_DIR,
        # A pipe is never a terminal. (On Windows NUL claims to be one.)
        input="",
        capture_output=True,
        text=True,
        timeout=60,
    )


# Typed password

def test_typed_password_prints_only_a_hash_that_verifies(capsys):
    code = script.main([], prompt=prompt_returning(TYPED_PASSWORD, TYPED_PASSWORD))

    captured = capsys.readouterr()
    assert code == 0
    lines = hash_lines(captured.out)
    assert len(lines) == 1
    assert captured.out.strip() == lines[0]
    assert verify_password(TYPED_PASSWORD, lines[0][len(HASH_PREFIX):])
    assert TYPED_PASSWORD not in captured.out + captured.err


def test_typed_password_is_read_with_getpass_not_echoed(monkeypatch, capsys):
    labels = []

    def fake_getpass(label):
        labels.append(label)
        return TYPED_PASSWORD

    monkeypatch.setattr(sys.stdin, "isatty", lambda: True)
    monkeypatch.setattr(script.getpass, "getpass", fake_getpass)
    monkeypatch.setattr("builtins.input", lambda *a: pytest.fail("input() would echo the password"))

    code = script.main([])

    assert code == 0
    assert len(labels) == 2
    assert TYPED_PASSWORD not in capsys.readouterr().out


@pytest.mark.parametrize(
    "first, second",
    [
        (TYPED_PASSWORD, TYPED_PASSWORD + "x"),
        ("short", "short"),
        ("", ""),
        ("p" * 257, "p" * 257),
    ],
)
def test_rejected_passwords_print_no_hash_and_never_echo_the_password(capsys, first, second):
    code = script.main([], prompt=prompt_returning(first, second))

    captured = capsys.readouterr()
    assert code == 1
    assert captured.out == ""
    assert "error:" in captured.err
    for secret in (first, second):
        if secret:
            assert secret not in captured.err


def test_the_longest_accepted_password_still_works(capsys):
    password = "p" * 256

    code = script.main([], prompt=prompt_returning(password, password))

    assert code == 0
    assert verify_password(password, hash_lines(capsys.readouterr().out)[0][len(HASH_PREFIX):])


def test_without_a_terminal_it_refuses_instead_of_echoing():
    result = run_script()

    assert result.returncode == 1
    assert result.stdout == ""
    assert "--generate" in result.stderr


# --generate

def test_generate_prints_the_password_exactly_once_with_its_hash(capsys):
    code = script.main(["--generate"], prompt=lambda label: pytest.fail("must not prompt"))

    out = capsys.readouterr().out
    assert code == 0
    lines = hash_lines(out)
    assert len(lines) == 1
    plaintext = [
        line for line in out.splitlines()
        if line and not line.startswith(HASH_PREFIX) and " " not in line
    ]
    assert len(plaintext) == 1
    password = plaintext[0]
    assert len(password) == 24
    assert out.count(password) == 1
    assert verify_password(password, lines[0][len(HASH_PREFIX):])


def test_generate_makes_a_different_password_each_time(capsys):
    script.main(["--generate"])
    first = capsys.readouterr().out
    script.main(["--generate"])
    second = capsys.readouterr().out

    assert hash_lines(first) != hash_lines(second)


def test_generate_in_a_real_process_prints_the_password_once_and_nothing_on_stderr():
    result = run_script("--generate")

    assert result.returncode == 0
    assert result.stderr == ""
    lines = hash_lines(result.stdout)
    assert len(lines) == 1
    candidates = [
        line for line in result.stdout.splitlines()
        if line and not line.startswith(HASH_PREFIX) and " " not in line
    ]
    assert len(candidates) == 1
    assert result.stdout.count(candidates[0]) == 1
    assert verify_password(candidates[0], lines[0][len(HASH_PREFIX):])


def test_the_hash_line_is_safe_to_paste_into_an_env_var(capsys):
    script.main(["--generate"])

    value = hash_lines(capsys.readouterr().out)[0][len(HASH_PREFIX):]
    assert value.count(":") == 5
    assert not set(value) & set("$ \t\"'`")
