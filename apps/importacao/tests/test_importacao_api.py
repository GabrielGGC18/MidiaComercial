from django.core.files.uploadedfile import SimpleUploadedFile

from apps.acoes.models import EventoAuditoria
from apps.comercio.models import ItemPedido, Pedido

CSV = (
    "pedido_id;item_id;data_hora;sku;categoria;quantidade;receita_item;status;cliente_ref\n"
    "V1;1;2026-11-01T10:30:00-03:00;CAM-AZ-M;Camisetas;2;119,80;concluida;C-1\n"
    "V1;2;2026-11-01T10:30:00-03:00;CIN-MA-U;Cintos;1;89,90;concluida;C-1\n"
    "V2;1;2026-11-01T11:00:00-03:00;CJE-AZ-42;Calças;1;179,90;cancelada;\n"
    "V3;1;2026-11-01T12:00:00-03:00;CAM-AZ-M;Camisetas;0;59,90;concluida;\n"
    "V1;1;2026-11-01T10:30:00-03:00;CAM-AZ-M;Camisetas;2;119,80;concluida;C-1\n"
)


def _preview(cliente, conteudo=CSV, total="209,70"):
    arq = SimpleUploadedFile("vendas.csv", conteudo.encode("utf-8"), content_type="text/csv")
    return cliente.post(
        "/api/importacoes/preview", {"arquivo": arq, "tipo": "vendas", "total_origem": total}
    )


def test_fluxo_preview_confirmar_reimportar(cliente_a, duas_lojas):
    r = _preview(cliente_a)
    assert r.status_code == 200, r.content
    lote = r.json()
    assert lote["linhas_ok"] == 3
    assert lote["linhas_rejeitadas"] == 1
    assert lote["linhas_duplicadas"] == 1
    assert lote["rejeitadas"][0]["numero_linha"] == 5
    assert lote["rejeitadas"][0]["erros"][0]["mensagem"] == "precisa ser maior que 0"
    assert lote["total_importado"] == "209.70"  # cancelada não conta
    assert lote["reconciliacao"]["nivel"] == "ok"
    assert Pedido.objects.count() == 0  # prévia não grava domínio

    r = cliente_a.post(f"/api/importacoes/{lote['id']}/confirmar")
    assert r.status_code == 200 and r.json()["status"] == "confirmado"
    assert Pedido.objects.filter(loja=duas_lojas["loja_a"]).count() == 2
    assert ItemPedido.objects.count() == 3
    assert r.json()["previa"] == []  # linhas pendentes apagadas
    assert EventoAuditoria.objects.filter(acao="importacao_confirmada").exists()

    # mesmo arquivo de novo: bloqueado, nada duplica
    r = _preview(cliente_a)
    assert r.status_code == 422 and "já foi importado" in r.json()["detail"]

    # arquivo diferente com as mesmas linhas: todas duplicadas
    r = _preview(cliente_a, CSV + "\n")
    assert r.json()["linhas_ok"] == 0
    assert r.json()["linhas_duplicadas"] == 4


def test_csv_sem_colunas(cliente_a):
    r = _preview(cliente_a, "a,b,c\n1,2,3\n")
    assert r.status_code == 422
    assert "ponto e vírgula" in r.json()["detail"]


def test_reconciliacao_alerta(cliente_a):
    r = _preview(cliente_a, total="300,00")
    assert r.json()["reconciliacao"]["nivel"] == "alto"


def test_cancelar_previa(cliente_a):
    lote = _preview(cliente_a).json()
    r = cliente_a.post(f"/api/importacoes/{lote['id']}/cancelar")
    assert r.json()["status"] == "cancelado"
    assert cliente_a.post(f"/api/importacoes/{lote['id']}/confirmar").status_code == 409


def test_modelo_csv(client):
    r = client.get("/api/importacoes/modelo?tipo=vendas")
    assert r.status_code == 200 and b"pedido_id;item_id" in r.content
