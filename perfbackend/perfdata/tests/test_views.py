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
    # Mock the external API response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = '{"purpose":"test"}'
    mock_response.headers = {'Content-Type': 'application/json'}
    mock_get.return_value = mock_response

    client = Client()
    response = client.get("/api/fetch_run_data/?runid=250717hav")
    assert response.status_code == 200
    assert b"test" in response.content

@pytest.mark.django_db
@patch("perfdata.views.requests.get")
def test_fetch_graph_data_view(mock_get):
    # Prepare mocks for all the requests made in the view
    mock_response = MagicMock()
    mock_response.ok = True
    mock_response.text = """
        href="testdirview.cgi?p=/x/eng/perfcloud/RESULTS/2507/250717hav/ontap_command_output/5_257000"
    """
    # For stats_workload.txt, stats_system.txt, etc.
    mock_response_stats = MagicMock()
    mock_response_stats.ok = True
    mock_response_stats.text = "latency:10.0us write_data:1048576b/s cpu_busy: 50.0"

    mock_response_vm = MagicMock()
    mock_response_vm.ok = True
    mock_response_vm.text = "Instance Type: Standard_L32s_v3"

    # For grover summary
    mock_response_grover = MagicMock()
    mock_response_grover.ok = True
    mock_response_grover.json.return_value = {
        "purpose": "Azure_STANDARD_L32S_v3 NFSv4.1 8k RandRead LDM SN EC MD 8-vol",
        "user": "perfcloudreg",
        "peak_mbs": 1,
        "workload": "rndread_op_rate",
        "peak_iter": "5_257000",
        "ontap_ver": "R9.18.1xN_250722_0000",
        "peak_ops": 1000,
        "peak_lat": 10
    }

    # Setup side effects for each call
    mock_get.side_effect = [
        mock_response,  # testdirview.cgi
        mock_response_stats,  # stats_workload.txt
        mock_response_stats,  # stats_system.txt
        mock_response_vm,     # system_node_virtual_machine_instance_show.txt
        mock_response_stats,  # stats_wafl_flexlog.txt
        mock_response_grover  # grover summary
    ]

    client = Client()
    response = client.get("/api/fetch_graph_data/?run_id1=250717hav")
    assert response.status_code == 200
    data = response.json()
    assert "data_points" in data
    assert "summary" in data

