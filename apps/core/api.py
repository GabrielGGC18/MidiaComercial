from django.db import connection
from ninja import Router, Schema

router = Router(tags=["Sistema"])


class SaudeOut(Schema):
    status: str


@router.get("/saude", response={200: SaudeOut, 503: SaudeOut}, auth=None)
def saude(request):
    """Pública. 200 com banco respondendo; 503 sem detalhe interno (nada de erro do banco)."""
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
    except Exception:  # noqa: BLE001
        return 503, {"status": "indisponivel"}
    return {"status": "ok"}
