"""Make the ADMIN_PASSWORD_HASH value for the admin login.

Run from backend/:

    python -m scripts.hash_password             # type a password (hidden), get the hash line
    python -m scripts.hash_password --generate  # make a random password, print it once

The plaintext password is printed only by --generate, and only once. In every
other case the output is just the ADMIN_PASSWORD_HASH= line. Nothing is written
to disk, and this script does not read any .env file.

AUTH_SECRET, the token signing key, is a separate value:

    python -c "import secrets; print(secrets.token_urlsafe(48))"
"""
import argparse
import getpass
import secrets
import sys

from core.security import hash_password, verify_password

MIN_PASSWORD_LENGTH = 12
# The login endpoint rejects longer passwords, so a longer one could never sign in.
MAX_PASSWORD_LENGTH = 256
GENERATED_PASSWORD_BYTES = 18  # 24 URL-safe characters


def _hidden_prompt(label):
    # Without a terminal getpass would fall back to an echoing read.
    if not sys.stdin.isatty():
        raise RuntimeError("No terminal to type a password into. Use --generate instead.")
    return getpass.getpass(label)


def _error(message):
    print(f"error: {message}", file=sys.stderr)
    return 1


def _print_hash_line(password):
    stored = hash_password(password)
    if not verify_password(password, stored):
        raise RuntimeError("hash did not verify; not printing it")
    print(f"ADMIN_PASSWORD_HASH={stored}")


def main(argv=None, prompt=_hidden_prompt):
    parser = argparse.ArgumentParser(description="Make the ADMIN_PASSWORD_HASH value.")
    parser.add_argument(
        "--generate",
        action="store_true",
        help="generate a random password and print it once, with its hash",
    )
    args = parser.parse_args(argv)

    if args.generate:
        password = secrets.token_urlsafe(GENERATED_PASSWORD_BYTES)
        print("Generated admin password (shown once; save it in a password manager):")
        print(password)
        print()
        _print_hash_line(password)
        return 0

    try:
        password = prompt("Admin password: ")
        confirmation = prompt("Repeat password: ")
    except (RuntimeError, EOFError, KeyboardInterrupt) as error:
        return _error(str(error) or "no password entered")

    if password != confirmation:
        return _error("the two passwords do not match")
    if len(password) < MIN_PASSWORD_LENGTH:
        return _error(f"use at least {MIN_PASSWORD_LENGTH} characters")
    if len(password) > MAX_PASSWORD_LENGTH:
        return _error(f"use at most {MAX_PASSWORD_LENGTH} characters")

    _print_hash_line(password)
    return 0


if __name__ == "__main__":
    sys.exit(main())
