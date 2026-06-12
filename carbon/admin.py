from django.contrib import admin
from .models import User, Activity

admin.site.register(User)
@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'platform', 'duration', 'carbon', 'created_at')
    list_filter = ('platform', 'created_at')

