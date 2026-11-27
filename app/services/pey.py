from dataclasses import dataclass
from typing import Protocol

import httpx


@dataclass(frozen=True)
class QrResult:
    id: str
    qr_string: str


class PeyError(Exception):
    """Sanitized provider failure; a timeout does not prove no QR was created."""

    def __init__(self, error_type: str, *, status_code: int | None = None,
                 request_id: str | None = None):
        self.error_type = error_type
        self.status_code = status_code
        self.request_id = request_id
        super().__init__(f"pey request failed ({status_code or 'transport'})")


class PeyBadRequest(PeyError):
    pass


class PeyRateLimited(PeyError):
    pass


class PeyServerError(PeyError):
    pass


class PeyUnavailable(PeyError):
    pass


class PeyClient(Protocol):
    def create_qr(self, amount_mxn: float, concept: str, num_ref: str,
                  expiration_s: int) -> QrResult: ...


class HttpPeyClient:
    """Synchronous adapter. Injected clients remain owned by their caller."""

    def __init__(self, api_key: str, *, client: httpx.Client | None = None):
        self._api_key = api_key
        self._client = client

    def create_qr(self, amount_mxn: float, concept: str, num_ref: str,
                  expiration_s: int) -> QrResult:
        if self._client is not None:
            return self._create(self._client, amount_mxn, concept, num_ref, expiration_s)
        with httpx.Client() as client:
            return self._create(client, amount_mxn, concept, num_ref, expiration_s)

    def _create(self, client, amount_mxn, concept, num_ref, expiration_s):
        try:
            response = client.post(
                "https://api.pey.mx/codi/qr",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={"amount": round(amount_mxn, 2), "concept": concept, "numRef": num_ref,
                      "expiration": expiration_s, "generateImage": False},
                timeout=10.0, follow_redirects=False,
            )
        except httpx.RequestError:
            raise PeyError("TRANSPORT_ERROR") from None

        try:
            data = response.json()
        except ValueError:
            if response.status_code == 201:
                raise PeyError("INVALID_RESPONSE", status_code=response.status_code) from None
            data = {}
        if response.status_code != 201:
            error = data.get("error", {}) if isinstance(data, dict) else {}
            if not isinstance(error, dict):
                error = {}
            exception = {400: PeyBadRequest, 429: PeyRateLimited,
                         500: PeyServerError, 503: PeyUnavailable}.get(response.status_code, PeyError)
            raise exception(error.get("type", "UNKNOWN_ERROR"),
                            status_code=response.status_code,
                            request_id=error.get("requestId"))
        if not isinstance(data, dict) or not all(
            isinstance(data.get(field), str) and data[field] for field in ("id", "qrString")
        ):
            raise PeyError("INVALID_RESPONSE", status_code=response.status_code)
        return QrResult(data["id"], data["qrString"])


class FakePeyClient:
    def __init__(self):
        self.requests = []

    def create_qr(self, amount_mxn: float, concept: str, num_ref: str,
                  expiration_s: int) -> QrResult:
        self.requests.append({"amount": amount_mxn, "concept": concept,
                              "numRef": num_ref, "expiration": expiration_s})
        qr_id = f"fake-qr-{len(self.requests)}"
        return QrResult(qr_id, f"demo_data:true:{qr_id}")
