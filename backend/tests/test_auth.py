import auth


def test_login_with_correct_credentials_returns_token(anon_client):
    res = anon_client.post(
        "/api/auth/login", json={"username": auth.DEMO_USERNAME, "password": "olist2018"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


def test_login_with_wrong_password_returns_401(anon_client):
    res = anon_client.post(
        "/api/auth/login", json={"username": auth.DEMO_USERNAME, "password": "wrong"}
    )
    assert res.status_code == 401


def test_login_with_unknown_username_returns_401(anon_client):
    res = anon_client.post("/api/auth/login", json={"username": "nobody", "password": "olist2018"})
    assert res.status_code == 401


def test_protected_endpoint_without_token_returns_401(anon_client):
    res = anon_client.get("/api/kpis")
    assert res.status_code == 401


def test_protected_endpoint_with_garbage_token_returns_401(anon_client):
    res = anon_client.get("/api/kpis", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401


def test_health_does_not_require_auth(anon_client):
    res = anon_client.get("/api/health")
    assert res.status_code == 200


def test_me_returns_the_authenticated_username(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["username"] == auth.DEMO_USERNAME


def test_authenticated_client_can_reach_protected_endpoint(client):
    res = client.get("/api/kpis")
    assert res.status_code == 200
