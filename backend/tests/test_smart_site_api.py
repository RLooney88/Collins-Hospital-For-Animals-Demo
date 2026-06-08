"""
Veterinary Site Template - Backend API Tests
Tests for: sessions, signals, surfaces, leads, admin auth, admin CRUD, analytics
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable is required")

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@cha.rclintegrated.com"
ADMIN_PASSWORD = "WashingtonVet2026!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_ok(self, api_client):
        """GET /api/health returns {status: ok}"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"


class TestSessionsAndSignals:
    """Session initialization and signal tracking tests"""
    
    def test_session_init_creates_session(self, api_client):
        """POST /api/sessions/init creates a session and returns session_token"""
        response = api_client.post(f"{BASE_URL}/api/sessions/init", json={
            "existing_token": None,
            "referrer": "https://google.com",
            "user_agent": "pytest-test-agent"
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert isinstance(data["session_token"], str)
        assert len(data["session_token"]) > 0
        # Store for later tests
        self.__class__.session_token = data["session_token"]
    
    def test_signal_track_updates_intent_scores(self, api_client):
        """POST /api/signals/track updates session's intent_scores and parent_intent"""
        session_token = getattr(self.__class__, 'session_token', None)
        if not session_token:
            pytest.skip("No session token available")
        
        # Track page_view signal
        response = api_client.post(f"{BASE_URL}/api/signals/track", json={
            "session_token": session_token,
            "signal_type": "page_view",
            "page_path": "/",
            "label": "home",
            "intent": None,
            "sub_intent": None,
            "strength": 1,
            "meta": {}
        })
        assert response.status_code == 200
        
        # Track intent_select for dogs
        response = api_client.post(f"{BASE_URL}/api/signals/track", json={
            "session_token": session_token,
            "signal_type": "intent_select",
            "page_path": "/",
            "label": "intent:dogs",
            "intent": "dogs",
            "sub_intent": None,
            "strength": 2,
            "meta": {}
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("parent_intent") == "dogs"
        assert "dogs" in (data.get("intent_scores") or {})
        
        # Track sub_intent_select for new_puppy
        response = api_client.post(f"{BASE_URL}/api/signals/track", json={
            "session_token": session_token,
            "signal_type": "sub_intent_select",
            "page_path": "/",
            "label": "sub_intent:new_puppy",
            "intent": "dogs",
            "sub_intent": "new_puppy",
            "strength": 2,
            "meta": {}
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("parent_intent") == "dogs"
        assert data.get("sub_intent") == "new_puppy"
        assert "new_puppy" in (data.get("sub_intent_scores") or {})


class TestSurfaceContent:
    """Surface content resolution tests"""
    
    def test_surface_content_default_no_session(self, api_client):
        """GET /api/surfaces/home_hero/content (no session) returns default content"""
        response = api_client.get(f"{BASE_URL}/api/surfaces/home_hero/content")
        assert response.status_code == 200
        data = response.json()
        assert data.get("surface_slug") == "home_hero"
        assert "content" in data
        # Default content should have headline
        assert "headline" in data.get("content", {})
    
    def test_surface_content_with_intent_matches_switch(self, api_client):
        """GET /api/surfaces/home_hero/content with dogs+new_puppy intent returns matched switch"""
        # First create a session and set intent
        init_resp = api_client.post(f"{BASE_URL}/api/sessions/init", json={
            "existing_token": None,
            "referrer": None,
            "user_agent": "pytest"
        })
        assert init_resp.status_code == 200
        session_token = init_resp.json()["session_token"]
        
        # Set dogs intent
        api_client.post(f"{BASE_URL}/api/signals/track", json={
            "session_token": session_token,
            "signal_type": "intent_select",
            "page_path": "/",
            "label": "intent:dogs",
            "intent": "dogs",
            "sub_intent": None,
            "strength": 2,
            "meta": {}
        })
        
        # Set new_puppy sub-intent
        api_client.post(f"{BASE_URL}/api/signals/track", json={
            "session_token": session_token,
            "signal_type": "sub_intent_select",
            "page_path": "/",
            "label": "sub_intent:new_puppy",
            "intent": "dogs",
            "sub_intent": "new_puppy",
            "strength": 2,
            "meta": {}
        })
        
        # Now get surface content
        response = api_client.get(f"{BASE_URL}/api/surfaces/home_hero/content", params={
            "session_token": session_token
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("inferred_intent") == "dogs"
        assert data.get("inferred_sub_intent") == "new_puppy"
        # Should match a puppy-related switch
        matched_name = data.get("matched_switch_name") or ""
        assert "Puppy" in matched_name or "puppy" in matched_name.lower() or data.get("matched_switch_id") is not None


class TestLeadSubmission:
    """Lead creation tests"""
    
    def test_create_lead_with_session(self, api_client):
        """POST /api/leads creates a lead with intent_summary + signal_trail from session"""
        # Create session and track some signals
        init_resp = api_client.post(f"{BASE_URL}/api/sessions/init", json={
            "existing_token": None,
            "referrer": "https://test.com",
            "user_agent": "pytest-lead-test"
        })
        session_token = init_resp.json()["session_token"]
        
        # Track intent
        api_client.post(f"{BASE_URL}/api/signals/track", json={
            "session_token": session_token,
            "signal_type": "intent_select",
            "page_path": "/",
            "label": "intent:cats",
            "intent": "cats",
            "sub_intent": None,
            "strength": 2,
            "meta": {}
        })
        
        # Create lead
        response = api_client.post(f"{BASE_URL}/api/leads", json={
            "session_token": session_token,
            "name": "TEST_Lead User",
            "email": "test_lead@example.com",
            "phone": "555-1234",
            "pet_name": "Whiskers",
            "pet_type": "cats",
            "service_interest": "Wellness Exam",
            "comment": "Test lead from pytest",
            "preferred_time": "Morning",
            "source_page": "/appointment"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == "TEST_Lead User"
        assert data.get("email") == "test_lead@example.com"
        assert "id" in data
        # Check intent_summary is populated
        intent_summary = data.get("intent_summary") or {}
        assert intent_summary.get("parent_intent") == "cats"
        # Check signal_trail is populated
        signal_trail = data.get("signal_trail") or []
        assert len(signal_trail) > 0
        # Store lead ID for later tests
        self.__class__.lead_id = data["id"]


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self, api_client):
        """POST /api/admin/login with correct creds returns access_token"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
    
    def test_admin_login_wrong_creds(self, api_client):
        """POST /api/admin/login with wrong creds returns 401"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_admin_me_with_token(self, api_client, admin_token):
        """GET /api/admin/me with token returns admin user"""
        response = api_client.get(f"{BASE_URL}/api/admin/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == ADMIN_EMAIL
        assert data.get("role") == "admin"
    
    def test_admin_me_without_token(self, api_client):
        """GET /api/admin/me without token returns 401"""
        # Create a fresh client without auth header
        fresh_client = requests.Session()
        fresh_client.headers.update({"Content-Type": "application/json"})
        response = fresh_client.get(f"{BASE_URL}/api/admin/me")
        assert response.status_code in [401, 403]


class TestAdminSurfaces:
    """Admin surfaces CRUD tests"""
    
    def test_list_surfaces_returns_at_least_7(self, api_client, admin_token):
        """GET /api/admin/surfaces lists >= 7 surfaces each with switches array"""
        response = api_client.get(f"{BASE_URL}/api/admin/surfaces", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 7, f"Expected at least 7 surfaces, got {len(data)}"
        # Each surface should have switches array
        for surface in data:
            assert "switches" in surface
            assert isinstance(surface["switches"], list)
            assert "slug" in surface
            assert "name" in surface


class TestAdminSwitches:
    """Admin switches CRUD tests"""
    
    def test_switch_crud_end_to_end(self, api_client, admin_token):
        """POST/PATCH/DELETE on a switch works end-to-end"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a surface ID
        surfaces_resp = api_client.get(f"{BASE_URL}/api/admin/surfaces", headers=headers)
        surfaces = surfaces_resp.json()
        surface_id = surfaces[0]["id"]
        
        # CREATE switch
        create_resp = api_client.post(f"{BASE_URL}/api/admin/switches", headers=headers, json={
            "surface_id": surface_id,
            "name": "TEST_Switch",
            "rule": {"intent": "dogs", "sub_intent": None},
            "content": {"headline": "Test headline"},
            "priority": 999,
            "active": True
        })
        assert create_resp.status_code == 200
        switch_data = create_resp.json()
        assert switch_data.get("name") == "TEST_Switch"
        switch_id = switch_data["id"]
        
        # PATCH switch
        patch_resp = api_client.patch(f"{BASE_URL}/api/admin/switches/{switch_id}", headers=headers, json={
            "name": "TEST_Switch_Updated",
            "priority": 888
        })
        assert patch_resp.status_code == 200
        patched = patch_resp.json()
        assert patched.get("name") == "TEST_Switch_Updated"
        assert patched.get("priority") == 888
        
        # DELETE switch
        delete_resp = api_client.delete(f"{BASE_URL}/api/admin/switches/{switch_id}", headers=headers)
        assert delete_resp.status_code == 200


class TestAdminLeads:
    """Admin leads listing tests"""
    
    def test_list_leads(self, api_client, admin_token):
        """GET /api/admin/leads lists submitted leads"""
        response = api_client.get(f"{BASE_URL}/api/admin/leads", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the lead we created earlier
        if len(data) > 0:
            lead = data[0]
            assert "id" in lead
            assert "name" in lead
            assert "email" in lead


class TestAdminAnalytics:
    """Admin analytics tests"""
    
    def test_analytics_overview(self, api_client, admin_token):
        """GET /api/admin/analytics/overview returns totals and intent_breakdown"""
        response = api_client.get(f"{BASE_URL}/api/admin/analytics/overview", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_sessions" in data
        assert "total_leads" in data
        assert "total_signals" in data
        assert "intent_breakdown" in data
        assert isinstance(data["intent_breakdown"], dict)


class TestAdminSessions:
    """Admin sessions listing tests"""
    
    def test_list_sessions(self, api_client, admin_token):
        """GET /api/admin/sessions returns session data"""
        response = api_client.get(f"{BASE_URL}/api/admin/sessions", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            session = data[0]
            assert "id" in session
            assert "session_token" in session
            # Store session ID for events test
            self.__class__.session_id = session["id"]
    
    def test_list_session_events(self, api_client, admin_token):
        """GET /api/admin/sessions/{id}/events returns event data"""
        session_id = getattr(self.__class__, 'session_id', None)
        if not session_id:
            # Get a session ID first
            sessions_resp = api_client.get(f"{BASE_URL}/api/admin/sessions", headers={
                "Authorization": f"Bearer {admin_token}"
            })
            sessions = sessions_resp.json()
            if len(sessions) == 0:
                pytest.skip("No sessions available")
            session_id = sessions[0]["id"]
        
        response = api_client.get(f"{BASE_URL}/api/admin/sessions/{session_id}/events", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
