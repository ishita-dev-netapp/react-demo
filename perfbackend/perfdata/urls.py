from django.urls import path
from . import views
from .views import FetchGraphDataView


urlpatterns = [
    path('api/fetch_run_data/', views.fetch_run_data, name='fetch_run_data'),
    #path('api/grover_metrics/', views.fetch_grover_metrics, name='fetch_grover_metrics'),
    path('api/fetch_graph_data/', FetchGraphDataView.as_view(), name='fetch_graph_data'),
]
