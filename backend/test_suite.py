import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("========================================")
    print("  RUNNING MEDIQUEUE QA TEST SUITE       ")
    print("========================================")

    # 1. Health & Database Test
    print("\n[TEST 1] Checking API Health & MongoDB Atlas...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    health_data = res.json()
    assert health_data["mongodb_connected"] is True, f"MongoDB not connected: {health_data}"
    print(f"  PASS: MongoDB Atlas connected! Active collections: {health_data['collections']}")

    # 2. Authentication & Role Logins
    print("\n[TEST 2] Testing Role-based Authentication...")
    
    # Admin login
    admin_login = client.post("/api/auth/login", json={"email": "admin@mediqueue.demo", "password": "Password123!"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    assert admin_login.json()["user"]["role"] == "admin"
    print("  PASS: Admin login successful with role 'admin'")

    # Doctor login
    doc_login = client.post("/api/auth/login", json={"email": "doctor@mediqueue.demo", "password": "Password123!"})
    assert doc_login.status_code == 200, f"Doctor login failed: {doc_login.text}"
    doc_token = doc_login.json()["access_token"]
    assert doc_login.json()["user"]["role"] == "doctor"
    print("  PASS: Doctor login successful with role 'doctor'")

    # Patient login
    pat_login = client.post("/api/auth/login", json={"email": "patient@mediqueue.demo", "password": "Password123!"})
    assert pat_login.status_code == 200, f"Patient login failed: {pat_login.text}"
    pat_token = pat_login.json()["access_token"]
    assert pat_login.json()["user"]["role"] == "patient"
    print("  PASS: Patient login successful with role 'patient'")

    # 3. Security: Role-Based Authorization & Unauthorized Prevention
    print("\n[TEST 3] Testing Security & Unauthorized Access Prevention...")
    
    # Patient attempts to access admin stats -> Must return 403 Forbidden
    pat_auth_header = {"Authorization": f"Bearer {pat_token}"}
    unauth_res = client.get("/api/admin/stats", headers=pat_auth_header)
    assert unauth_res.status_code == 403, f"Expected 403 Forbidden for patient accessing admin, got {unauth_res.status_code}"
    print("  PASS: Unauthorized patient access to /api/admin/stats blocked with 403 Forbidden!")

    # Admin access allowed
    admin_auth_header = {"Authorization": f"Bearer {admin_token}"}
    admin_stats_res = client.get("/api/admin/stats", headers=admin_auth_header)
    assert admin_stats_res.status_code == 200, f"Admin stats failed: {admin_stats_res.text}"
    stats = admin_stats_res.json()
    print(f"  PASS: Admin stats retrieved! Doctors: {stats['total_doctors']}, Depts: {stats['total_departments']}")

    # 4. Doctor Queue Management & State Progression
    print("\n[TEST 4] Testing Doctor Queue Progression...")
    doc_auth_header = {"Authorization": f"Bearer {doc_token}"}
    
    # Get doctor queue
    q_res = client.get("/api/doctors/queue/today", headers=doc_auth_header)
    assert q_res.status_code == 200
    q_data = q_res.json()
    print(f"  Doctor queue loaded: Now Serving: {q_data['now_serving']['ticket_number'] if q_data['now_serving'] else 'None'}, Waiting: {q_data['waiting_count']}")

    # If there is a patient currently in consultation, mark completed
    if q_data['now_serving']:
        now_id = q_data['now_serving']['id']
        action_res = client.post(f"/api/doctors/action/{now_id}/completed", headers=doc_auth_header)
        assert action_res.status_code == 200
        print(f"  PASS: Marked current consultation {q_data['now_serving']['ticket_number']} as COMPLETED!")

    # Doctor calls next patient
    call_res = client.post("/api/doctors/call-next", headers=doc_auth_header)
    if call_res.status_code == 200:
        called = call_res.json()
        assert called["status"] == "in_consultation"
        print(f"  PASS: Doctor successfully called next patient: Ticket #{called['ticket_number']} is now IN_CONSULTATION!")
    else:
        print(f"  Notice on call-next: {call_res.json().get('detail')}")

    # 5. Patient Appointment Booking & Ticket Generation
    print("\n[TEST 5] Testing End-to-End Patient Appointment Booking...")
    # Fetch doctors
    docs_res = client.get("/api/doctors")
    assert docs_res.status_code == 200
    doctors = docs_res.json()
    assert len(doctors) > 0
    target_doc = doctors[0]

    booking_payload = {
        "doctor_id": target_doc["id"],
        "date": "2026-09-25",
        "time_slot": "Morning Queue",
        "symptoms": "Test consultation for QA verification"
    }
    book_res = client.post("/api/appointments", json=booking_payload, headers=pat_auth_header)
    assert book_res.status_code == 200, f"Booking failed: {book_res.text}"
    booked = book_res.json()
    assert "ticket_number" in booked
    assert booked["status"] == "waiting"
    print(f"  PASS: Appointment successfully booked! Assigned Ticket: {booked['ticket_number']}, Est Wait: {booked['estimated_wait_mins']} mins")

    # 6. Public Lobby TV Queue Display
    print("\n[TEST 6] Testing Public Waiting Lobby TV Queue Board...")
    lobby_res = client.get("/api/queue/overview")
    assert lobby_res.status_code == 200
    lobby_data = lobby_res.json()
    assert len(lobby_data) > 0
    print(f"  PASS: Hospital Lobby TV Display verified! Active clinic counters: {len(lobby_data)}")

    print("\n========================================")
    print("  ALL TESTS PASSED WITH 100% SUCCESS!   ")
    print("========================================")

if __name__ == "__main__":
    run_tests()
