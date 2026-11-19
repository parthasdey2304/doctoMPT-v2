import requests

BASE = "http://127.0.0.1:8000"

def test():
    # 1. Health
    r = requests.get(f"{BASE}/health")
    print("Health:", r.json())

    # 2. Save record
    sample = {
        "patient_name": "Rajesh Kumar",
        "age": 42,
        "gender": "Male",
        "chief_complaint": "Persistent dry cough, throat irritation",
        "diagnosis": "Acute Viral Bronchitis",
        "prescription": {
            "medications": [
                {"name": "Azithromycin 500mg", "dosage": "Once daily for 3 days"}
            ]
        }
    }
    r = requests.post(f"{BASE}/api/records", json=sample)
    print("Save record:", r.json())

    # 3. List records
    r = requests.get(f"{BASE}/api/records")
    print("List records:", r.json())

    # 4. Backup
    r = requests.post(f"{BASE}/api/records/backup")
    print("Backup:", r.json())

    # 5. List backups
    r = requests.get(f"{BASE}/api/records/backups")
    print("List backups:", r.json())

    # 6. Tata 1mg
    r = requests.get(f"{BASE}/api/medicines/1mg", params={"q": "paracetamol"})
    print("1mg search results:", len(r.json().get("results", [])))

    # 7. PharmEasy
    r = requests.get(f"{BASE}/api/medicines/pharmeasy", params={"q": "azithromycin"})
    print("PharmEasy search results:", len(r.json().get("results", [])))

if __name__ == "__main__":
    test()
