import requests
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views import View
import json
import re
from .cache import cache_instance

def extract_cpu_busy(text):
    match = re.search(r'cpu_busy:\s*([\d.]+)', text)
    return float(match.group(1)) if match else None

def extract_vm_instance(text):
    match = re.search(r'Instance Type:\s*([^\s]+)', text)
    return match.group(1) if match else None

def extract_read_io_type(text, io_type):
    # Example line: read_io_type.cache: 12345
    match = re.search(rf'read_io_type\.{io_type}:\s*([\d.]+)', text)
    return float(match.group(1)) if match else None

# ishita added
def extract_read_ops(text):
    # Example line: read_ops: 12345
    match = re.search(r'read_ops:\s*([^\s]+)', text)
    return match.group(1) if match else None

def extract_rdma_actual_latency(text, label):
    # Example line: rdma_actual_latency.WAFL_SPINNP_WRITE: 12.34
    match = re.search(rf'rdma_actual_latency\.{label}:\s*([\d.]+)', text)
    return float(match.group(1)) if match else None

# --- Grover summary API ---

@csrf_exempt
def fetch_multiple_runs(request):
    runids_param = request.GET.get('runids')
    if not runids_param:
        return JsonResponse({'error': 'Missing runids parameter'}, status=400)

    runids = [rid.strip() for rid in runids_param.split(',') if rid.strip()]
    if not runids:
        return JsonResponse({'error': 'No valid run IDs provided'}, status=400)

    results = {}
    for runid in runids:
        # Use the same logic as FetchGraphDataView.fetch_run_data
        data_points, summary = FetchGraphDataView.fetch_run_data(runid)
        results[runid] = {
            'summary': summary
        }

    # Save the results to a file in the project directory
    file_path = 'runs_data.json'
    with open(file_path, 'w') as f:
        json.dump(results, f, indent=2)

    return JsonResponse({'status': 'success', 'file': file_path})

@csrf_exempt    
def fetch_run_data(request):
    runid = request.GET.get('runid')
    if not runid:
        return JsonResponse({'error': 'Missing runid parameter'}, status=400)

    # Check cache first
    cached_data = cache_instance.get(f"grover_{runid}")
    if cached_data is not None:
        # Return cached data as application/json
        return HttpResponse(cached_data, content_type='application/json')

    url = f"http://grover.rtp.netapp.com/KO/rest/api/Runs/{runid}?req_fields=purpose,user,peak_mbs,workload,peak_iter,ontap_ver,peak_ops,peak_lat"
    try:
        response = requests.get(url)
        response.raise_for_status()
        # Only cache if not already present
        cache_instance.put(f"grover_{runid}", response.text)
        return HttpResponse(response.text, content_type=response.headers.get('Content-Type', 'application/json'))
    except requests.RequestException as e:
        return JsonResponse({'error': str(e)}, status=500)

# --- Main detailed metrics view ---

