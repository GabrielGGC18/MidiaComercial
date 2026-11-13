from django.contrib import admin
from django.urls import path

from .api import api

admin.site.site_header = "MidiaComercial · Administração"
admin.site.site_title = "MidiaComercial"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]
