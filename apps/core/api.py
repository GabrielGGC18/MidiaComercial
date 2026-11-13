from ninja import Router, Schema

router = Router(tags=["Sistema"])


class SaudeOut(Schema):
    status: str


@router.get("/saude", response=SaudeOut, auth=None)
def saude(request):
    return {"status": "ok"}
