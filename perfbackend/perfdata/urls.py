from django.urls import path
from . import views

urlpatterns = [
    path('api/fetch_run_data/', views.fetch_run_data, name='fetch_run_data'),
]