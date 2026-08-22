import json
import urllib.request

url = "https://openrouter.ai/api/v1/models"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
        for model in data.get("data", []):
            id = model.get("id", "")
            if ":free" in id:
                print(id)
except Exception as e:
    print(f"Error: {e}")
