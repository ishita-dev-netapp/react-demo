import requests
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import re
from django.views import View
@csrf_exempt
def fetch_run_data(request):
    runid = request.GET.get('runid')
    if not runid:
        return JsonResponse({'error': 'Missing runid parameter'}, status=400)

    url = f"http://grover.rtp.netapp.com/KO/rest/api/Runs/{runid}?req_fields=purpose,user,peak_mbs,workload,peak_iter,ontap_ver,peak_ops,peak_lat"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return HttpResponse(response.text, content_type=response.headers.get('Content-Type', 'text/plain'))
    except requests.RequestException as e:
        return JsonResponse({'error': str(e)}, status=500)

    

def extract_metrics_from_text(text):
    # Regex patterns for the lines you want
    latency_pattern = re.compile(r'latency:([\d.]+)us')
    throughput_pattern = re.compile(r'write_data:(\d+)b/s')

    latency = None
    throughput_bps = None

    for line in text.splitlines():
        if 'latency:' in line:
            match = latency_pattern.search(line)
            if match:
                latency = float(match.group(1))
        if 'write_data:' in line:
            match = throughput_pattern.search(line)
            if match:
                throughput_bps = int(match.group(1))

    # Convert throughput to MB/s
    throughput_mbs = throughput_bps / (1024 * 1024) if throughput_bps else None
    print("latency"+latency, "throughput"+throughput_mbs)  # Uncomment for debugging
    return latency, throughput_mbs

@csrf_exempt
def fetch_grover_metrics(request):
    runid = request.GET.get('runid')
    if not runid or len(runid) < 4:
        return JsonResponse({'error': 'Invalid runid'}, status=400)

    yearmonth = runid[:4]
    # List iteration folders
    base_url = f"http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/testdirview.cgi?p=/x/eng/perfcloud/RESULTS/{yearmonth}/{runid}/ontap_command_output"

    resp = requests.get(base_url)
    if resp.status_code != 200:
        return JsonResponse({'error': 'Could not list iteration folders'}, status=500)

    # Extract folder names from HTML
    iteration_folders = re.findall(r'href="([^"/]+?_\d+_\d+)/"', resp.text)
    print(resp.text)
    metrics = []

    for folder in iteration_folders:
        stats_url = f"http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/view.cgi?p=/x/eng/perfcloud/RESULTS/{yearmonth}/{runid}/ontap_command_output/{folder}/stats_workload.txt"
        print("Trying stats_url:", stats_url)
        stats_resp = requests.get(stats_url)
        if stats_resp.status_code != 200:
            continue  # skip if file not found

        latency, throughput_mbs = extract_metrics_from_text(stats_resp.text)
        metrics.append({
            'iteration': folder,
            'latency_us': latency,
            'throughput_mbs': throughput_mbs,
        })
    #print("final"+metrics)  # Uncomment for debugging
    return JsonResponse({'metrics': metrics})
class FetchGraphDataView(View):
    def get(self, request):
        run_id1 = request.GET.get('run_id1')
        run_id2 = request.GET.get('run_id2')

        if not run_id1:
            return JsonResponse({'error': 'run_id1 parameter is required'}, status=400)

        def fetch_run_data(run_id):
            year_month = run_id[:4]
            base_url = (
                f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/testdirview.cgi'
                f'?p=/x/eng/perfcloud/RESULTS/{year_month}/{run_id}/ontap_command_output'
            )
            print(f"Fetching base URL: {base_url}")
            response = requests.get(base_url)
            response.raise_for_status()
            text = response.text

            # Find iteration links
            links = re.findall(
                r'href="testdirview.cgi\?p=/x/eng/perfcloud/RESULTS/[^"]+/ontap_command_output/([^"/]+)"',
                text
            )
            print(f"Iteration folders found for {run_id}: {links}")

            data_points = []
            for folder in links:
                stats_url = (
                    f'http://perfweb.gdl.englab.netapp.com/cgi-bin/perfcloud/view.cgi'
                    f'?p=/x/eng/perfcloud/RESULTS/{year_month}/{run_id}/ontap_command_output/{folder}/stats_workload.txt'
                )
                stats_response = requests.get(stats_url)
                if stats_response.ok:
                    stats_text = stats_response.text
                    latency_match = re.search(r'latency:(\d+\.\d+)us', stats_text)
                    ops_match = re.search(r'ops:(\d+)/s', stats_text)
                    throughput_match = re.search(r'write_data:(\d+)b/s', stats_text)
                    if latency_match and throughput_match:
                        data_points.append({
                            'iteration': folder,
                            'latency_us': float(latency_match.group(1)),
                            'throughput_mbs': int(throughput_match.group(1)) / (1024 * 1024),
                        })
            return data_points

        try:
            data = {}
            data[run_id1] = fetch_run_data(run_id1)
            if run_id2:
                data[run_id2] = fetch_run_data(run_id2)

            print(f"Data points collected: {data}")
            return JsonResponse({'data_points': data}, safe=False)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': str(e)}, status=500)