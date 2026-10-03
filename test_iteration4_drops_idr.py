# Iteration 4 feature tests: dropWeightGrams (drops/tetes converter),
# IDR seed cost migration, dropWeightGrams validation, 3-decimal weight persistence.
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "studio@aromaform.app"
DEMO_PASSWORD = "AromaForm123!"

EXPECTED_DROP_WEIGHTS = {
    "Bergamot": 0.05,
    "Hedione": 0.05,
    "Iso E Super": 0.05,
    "Ambroxan": 0.045,
    "Cedarwood": 0.05,
}

EXPECTED_IDR_COSTS = {
    "Bergamot": 12500,
    "Hedione": 4200,
    "Iso E Super": 2800,
    "Ambroxan": 9800,
    "Cedarwood": 5600,
}


@pytest.fixture(scope="session")
def auth_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert response.status_code == 200, f"Login failed: {response.text}"
    session.headers.update({"Authorization": f"Bearer {response.json()['session_token']}"})
    return session


# ---------- dropWeightGrams schema & seed ----------

class TestDropWeightGrams:
    def test_all_seeded_ingredients_have_drop_weight(self, auth_client):
        response = auth_client.get(f"{API}/ingredients")
        assert response.status_code == 200
        by_name = {ing["name"]: ing for ing in response.json()}
        for name, expected in EXPECTED_DROP_WEIGHTS.items():
            assert name in by_name, f"Missing seeded ingredient {name}"
            assert "dropWeightGrams" in by_name[name], f"{name} missing dropWeightGrams"
            assert by_name[name]["dropWeightGrams"] == pytest.approx(expected), (
                f"{name} dropWeightGrams={by_name[name]['dropWeightGrams']} expected {expected}"
            )

    def test_ambroxan_custom_factor(self, auth_client):
        response = auth_client.get(f"{API}/ingredients?search=Ambroxan")
        assert response.status_code == 200
        assert response.json()[0]["dropWeightGrams"] == pytest.approx(0.045)

    def test_create_ingredient_with_custom_drop_weight(self, auth_client):
        payload = {
            "name": f"TEST_DropMat_{uuid.uuid4().hex[:6]}",
            "category": "Woody",
            "noteType": "Base",
            "costPerGram": 7500,
            "dropWeightGrams": 0.033,
        }
        create_response = auth_client.post(f"{API}/ingredients", json=payload)
        assert create_response.status_code == 200, create_response.text
        created = create_response.json()
        assert created["dropWeightGrams"] == pytest.approx(0.033)
        assert "_id" not in created
        # GET to verify persistence
        get_response = auth_client.get(f"{API}/ingredients?search={payload['name']}")
        assert get_response.status_code == 200
        match = [ing for ing in get_response.json() if ing["id"] == created["id"]]
        assert match and match[0]["dropWeightGrams"] == pytest.approx(0.033)

    def test_create_ingredient_default_drop_weight(self, auth_client):
        payload = {
            "name": f"TEST_DefaultDrop_{uuid.uuid4().hex[:6]}",
            "category": "Floral",
            "noteType": "Heart",
            "costPerGram": 1000,
        }
        response = auth_client.post(f"{API}/ingredients", json=payload)
        assert response.status_code == 200, response.text
        assert response.json()["dropWeightGrams"] == pytest.approx(0.05)

    def test_drop_weight_validation_zero_rejected(self, auth_client):
        response = auth_client.post(f"{API}/ingredients", json={
            "name": "TEST_BadDrop0", "category": "Woody", "noteType": "Base",
            "costPerGram": 100, "dropWeightGrams": 0,
        })
        assert response.status_code == 422

    def test_drop_weight_validation_too_large_rejected(self, auth_client):
        response = auth_client.post(f"{API}/ingredients", json={
            "name": "TEST_BadDropBig", "category": "Woody", "noteType": "Base",
            "costPerGram": 100, "dropWeightGrams": 1.5,
        })
        assert response.status_code == 422


# ---------- IDR cost migration ----------

class TestIdrCosts:
    def test_seeded_costs_are_idr_scale(self, auth_client):
        response = auth_client.get(f"{API}/ingredients")
        assert response.status_code == 200
        by_name = {ing["name"]: ing for ing in response.json()}
        for name, expected in EXPECTED_IDR_COSTS.items():
            actual = by_name[name]["costPerGram"]
            assert actual == pytest.approx(expected), f"{name} costPerGram={actual}, expected IDR {expected}"
            assert actual >= 100, f"{name} still at legacy USD-scale cost ({actual})"


# ---------- 3-decimal (milligram) weight precision ----------

class TestMilligramPrecision:
    def test_formula_item_accepts_3_decimal_weight(self, auth_client):
        formulas = auth_client.get(f"{API}/formulas").json()
        velvet = next((f for f in formulas if f["title"] == "Velvet Cedar" and f["version"] == "v1.0"), None)
        assert velvet, "Seeded Velvet Cedar v1.0 not found"
        items = [dict(item) for item in velvet["items"]]
        items[0]["weightGrams"] = 1.375
        payload = {
            "title": velvet["title"],
            "version": velvet["version"],
            "targetConcentration": velvet["targetConcentration"],
            "items": items,
            "notes": velvet.get("notes"),
        }
        put_response = auth_client.put(f"{API}/formulas/{velvet['id']}", json=payload)
        assert put_response.status_code == 200, put_response.text
        # GET to verify 3-decimal weight persisted exactly
        get_response = auth_client.get(f"{API}/formulas/{velvet['id']}")
        assert get_response.status_code == 200
        saved = get_response.json()["items"][0]["weightGrams"]
        assert saved == pytest.approx(1.375), f"weightGrams={saved}, expected 1.375"
        # Restore original seeded weight (1 g) so UI tests see pristine data
        items[0]["weightGrams"] = 1
        payload["items"] = items
        restore = auth_client.put(f"{API}/formulas/{velvet['id']}", json=payload)
        assert restore.status_code == 200
        assert auth_client.get(f"{API}/formulas/{velvet['id']}").json()["items"][0]["weightGrams"] == 1
