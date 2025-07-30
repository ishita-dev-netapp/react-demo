from django.urls import path
from . import views
from .views import FetchGraphDataView


urlpatterns = [
    path('api/fetch_run_data/', views.fetch_run_data, name='fetch_run_data'),
    path('api/fetch_graph_data/', FetchGraphDataView.as_view(), name='fetch_graph_data'),
    path('api/fetch_multiple_runs/', views.fetch_multiple_runs, name='fetch_multiple_runs'),
]
