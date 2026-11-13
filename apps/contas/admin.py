from django.contrib import admin

from .models import ConfiguracaoLoja, Loja, Vinculo


class VinculoInline(admin.TabularInline):
    model = Vinculo
    extra = 0


@admin.register(Loja)
class LojaAdmin(admin.ModelAdmin):
    list_display = ("nome", "segmento", "demo")
    inlines = [VinculoInline]


admin.site.register(ConfiguracaoLoja)
