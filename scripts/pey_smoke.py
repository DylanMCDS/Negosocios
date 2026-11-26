"""Manual production smoke: one QR for 1 MXN. Never imported by tests or CI."""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.pey import HttpPeyClient, PeyError


def main() -> int:
    api_key = os.environ.get("PEY_API_KEY")
    if not api_key:
        print("PEY_API_KEY must be configured in the server environment", file=sys.stderr)
        return 1
    try:
        result = HttpPeyClient(api_key).create_qr(1, "Negosocios smoke", "1", 360)
    except PeyError:
        print("pey request failed; check the portal before trying again", file=sys.stderr)
        return 1
    print(result.id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
