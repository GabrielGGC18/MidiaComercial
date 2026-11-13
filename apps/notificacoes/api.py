from datetime import datetime

from django.db.models import Exists, OuterRef
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.core.permissoes import HIERARQUIA, loja_com_papel

from .models import Leitura, Notificacao

router = Router(tags=["Notificações"])


class NotificacaoOut(Schema):
    id: int
    tipo: str
    nivel: str
    titulo: str
    texto: str
    link: str
    contador: int
    lida: bool
    atualizada_em: datetime


class ContagemOut(Schema):
    nao_lidas: int
    ultima_id: int | None


def _visiveis(request):
    loja = loja_com_papel(request, "atendente")
    nivel = HIERARQUIA.get(request.papel, 0)
    papeis = [p for p, n in HIERARQUIA.items() if n <= nivel]
    lida = Leitura.objects.filter(notificacao=OuterRef("pk"), usuario=request.user)
    return (
        Notificacao.objects.da_loja(loja)
        .filter(papel_minimo__in=papeis)
        .annotate(lida=Exists(lida))
    )


@router.get("/", response=list[NotificacaoOut])
def listar(request, nao_lidas: bool = False):
    qs = _visiveis(request)
    if nao_lidas:
        qs = qs.filter(lida=False)
    return qs[:30]


@router.get("/contagem", response=ContagemOut)
def contagem(request):
    qs = _visiveis(request)
    ultima = qs.filter(lida=False).values_list("id", flat=True).first()
    return {"nao_lidas": qs.filter(lida=False).count(), "ultima_id": ultima}


@router.post("/{int:notificacao_id}/ler", response=NotificacaoOut)
def ler(request, notificacao_id: int):
    n = _visiveis(request).filter(pk=notificacao_id).first()
    if n is None:
        raise HttpError(404, "Notificação não encontrada.")
    Leitura.objects.get_or_create(notificacao=n, usuario=request.user)
    n.lida = True
    return n


@router.post("/ler-todas", response=ContagemOut)
def ler_todas(request):
    pendentes = _visiveis(request).filter(lida=False)
    Leitura.objects.bulk_create(
        [Leitura(notificacao=n, usuario=request.user) for n in pendentes], ignore_conflicts=True
    )
    return {"nao_lidas": 0, "ultima_id": None}
