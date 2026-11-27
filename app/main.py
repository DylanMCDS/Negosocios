import importlib
import pkgutil
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import routers

WEB_DIST = Path(__file__).resolve().parent.parent / "web" / "dist"


def create_app(web_dist: Path | None = WEB_DIST) -> FastAPI:
    application = FastAPI(title="Negosocios")

    @application.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # `routers` (not `app.routers`): callers may shadow the package name `app`.
    for module in pkgutil.iter_modules(routers.__path__):
        router = getattr(importlib.import_module(f"{routers.__name__}.{module.name}"), "router", None)
        if router is not None:
            application.include_router(router)

    # The frontend build is mounted last: /api/* always wins over static files.
    if web_dist is not None and web_dist.is_dir():
        application.mount("/", StaticFiles(directory=web_dist, html=True), name="web")
    return application


app = create_app()
