"""Dados 100% sintéticos da demo (§1.3, P0-8, §13 "dados bonitos demais").

Ruído realista: cancelamentos, devoluções, domingos fechados, cliente_ref parcial,
estoque desatualizado numa das lojas. Cenários plantados para cada regra disparar:

- A (lacuna de mix): variantes zeradas com procuras registradas no balcão
- B (pouca saída): variantes com saldo e sem venda há mais de 21 dias
- C (padrão de público): Calças concentradas no sábado 10–12h
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.acoes.models import EventoAuditoria, Medicao, PlanoAcao
from apps.agente.models import Campanha, ChamadaFerramenta, PropostaAgente, SessaoAgente
from apps.clientes.models import Cliente
from apps.comercio.models import Devolucao, ItemPedido, Pedido, Produto, Variante
from apps.contas.models import ConfiguracaoLoja, Loja, Vinculo
from apps.estoque.models import SnapshotEstoque
from apps.importacao.models import LinhaRejeitada, LoteImportacao
from apps.inteligencia.models import Evidencia, ExecucaoMotor, Oportunidade
from apps.publico.models import DemandaNaoAtendida

SENHA_DEMO = "demo1234"  # só para dados sintéticos
DIAS_HISTORICO = 90

# referencia, nome, categoria, cores, tamanhos, preço, peso de venda
CATALOGO = [
    ("CAM", "Camiseta básica", "Camisetas", ["Azul", "Preta", "Branca"], ["P", "M", "G", "GG"], "59.90", 30),
    ("POL", "Camisa polo", "Camisetas", ["Azul", "Verde"], ["P", "M", "G", "GG"], "89.90", 14),
    ("CJE", "Calça jeans", "Calças", ["Azul"], ["38", "40", "42", "44", "46"], "179.90", 14),
    ("CSA", "Calça sarja", "Calças", ["Bege", "Preta"], ["40", "42", "44"], "149.90", 8),
    ("CSO", "Camisa social", "Camisas", ["Branca", "Azul"], ["P", "M", "G"], "129.90", 10),
    ("CIN", "Cinto couro", "Cintos", ["Marrom", "Preto"], ["U"], "89.90", 8),
    ("BER", "Bermuda", "Bermudas", ["Azul", "Cinza"], ["38", "40", "42", "44"], "99.90", 12),
]  # fmt: skip

HORARIO = {d: ["09:00", "19:00"] for d in ("seg", "ter", "qua", "qui", "sex")}
HORARIO |= {"sab": ["09:00", "14:00"], "dom": None}


@dataclass
class PerfilLoja:
    nome: str
    usuarios: list[tuple[str, str, str]]  # username, nome, papel
    pedidos_dia: float
    cobertura_cliente: float
    idade_estoque_h: int
    zerados: dict[str, int]  # sku → procuras no balcão (regra A)
    sem_saida: list[str]  # regra B
    ausentes: list[tuple[str, str, str, str, int]] = field(
        default_factory=list
    )  # texto, cat, cor, tam, n


LOJAS = [
    PerfilLoja(
        nome="Loja Demo Centro",
        usuarios=[
            ("dono.centro", "Carlos (dono)", "dono"),
            ("gerente.centro", "Marina (gerente)", "gerente"),
            ("ana", "Ana (atendente)", "atendente"),
        ],
        pedidos_dia=11,
        cobertura_cliente=0.42,
        idade_estoque_h=18,
        zerados={"CAM-AZ-M": 9, "CJE-AZ-42": 6},
        sem_saida=["CIN-MA-U", "CSO-BR-G"],
        ausentes=[("Camiseta básica", "Camisetas", "Verde", "M", 4)],
    ),
    PerfilLoja(
        nome="Loja Demo Norte",
        usuarios=[
            ("gerente.norte", "Paulo (gerente)", "gerente"),
            ("bruno", "Bruno (atendente)", "atendente"),
        ],
        pedidos_dia=6,
        cobertura_cliente=0.15,
        idade_estoque_h=100,
        zerados={"POL-AZ-G": 7},
        sem_saida=["BER-CI-44"],
    ),
]

USUARIOS_DEMO = [u for p in LOJAS for u, _, _ in p.usuarios]


def sku_de(ref: str, cor: str, tamanho: str) -> str:
    return f"{ref}-{cor[:2].upper()}-{tamanho}"


def apagar_loja(loja: Loja) -> None:
    """Remove dados na ordem certa (há FKs PROTECT e auditoria append-only)."""
    for model in (
        ChamadaFerramenta, PropostaAgente, Campanha, SessaoAgente, Cliente,
        EventoAuditoria, Medicao, PlanoAcao, Evidencia, Oportunidade, ExecucaoMotor,
        DemandaNaoAtendida, SnapshotEstoque, Devolucao, ItemPedido, Pedido,
    ):  # fmt: skip
        model.objects.filter(loja=loja).delete()
    LinhaRejeitada.objects.filter(lote__loja=loja).delete()
    for model in (LoteImportacao, Variante, Produto):
        model.objects.filter(loja=loja).delete()
    loja.delete()


def _dt(dia, hora: int, minuto: int) -> datetime:
    return timezone.make_aware(datetime.combine(dia, time(hora, minuto)))


# faixa etária (estimada) por nicho: base para o relatório "quem compra o quê"
FAIXA_POR_CATEGORIA = {
    "Camisetas": {"18_24": 4, "25_34": 4, "35_44": 2, "45_59": 1},
    "Calças": {"18_24": 1, "25_34": 4, "35_44": 4, "45_59": 2},
    "Camisas": {"25_34": 2, "35_44": 4, "45_59": 4, "60_mais": 1},
    "Cintos": {"35_44": 3, "45_59": 3, "60_mais": 2},
    "Bermudas": {"ate_17": 1, "18_24": 5, "25_34": 3},
}
FAIXA_GERAL = {"18_24": 2, "25_34": 4, "35_44": 3, "45_59": 2, "60_mais": 1}


def _sortear(rnd: random.Random, pesos: dict[str, int]) -> str:
    return rnd.choices(list(pesos), list(pesos.values()))[0]


def _faixa_do_cliente(ref: str) -> str:
    return _sortear(random.Random(ref), FAIXA_GERAL)


def _cliente_ref(rnd: random.Random, loja_id: int) -> str:
    # pool com cauda: poucos clientes compram várias vezes
    n = rnd.randint(0, 19) if rnd.random() < 0.35 else rnd.randint(20, 179)
    return "C-" + hashlib.sha1(f"{loja_id}-{n}".encode()).hexdigest()[:6]


def _gerar_vendas(rnd, loja, perfil: PerfilLoja, variantes: dict[str, Variante], agora):
    hoje = timezone.localdate()
    produtos = {}
    for ref, _nome, cat, _c, _t, preco, peso in CATALOGO:
        skus = [s for s in variantes if s.startswith(ref + "-")]
        produtos[ref] = (cat, Decimal(preco), peso, skus)

    pedidos, itens_por_pedido, seq = [], [], 0
    for delta in range(DIAS_HISTORICO, -1, -1):
        dia = hoje - timedelta(days=delta)
        wd = dia.weekday()
        if wd == 6:
            continue  # domingo fechado
        fator = 1.4 if wd == 5 else (0.8 if wd == 0 else 1.0)
        n = max(0, int(rnd.gauss(perfil.pedidos_dia * fator, 2.5)))
        hora_fim = 13 if wd == 5 else 18
        for _ in range(n):
            hora = rnd.randint(9, hora_fim)
            quando = _dt(dia, hora, rnd.randint(0, 59))
            if quando > agora:
                continue
            seq += 1
            pico_calcas = wd == 5 and 10 <= hora < 12
            refs, pesos = [], []
            for ref, (cat, _p, peso, _s) in produtos.items():
                refs.append(ref)
                pesos.append(peso * (6 if pico_calcas and cat == "Calças" else 1))
            itens = []
            for item_n in range(1, rnd.choice([1, 1, 1, 2, 2, 3]) + 1):
                ref = rnd.choices(refs, pesos)[0]
                _cat, preco, _peso, skus = produtos[ref]
                elegiveis = [
                    s for s in skus
                    if not (s in perfil.sem_saida and delta < 40)
                    and not (s in perfil.zerados and delta < 15)
                ]  # fmt: skip
                if not elegiveis:
                    continue
                sku = rnd.choice(elegiveis)
                qtd = 1 if rnd.random() < 0.85 else 2
                desconto = Decimal("0.9") if rnd.random() < 0.1 else Decimal("1")
                itens.append(
                    (
                        str(item_n),
                        variantes[sku],
                        qtd,
                        (preco * qtd * desconto).quantize(Decimal("0.01")),
                    )
                )
            if not itens:
                continue
            ref_cli = (
                _cliente_ref(rnd, loja.id) if rnd.random() < perfil.cobertura_cliente else None
            )
            if ref_cli:
                faixa = _faixa_do_cliente(ref_cli)
            elif rnd.random() < 0.35:  # atendente estimou a faixa no caixa
                faixa = _sortear(rnd, FAIXA_POR_CATEGORIA[itens[0][1].produto.categoria])
            else:
                faixa = ""
            pedidos.append(
                Pedido(
                    loja=loja,
                    sistema_origem="csv",
                    pedido_id_origem=f"S{loja.id}-{seq:05d}",
                    data_hora=quando,
                    status="cancelada" if rnd.random() < 0.04 else "concluida",
                    cliente_ref=ref_cli,
                    faixa_etaria=faixa,
                    canal="loja",
                )
            )
            itens_por_pedido.append(itens)

    Pedido.objects.bulk_create(pedidos, batch_size=500)
    salvos = {p.pedido_id_origem: p for p in Pedido.objects.filter(loja=loja)}
    objs = []
    for p, itens in zip(pedidos, itens_por_pedido, strict=True):
        pedido = salvos[p.pedido_id_origem]
        for item_id, variante, qtd, receita in itens:
            objs.append(
                ItemPedido(
                    loja=loja, pedido=pedido, item_id=item_id, variante=variante,
                    quantidade=qtd, receita_item=receita,
                )
            )  # fmt: skip
    ItemPedido.objects.bulk_create(objs, batch_size=500)

    devolucoes = [
        Devolucao(
            loja=loja,
            item_original=i,
            data=salvos[i.pedido.pedido_id_origem].data_hora + timedelta(days=3),
            quantidade=1,
            valor=(i.receita_item / i.quantidade).quantize(Decimal("0.01")),
        )
        for i in ItemPedido.objects.filter(loja=loja, pedido__status="concluida").select_related(
            "pedido"
        )
        if rnd.random() < 0.02
    ]
    Devolucao.objects.bulk_create(devolucoes)
    return len(pedidos)


def _gerar_demandas(
    rnd, loja, perfil: PerfilLoja, variantes: dict[str, Variante], atendente, agora
):
    objs = []

    def quando(max_dias: int) -> datetime:
        dia = timezone.localdate() - timedelta(days=rnd.randint(0, max_dias))
        if dia.weekday() == 6:
            dia -= timedelta(days=1)
        t = _dt(dia, rnd.randint(9, 17), rnd.randint(0, 59))
        return min(t, agora - timedelta(minutes=rnd.randint(5, 600)))

    for i, (sku, n) in enumerate(perfil.zerados.items()):
        v = variantes[sku]
        for _ in range(n):
            objs.append(
                DemandaNaoAtendida(
                    loja=loja, variante=v, categoria=v.produto.categoria, tamanho=v.tamanho, cor=v.cor,
                    motivo="indisponivel" if rnd.random() < 0.8 else "variacao_ausente",
                    registrado_por=atendente, registrado_em=quando(6 if i == 0 else 20),
                    faixa_etaria=_sortear(rnd, FAIXA_POR_CATEGORIA[v.produto.categoria]) if rnd.random() < 0.7 else "",
                )
            )  # fmt: skip
    for texto, cat, cor, tam, n in perfil.ausentes:
        for _ in range(n):
            objs.append(
                DemandaNaoAtendida(
                    loja=loja, produto_texto=texto, categoria=cat, cor=cor, tamanho=tam,
                    motivo="variacao_ausente", registrado_por=atendente, registrado_em=quando(25),
                )
            )  # fmt: skip
    # ruído: preço/prazo/outro em itens que têm estoque
    com_estoque = [s for s in variantes if s not in perfil.zerados]
    for _ in range(18):
        v = variantes[rnd.choice(com_estoque)]
        objs.append(
            DemandaNaoAtendida(
                loja=loja, variante=v, categoria=v.produto.categoria, tamanho=v.tamanho, cor=v.cor,
                motivo=rnd.choice(["preco", "preco", "prazo", "outro"]),
                registrado_por=atendente, registrado_em=quando(29),
            )
        )  # fmt: skip
    DemandaNaoAtendida.objects.bulk_create(objs)
    return len(objs)


NOMES = [
    "Rafael",
    "Lucas",
    "Bruno",
    "Thiago",
    "Felipe",
    "Diego",
    "Rodrigo",
    "Marcelo",
    "André",
    "Gustavo",
    "Paulo",
    "Leandro",
    "Vinícius",
    "Caio",
    "Mateus",
    "Eduardo",
    "Fábio",
    "Renato",
    "Igor",
    "Henrique",
]
SOBRENOMES = [
    "Silva",
    "Souza",
    "Oliveira",
    "Costa",
    "Pereira",
    "Almeida",
    "Rocha",
    "Lima",
    "Araújo",
    "Barros",
    "Carvalho",
    "Nunes",
    "Moura",
    "Teixeira",
    "Ribeiro",
]


def _gerar_clientes(rnd, loja, perfil: PerfilLoja) -> int:
    """Base de clientes SINTÉTICA ligada aos cliente_ref das vendas (nomes e números fictícios)."""
    from collections import Counter

    refs = (
        Pedido.objects.filter(loja=loja)
        .exclude(cliente_ref=None)
        .values_list("cliente_ref", flat=True)
        .distinct()
    )
    tamanhos, cats = {}, {}
    for ref, tam, cat in ItemPedido.objects.filter(
        loja=loja, pedido__cliente_ref__isnull=False
    ).values_list("pedido__cliente_ref", "variante__tamanho", "variante__produto__categoria"):
        tamanhos.setdefault(ref, Counter())[tam] += 1
        cats.setdefault(ref, Counter())[cat] += 1
    objs = []
    agora = timezone.now()
    for n, ref in enumerate(sorted(set(refs))):
        consentiu = rnd.random() < 0.7
        objs.append(
            Cliente(
                loja=loja,
                ref=ref,
                nome=f"{rnd.choice(NOMES)} {rnd.choice(SOBRENOMES)}",
                whatsapp=f"55639{90000000 + loja.id * 100000 + n:08d}",  # número fictício
                faixa_etaria=_faixa_do_cliente(ref),
                tamanhos=[
                    t for t, _ in tamanhos.get(ref, Counter()).most_common(2) if t and t != "U"
                ],
                categorias_interesse=[c for c, _ in cats.get(ref, Counter()).most_common(1)]
                if rnd.random() < 0.5
                else [],
                consentimento_contato=consentiu,
                consentimento_em=agora - timedelta(days=rnd.randint(10, 80)) if consentiu else None,
                origem=Cliente.Origem.PLANILHA,
            )
        )
    Cliente.objects.bulk_create(objs)
    return len(objs)


@transaction.atomic
def criar_demo(*, reset: bool = False, semente: int = 42, log=print) -> None:
    User = get_user_model()
    if reset:
        for loja in Loja.objects.filter(demo=True):
            apagar_loja(loja)
        User.objects.filter(username__in=USUARIOS_DEMO).delete()

    agora = timezone.now()
    superusers = list(User.objects.filter(is_superuser=True))
    for idx, perfil in enumerate(LOJAS):
        rnd = random.Random(semente + idx)
        loja, criada = Loja.objects.get_or_create(
            nome=perfil.nome,
            defaults={"segmento": "moda masculina", "demo": True, "horario_funcionamento": HORARIO},
        )
        ConfiguracaoLoja.objects.get_or_create(loja=loja)
        atendente = None
        for username, nome, papel in perfil.usuarios:
            user, novo = User.objects.get_or_create(
                username=username, defaults={"first_name": nome}
            )
            if novo:
                user.set_password(SENHA_DEMO)
                user.save()
            Vinculo.objects.get_or_create(user=user, loja=loja, defaults={"papel": papel})
            if papel == "atendente":
                atendente = user
        for su in superusers:  # admin enxerga as lojas demo como dono
            Vinculo.objects.get_or_create(user=su, loja=loja, defaults={"papel": "dono"})

        if not criada:
            log(f"- {loja.nome} já existia (use --reset para recriar)")
            continue

        variantes: dict[str, Variante] = {}
        for ref, nome, cat, cores, tamanhos, _preco, _peso in CATALOGO:
            produto = Produto.objects.create(loja=loja, referencia=ref, nome=nome, categoria=cat)
            for cor in cores:
                for tam in tamanhos:
                    sku = sku_de(ref, cor, tam)
                    variantes[sku] = Variante.objects.create(
                        loja=loja, produto=produto, sku=sku, tamanho=tam, cor=cor
                    )

        capturado = agora - timedelta(hours=perfil.idade_estoque_h)
        SnapshotEstoque.objects.bulk_create(
            [
                SnapshotEstoque(
                    loja=loja,
                    variante=v,
                    saldo=0 if sku in perfil.zerados else (rnd.randint(12, 18) if sku in perfil.sem_saida else rnd.randint(2, 25)),
                    capturado_em=capturado,
                )
                for sku, v in variantes.items()
            ]
        )  # fmt: skip
        n_ped = _gerar_vendas(rnd, loja, perfil, variantes, agora)
        n_dem = _gerar_demandas(rnd, loja, perfil, variantes, atendente, agora)
        n_cli = _gerar_clientes(rnd, loja, perfil)
        log(
            f"[ok] {loja.nome}: {len(variantes)} variantes, {n_ped} pedidos, {n_dem} demandas, {n_cli} clientes"
        )

    log(f"\nUsuarios demo (senha: {SENHA_DEMO}): " + ", ".join(USUARIOS_DEMO))


def csv_exemplo_vendas(loja: Loja) -> str:
    """CSV da demo de importação: pedidos novos de hoje + 3 linhas com erro + 2 duplicadas."""
    rnd = random.Random(f"{loja.id}-{timezone.localdate()}")
    variantes = list(Variante.objects.da_loja(loja).select_related("produto").order_by("sku"))
    precos = {ref: preco for ref, *_r, preco, _p in CATALOGO}
    dia = timezone.localdate()
    base = dia.strftime("%Y%m%d")
    linhas = [
        "pedido_id;item_id;data_hora;sku;categoria;quantidade;receita_item;status;"
        "cliente_ref;custo_total_item;canal;variante"
    ]
    for n in range(1, 21):
        v = rnd.choice(variantes)
        hora = 9 + n % 9
        preco = Decimal(precos.get(v.produto.referencia, "99.90"))
        status = "cancelada" if n == 7 else "concluida"
        ref = f"C-{rnd.randint(1000, 9999)}" if rnd.random() < 0.4 else ""
        linhas.append(
            f"N{base}-{n:03d};1;{dia}T{hora:02d}:{rnd.randint(0, 59):02d}:00-03:00;{v.sku};"
            f"{v.produto.categoria};1;{str(preco).replace('.', ',')};{status};{ref};;loja;"
            f"{v.produto.nome} {v.cor} {v.tamanho}"
        )
    v = variantes[0]
    # erros de propósito (mensagens em português na tela)
    linhas.append(
        f"N{base}-901;1;{dia}T10:00:00-03:00;{v.sku};{v.produto.categoria};0;59,90;concluida;;;loja;"
    )
    linhas.append(
        f"N{base}-902;1;{dia} 11:00;{v.sku};{v.produto.categoria};1;59,90;concluida;;;loja;"
    )
    linhas.append(
        f"N{base}-903;1;{dia}T12:00:00-03:00;{v.sku};{v.produto.categoria};1;59,90;concluida;123.456.789-09;;loja;"
    )
    # duplicadas: itens que já existem no histórico
    for p in Pedido.objects.da_loja(loja).filter(status="concluida").order_by("data_hora")[:2]:
        i = p.itens.select_related("variante__produto").first()
        if i:
            linhas.append(
                f"{p.pedido_id_origem};{i.item_id};{timezone.localtime(p.data_hora).isoformat()};"
                f"{i.variante.sku};{i.variante.produto.categoria};{i.quantidade};"
                f"{str(i.receita_item).replace('.', ',')};concluida;;;loja;"
            )
    return "\n".join(linhas) + "\n"
