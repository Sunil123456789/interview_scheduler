from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CurrentUserView, GoogleAuthStartView, GoogleAuthCallbackView

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('google/start/', GoogleAuthStartView.as_view(), name='google_auth_start'),
    path('google/callback/', GoogleAuthCallbackView.as_view(), name='google_auth_callback'),
]
