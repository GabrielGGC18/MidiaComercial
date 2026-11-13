class LojaAtualMiddleware:
    """Resolve request.loja e request.papel a partir da sessão, validando o Vinculo."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.loja = None
        request.papel = None
        if request.user.is_authenticated:
            loja_id = request.session.get("loja_id")
            if loja_id is not None:
                vinculo = (
                    request.user.vinculos.filter(loja_id=loja_id).select_related("loja").first()
                )
                if vinculo:
                    request.loja = vinculo.loja
                    request.papel = vinculo.papel
        return self.get_response(request)
