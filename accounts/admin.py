from django.contrib import admin

# use import-export for CSV/Excel management
from import_export import resources
from import_export.admin import ImportExportModelAdmin

from .models import Area, AOM, Candidate


class AreaResource(resources.ModelResource):
    class Meta:
        model = Area


@admin.register(Area)
class AreaAdmin(ImportExportModelAdmin):
    resource_class = AreaResource


class AOMResource(resources.ModelResource):
    class Meta:
        model = AOM
        exclude = ('password',)  # avoid exporting sensitive data


@admin.register(AOM)
class AOMAdmin(ImportExportModelAdmin):
    resource_class = AOMResource
    list_display = ('username', 'email', 'area')
    search_fields = ('username', 'email')


class CandidateResource(resources.ModelResource):
    class Meta:
        model = Candidate


@admin.register(Candidate)
class CandidateAdmin(ImportExportModelAdmin):
    resource_class = CandidateResource
    list_display = ('name', 'email', 'area', 'applied_at')
    search_fields = ('name', 'email')
