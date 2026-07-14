import urllib.request
import json
import sys

def test_api():
    print("Testing FastAPI Backend APIs...")
    base_url = "http://127.0.0.1:8000/api"
    
    try:
        # 1. Get HCPs
        print("\n1. Testing GET /api/hcps...")
        req = urllib.request.Request(f"{base_url}/hcps")
        with urllib.request.urlopen(req) as res:
            hcps = json.loads(res.read().decode())
            print(f"Success! Found {len(hcps)} HCPs.")
            for h in hcps:
                print(f" - {h['name']} ({h['specialty']})")
                
        # 2. Get Materials & Samples
        print("\n2. Testing GET /api/materials-samples...")
        req = urllib.request.Request(f"{base_url}/materials-samples")
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print(f"Success! Found {len(data['materials'])} materials and {len(data['samples'])} samples.")

        # 3. Test Voice Summarization
        print("\n3. Testing POST /api/voice-summarize...")
        payload = {"transcript": "Met Dr. Sarah Smith, discussed CardioLife, Positive sentiment, shared dosage guide."}
        req = urllib.request.Request(
            f"{base_url}/voice-summarize",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print("Success! Extracted fields:")
            print(json.dumps(data, indent=2))

        # 4. Test Direct Log Interaction
        print("\n4. Testing POST /api/interactions...")
        payload = {
            "hcp_id": 1,
            "interaction_type": "Meeting",
            "date": "2026-07-13",
            "time": "18:00",
            "attendees": "Dr. Sharma, Nurse",
            "topics_discussed": "Discussed clinical trials.",
            "sentiment": "Positive",
            "outcomes": "Agreed to follow up",
            "follow_up_actions": "Send trial reports",
            "materials_shared_ids": [1],
            "samples_distributed_ids": [1]
        }
        req = urllib.request.Request(
            f"{base_url}/interactions",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print("Success! Logged interaction:")
            print(json.dumps(data, indent=2))
            interaction_id = data["id"]

        # 5. Test Update Interaction
        print(f"\n5. Testing PUT /api/interactions/{interaction_id}...")
        update_payload = {"sentiment": "Negative", "topics_discussed": "Discussed side effects and concerns."}
        req = urllib.request.Request(
            f"{base_url}/interactions/{interaction_id}",
            data=json.dumps(update_payload).encode(),
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print("Success! Updated interaction:")
            print(json.dumps(data, indent=2))

        # 6. Test Chat
        print("\n6. Testing POST /api/chat (Mock agent execution)...")
        chat_payload = {
            "messages": [{"role": "user", "content": "Met Dr. Smith, discussed CardioLife, sentiment positive. Log this."}],
            "draft_interaction": {}
        }
        req = urllib.request.Request(
            f"{base_url}/chat",
            data=json.dumps(chat_payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            print("Success! Chat response:")
            print(json.dumps(data, indent=2))
            
    except Exception as e:
        print(f"\nError running verification checks: {e}")
        print("Please ensure the FastAPI backend server is running on http://127.0.0.1:8000")
        sys.exit(1)

if __name__ == "__main__":
    test_api()
