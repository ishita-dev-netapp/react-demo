from django.shortcuts import render

# Create your views here.
import requests
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def fetch_run_data(request):
    runid = request.GET.get('runid')
    if not runid:
        return JsonResponse({'error': 'Missing runid parameter'}, status=400)

    url = f"http://grover.rtp.netapp.com/KO/rest/api/Runs/{runid}?req_fields=purpose,user,peak_mbs"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return HttpResponse(response.text, content_type=response.headers.get('Content-Type', 'text/plain'))
    except requests.RequestException as e:
        return JsonResponse({'error': str(e)}, status=500)