class FetchGraphDataView(View):
    def get(self, request):
        run_id1 = request.GET.get('run_id1')
        run_id2 = request.GET.get('run_id2')

        if not run_id1:
            return JsonResponse({'error': 'run_id1 parameter is required'}, status=400)

        try:
            data = {}
            summary = {}
            data_points1, summary1 = self.fetch_run_data(run_id1)
            data[run_id1] = data_points1
            summary[run_id1] = summary1
            if run_id2:
                data_points2, summary2 = self.fetch_run_data(run_id2)
                data[run_id2] = data_points2
                summary[run_id2] = summary2

            return JsonResponse({'data_points': data, 'summary': summary}, safe=False)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': str(e)}, status=500)

    @staticmethod
    def fetch_run_data(run_id):
        # Check cache first
        cached_data = cache_instance.get(run_id)
        if cached_data:
            return cached_data['data_points'], cached_data['summary']

        year_month = run_id[:4]
        base_url = (
            f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/testdirview.cgi'
            f'?p=/x/eng/perfcloud/RESULTS/{year_month}/{run_id}/ontap_command_output'
        )
        response = requests.get(base_url)
        response.raise_for_status()
        text = response.text

        # Find iteration links
        links = re.findall(
            r'href="testdirview.cgi\?p=/x/eng/perfcloud/RESULTS/[^"]+/ontap_command_output/([^"/]+)"',
            text
        )

        data_points = []

        for folder in links:
            base_path = f"/x/eng/perfcloud/RESULTS/{year_month}/{run_id}/ontap_command_output/{folder}"

            # stats_workload.txt
            stats_url = f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/view.cgi?p={base_path}/stats_workload.txt'
            stats_response = requests.get(stats_url)
            stats_text = stats_response.text if stats_response.ok else ""

            # stats_system.txt
            system_url = f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/view.cgi?p={base_path}/stats_system.txt'
            system_response = requests.get(system_url)
            system_text = system_response.text if system_response.ok else ""

            # cloud_test_harness.log - pass URL only, not content
            harness_log_url = f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/view.cgi?p=/x/eng/perfcloud/RESULTS/{year_month}/{run_id}/cloud_test_harness.log'

            # system_node_virtual_machine_instance_show.txt
            vm_url = f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/view.cgi?p={base_path}/system_node_virtual_machine_instance_show.txt'
            vm_response = requests.get(vm_url)
            vm_text = vm_response.text if vm_response.ok else ""

            # stats_wafl_flexlog.txt
            wafl_url = f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/view.cgi?p={base_path}/stats_wafl_flexlog.txt'
            wafl_response = requests.get(wafl_url)
            wafl_text = wafl_response.text if wafl_response.ok else ""

            # Extract metrics
            latency_match = re.search(r'latency:(\d+\.\d+)us', stats_text)
            throughput_match = re.search(r'write_data:(\d+)b/s', stats_text)
            throughput_mbs = int(throughput_match.group(1)) / (1024 * 1024) if throughput_match else None
            latency = float(latency_match.group(1)) if latency_match else None

            cpu_busy = extract_cpu_busy(system_text)
            vm_instance = extract_vm_instance(vm_text)
            read_io_type_cache = extract_read_io_type(stats_text, 'cache')
            read_io_type_ext_cache = extract_read_io_type(stats_text, 'ext_cache')
            read_io_type_disk = extract_read_io_type(stats_text, 'disk')
            read_io_type_bamboo_ssd = extract_read_io_type(stats_text, 'bamboo_ssd')
            read_ops = extract_read_ops(stats_text)
            rdma_actual_latency = extract_rdma_actual_latency(wafl_text, 'WAFL_SPINNP_WRITE')
            

            data_points.append({
                'iteration': folder,
                'latency_us': latency,
                'throughput_mbs': throughput_mbs,
                'cpu_busy': cpu_busy,
                'vm_instance': vm_instance,
                'read_io_type_cache': read_io_type_cache,
                'read_io_type_ext_cache': read_io_type_ext_cache,
                'read_io_type_disk': read_io_type_disk,
                'read_io_type_bamboo_ssd': read_io_type_bamboo_ssd,
                'rdma_actual_latency': rdma_actual_latency,
                'harness_log': harness_log_url,
                'read_ops': read_ops,
            })

        # Find peak throughput iteration
        peak_point = max(data_points, key=lambda x: x.get('throughput_mbs', 0) or 0) if data_points else None
        peak_iteration = peak_point['iteration'] if peak_point else None

        # Now, fetch Grover summary for top fields
        grover_fields = ["purpose", "user", "peak_mbs", "workload", "peak_iter", "ontap_ver", "peak_ops", "peak_lat", "model"]
        grover_url = f"http://grover.rtp.netapp.com/KO/rest/api/Runs/{run_id}?req_fields={','.join(grover_fields)}"
        grover_data = {}
        try:
            grover_resp = requests.get(grover_url)
            if grover_resp.ok:
                grover_data = grover_resp.json()
        except Exception:
            pass

        # Compose summary using grover_data and peak_point
        summary = {
            # Grover summary fields
            "purpose": grover_data.get("purpose"),
            "user": grover_data.get("user"),
            "peak_mbs": grover_data.get("peak_mbs"),
            "workload": grover_data.get("workload"),
            "peak_iter": grover_data.get("peak_iter"),
            "ontap_ver": grover_data.get("ontap_ver"),
            "peak_ops": grover_data.get("peak_ops"),
            "peak_lat": grover_data.get("peak_lat"),
            "model": grover_data.get("model"),
            # Custom fields (from peak iteration)
            "cpu_busy": peak_point['cpu_busy'] if peak_point else None,
            "vm_instance": peak_point['vm_instance'] if peak_point else None,
            "read_io_type_cache": peak_point['read_io_type_cache'] if peak_point else None,
            "read_io_type_ext_cache": peak_point['read_io_type_ext_cache'] if peak_point else None,
            "read_io_type_disk": peak_point['read_io_type_disk'] if peak_point else None,
            "read_io_type_bamboo_ssd": peak_point['read_io_type_bamboo_ssd'] if peak_point else None,
            "rdma_actual_latency": peak_point['rdma_actual_latency'] if peak_point else None,
            "peak_throughput_iteration": peak_iteration,
            "peak_throughput_mbs": peak_point['throughput_mbs'] if peak_point else None,
            "peak_latency_us": peak_point['latency_us'] if peak_point else None,
            "harness_log": peak_point['harness_log'] if peak_point else None,
            "read_ops": peak_point['read_ops'] if peak_point else None,

        }

        # Cache the result
        cache_data = {
            'summary': summary
        }
        cache_instance.put(run_id, cache_data)

        return data_points, summary