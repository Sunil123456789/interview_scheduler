from rest_framework.permissions import BasePermission


class IsHRAdmin(BasePermission):
    """Allow access only to authenticated staff users (HR/Admin)."""

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)
