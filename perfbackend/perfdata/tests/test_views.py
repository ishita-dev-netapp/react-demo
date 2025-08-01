import pytest
from django.test import Client
from unittest.mock import patch, MagicMock

from perfdata.views import (
    extract_cpu_busy, 
    extract_vm_instance, 
    extract_read_io_type, 
    extract_rdma_actual_latency,
    extract_read_ops,
)

@pytest.mark.django_db
def test_extract_cpu_busy():
    text = "some info cpu_busy: 42.5 more text"
    assert extract_cpu_busy(text) == 42.5
    assert extract_cpu_busy("no cpu info") is None

@pytest.mark.django_db
def test_extract_vm_instance():
    text = "Instance Type: Standard_L32s_v3"
    assert extract_vm_instance(text) == "Standard_L32s_v3"
    assert extract_vm_instance("no instance") is None

@pytest.mark.django_db
def test_extract_read_io_type():
    text = "read_io_type.cache: 12345"
    assert extract_read_io_type(text, "cache") == 12345.0
    assert extract_read_io_type("nothing here", "cache") is None

@pytest.mark.django_db
def test_extract_rdma_actual_latency():
    text = "rdma_actual_latency.WAFL_SPINNP_WRITE: 9.87"
    assert extract_rdma_actual_latency(text, "WAFL_SPINNP_WRITE") == 9.87
    assert extract_rdma_actual_latency("no latency", "WAFL_SPINNP_WRITE") is None

@pytest.mark.django_db
def test_extract_read_ops():
    text = "some info read_ops: 5000 more text"
    assert extract_read_ops(text) == "5000"
    assert extract_read_ops("no read ops") is None

@pytest.mark.django_db
@patch("perfdata.views.requests.get")
def test_fetch_run_data_view(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = '{"purpose":"test"}'
    mock_response.headers = {'Content-Type': 'application/json'}
    mock_get.return_value = mock_response
    client = Client()
    response = client.get("/api/fetch_run_data/?runid=250723hhx")
    assert response.status_code == 200
    assert b"purpose" in response.content

@pytest.mark.django_db
@patch("perfdata.views.requests.get")
def test_fetch_graph_data_view(mock_get):
    mock_response = MagicMock()
    mock_response.ok = True
    mock_response.text = """
        href="testdirview.cgi?p=/x/eng/perfcloud/RESULTS/2507/250723hhx/ontap_command_output/5_257000"
    """
    mock_response_stats = MagicMock()
    mock_response_stats.ok = True
    mock_response_stats.text = "latency:10.0us write_data:1048576b/s cpu_busy: 50.0"
    mock_response_vm = MagicMock()
    mock_response_vm.ok = True
    mock_response_vm.text = "Instance Type: Standard_L32s_v3"
    mock_response_grover = MagicMock()
    mock_response_grover.ok = True
    mock_response_grover.json.return_value = {
        "purpose": "AWS_M6i_16XLARGE NFSv4.1 64k SeqWrite comp=60 dedup=0 SIDL HA OW=1 8-vol",
        "user": "perfcloudreg",
        "peak_mbs": 1014.04,
        "workload": "seqwrite_op_rate",
        "peak_iter": "5_38500.0",
        "ontap_ver": "R9.18.1xN_250722_0000",
        "peak_ops": 15473,
        "peak_lat": -1
    }
    mock_get.side_effect = [
        mock_response,
        mock_response_stats,
        mock_response_stats,
        mock_response_vm,
        mock_response_stats,
        mock_response_grover
    ]
    client = Client()
    response = client.get("/api/fetch_graph_data/?run_id1=250723hhx")
    assert response.status_code == 200
    data = response.json()
    assert "data_points" in data
    assert "summary" in data
    assert isinstance(data["data_points"], dict)
    assert isinstance(data["summary"], dict)
    assert "250723hhx" in data["data_points"]
    assert isinstance(data["data_points"]["250723hhx"], list)
    assert "250723hhx" in data["summary"]