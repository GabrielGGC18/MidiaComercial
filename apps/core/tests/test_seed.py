from apps.comercio.models import Pedido, Variante
from apps.contas.models import Loja
from apps.core.demo import criar_demo
from apps.publico.models import DemandaNaoAtendida


def test_seed_demo_idempotente_e_reset(db):
    criar_demo(log=lambda *_: None)
    criar_demo(log=lambda *_: None)
    assert Loja.objects.filter(demo=True).count() == 2
    for loja in Loja.objects.all():
        assert Variante.objects.da_loja(loja).count() == 47
        assert Pedido.objects.da_loja(loja).count() > 100
        assert DemandaNaoAtendida.objects.da_loja(loja).exists()
    criar_demo(reset=True, log=lambda *_: None)
    assert Loja.objects.filter(demo=True).count() == 2
