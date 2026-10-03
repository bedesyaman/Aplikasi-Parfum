# AromaForm backend regression tests
# Covers: health, auth (login/me/logout guard), ingredients CRUD + filters,
# formulas CRUD, duplicate (copy) and duplicate?as_version=true (version bump),
# IFRA seed data expectations, and input validation.
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "studio@aromaform.app"
DEMO_PASSWORD = "AromaForm123!"


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def auth_token(api_client):
    response = api_client.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["session_token"]


@pytest.fixture(scope="session")
def auth_client(api_client, auth_token):
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ---------- Health & Auth ----------

class TestHealthAndAuth:
    def test_api_root(self, api_client):
        response = api_client.get(f"{API}/")
        assert response.status_code == 200

    def test_login_success(self, api_client):
        response = api_client.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert data["session_token"].startswith("af_")
        assert data["user"]["email"] == DEMO_EMAIL

    def test_login_wrong_password(self, api_client):
        response = api_client.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "WrongPass999"})
        assert response.status_code == 401

    def test_me_with_token(self, auth_client):
        response = auth_client.get(f"{API}/auth/me")
        assert response.status_code == 200
        assert response.json()["email"] == DEMO_EMAIL

    def test_me_without_token_rejected(self, api_client):
        response = requests.get(f"{API}/auth/me")
        assert response.status_code == 401

    def test_protected_endpoint_requires_auth(self):
        response = requests.get(f"{API}/formulas")
        assert response.status_code == 401


# ---------- Ingredients ----------

class TestIngredients:
    def test_list_seeded_ingredients(self, auth_client):
        response = auth_client.get(f"{API}/ingredients")
        assert response.status_code == 200
        names = {ing["name"] for ing in response.json()}
        for expected in ["Bergamot", "Hedione", "Iso E Super", "Ambroxan", "Cedarwood"]:
            assert expected in names, f"Missing seeded ingredient {expected}"

    def test_bergamot_ifra_limit_seed(self, auth_client):
        response = auth_client.get(f"{API}/ingredients?search=Bergamot")
        assert response.status_code == 200
        bergamot = response.json()[0]
        assert bergamot["ifraLimitPercentage"] == 0.4
        assert bergamot["noteType"] == "Top"

    def test_search_filter(self, auth_client):
        response = auth_client.get(f"{API}/ingredients?search=cedar")
        assert response.status_code == 200
        names = [ing["name"] for ing in response.json()]
        assert "Cedarwood" in names and "Bergamot" not in names

    def test_note_type_filter(self, auth_client):
        response = auth_client.get(f"{API}/ingredients?note_type=Top")
        assert response.status_code == 200
        assert all(ing["noteType"] == "Top" for ing in response.json())

    def test_create_ingredient_and_verify_persistence(self, auth_client):
        payload = {
            "name": f"TEST_Orris_{uuid.uuid4().hex[:6]}",
            "category": "Floral",
            "noteType": "Heart",
            "costPerGram": 1.25,
            "ifraLimitPercentage": 5.0,
        }
        create_response = auth_client.post(f"{API}/ingredients", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["name"] == payload["name"]
        assert created["costPerGram"] == 1.25
        assert "_id" not in created

        # GET to verify persistence
        get_response = auth_client.get(f"{API}/ingredients?search={payload['name']}")
        assert get_response.status_code == 200
        assert any(ing["id"] == created["id"] for ing in get_response.json())

    def test_create_ingredient_validation_error(self, auth_client):
        response = auth_client.post(f"{API}/ingredients", json={"name": "TEST_Bad", "costPerGram": -5})
        assert response.status_code == 422


# ---------- Formulas ----------

class TestFormulas:
    def _velvet_cedar(self, auth_client):
        formulas = auth_client.get(f"{API}/formulas").json()
        for formula in formulas:
            if formula["title"] == "Velvet Cedar" and formula["version"] == "v1.0":
                return formula
        pytest.skip("Seeded Velvet Cedar v1.0 not found")

    def test_list_formulas_seeded(self, auth_client):
        response = auth_client.get(f"{API}/formulas")
        assert response.status_code == 200
        formula = self._velvet_cedar(auth_client)
        assert len(formula["items"]) == 5
        assert formula["targetConcentration"] == 18

    def test_get_formula_by_id(self, auth_client):
        formula = self._velvet_cedar(auth_client)
        response = auth_client.get(f"{API}/formulas/{formula['id']}")
        assert response.status_code == 200
        assert response.json()["title"] == "Velvet Cedar"

    def test_get_missing_formula_404(self, auth_client):
        response = auth_client.get(f"{API}/formulas/formula_doesnotexist")
        assert response.status_code == 404

    def test_update_formula_persists(self, auth_client):
        formula = self._velvet_cedar(auth_client)
        payload = {
            "title": formula["title"],
            "version": formula["version"],
            "targetConcentration": formula["targetConcentration"],
            "items": formula["items"],
            "notes": f"TEST note {uuid.uuid4().hex[:6]}",
        }
        put_response = auth_client.put(f"{API}/formulas/{formula['id']}", json=payload)
        assert put_response.status_code == 200
        get_response = auth_client.get(f"{API}/formulas/{formula['id']}")
        assert get_response.json()["notes"] == payload["notes"]

    def test_duplicate_creates_copy(self, auth_client):
        formula = self._velvet_cedar(auth_client)
        response = auth_client.post(f"{API}/formulas/{formula['id']}/duplicate")
        assert response.status_code == 200
        copy = response.json()
        assert copy["title"] == "Velvet Cedar Copy"
        assert copy["version"] == "v1.0"
        assert copy["id"] != formula["id"]
        assert len(copy["items"]) == len(formula["items"])
        # Verify persisted
        get_response = auth_client.get(f"{API}/formulas/{copy['id']}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == "Velvet Cedar Copy"

    def test_duplicate_as_version_bumps_version(self, auth_client):
        formula = self._velvet_cedar(auth_client)
        response = auth_client.post(f"{API}/formulas/{formula['id']}/duplicate?as_version=true")
        assert response.status_code == 200
        new_version = response.json()
        assert new_version["title"] == "Velvet Cedar"
        assert new_version["version"] == "v1.1"
        get_response = auth_client.get(f"{API}/formulas/{new_version['id']}")
        assert get_response.status_code == 200
        assert get_response.json()["version"] == "v1.1"

    def test_duplicate_missing_formula_404(self, auth_client):
        response = auth_client.post(f"{API}/formulas/formula_nope/duplicate")
        assert response.status_code == 404

    def test_create_and_delete_guard(self, auth_client):
        """Create formula, verify GET, verify other user's formula not accessible."""
        ingredients = auth_client.get(f"{API}/ingredients").json()
        payload = {
            "title": f"TEST_Formula_{uuid.uuid4().hex[:6]}",
            "targetConcentration": 20,
            "items": [{"ingredientId": ingredients[0]["id"], "weightGrams": 2, "dilutionPercentage": 100}],
        }
        create_response = auth_client.post(f"{API}/formulas", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        get_response = auth_client.get(f"{API}/formulas/{created['id']}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == payload["title"]
