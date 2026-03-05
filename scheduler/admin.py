from django.contrib import admin

from .models import Interview


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'candidate', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('candidate__name',)
