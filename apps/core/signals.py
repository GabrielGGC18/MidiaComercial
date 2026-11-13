from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver


@receiver(user_logged_in)
def definir_loja_no_login(sender, request, user, **kwargs):
    """Uma loja → grava direto na sessão. Várias → usuário escolhe em /loja/."""
    lojas = list(user.vinculos.values_list("loja_id", flat=True)[:2])
    if len(lojas) == 1:
        request.session["loja_id"] = lojas[0]
    else:
        request.session.pop("loja_id", None)
