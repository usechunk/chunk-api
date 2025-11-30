import pytest
from fastapi import status


def test_create_modpack(client, auth_headers):
    """Test creating a new modpack"""
    response = client.post(
        "/modpacks/",
        json={
            "name": "My New Modpack",
            "description": "A great modpack",
            "mc_version": "1.20.1",
            "loader": "forge",
            "loader_version": "47.2.0",
            "recommended_ram_gb": 8
        },
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "My New Modpack"
    assert data["slug"] == "my-new-modpack"
    assert data["mc_version"] == "1.20.1"
    assert data["loader"] == "forge"
    assert data["downloads"] == 0
    assert data["is_published"] is False


def test_create_modpack_duplicate_name(client, auth_headers, test_modpack):
    """Test creating modpack with duplicate name"""
    response = client.post(
        "/modpacks/",
        json={
            "name": "Test Modpack",
            "mc_version": "1.20.1",
            "loader": "forge"
        },
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_create_modpack_unauthorized(client):
    """Test creating modpack without authentication"""
    response = client.post(
        "/modpacks/",
        json={
            "name": "My New Modpack",
            "mc_version": "1.20.1",
            "loader": "forge"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_modpacks(client, test_modpack):
    """Test listing modpacks"""
    response = client.get("/modpacks/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["name"] == "Test Modpack"


def test_list_modpacks_with_filters(client, test_modpack):
    """Test listing modpacks with filters"""
    response = client.get("/modpacks/?mc_version=1.20.1&loader=forge")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    for modpack in data:
        assert modpack["mc_version"] == "1.20.1"
        assert modpack["loader"] == "forge"


def test_list_modpacks_pagination(client, test_modpack):
    """Test modpack pagination"""
    response = client.get("/modpacks/?skip=0&limit=10")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) <= 10


def test_get_modpack(client, test_modpack):
    """Test getting a specific modpack"""
    response = client.get(f"/modpacks/{test_modpack.slug}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == test_modpack.name
    assert data["slug"] == test_modpack.slug
    assert data["downloads"] == 1


def test_get_modpack_not_found(client):
    """Test getting non-existent modpack"""
    response = client.get("/modpacks/nonexistent-modpack")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_modpack(client, auth_headers, test_modpack):
    """Test updating a modpack"""
    response = client.put(
        f"/modpacks/{test_modpack.slug}",
        json={
            "description": "Updated description",
            "recommended_ram_gb": 16
        },
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["description"] == "Updated description"
    assert data["recommended_ram_gb"] == 16


def test_update_modpack_unauthorized(client, test_modpack):
    """Test updating modpack without authentication"""
    response = client.put(
        f"/modpacks/{test_modpack.slug}",
        json={"description": "Updated description"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_modpack_not_owner(client, db, test_modpack):
    """Test updating modpack by non-owner"""
    from models.modpack import User
    from routers.auth import get_password_hash
    
    other_user = User(
        username="otheruser",
        email="other@example.com",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(other_user)
    db.commit()
    
    login_response = client.post(
        "/auth/token",
        data={"username": "otheruser", "password": "password123"}
    )
    token = login_response.json()["access_token"]
    
    response = client.put(
        f"/modpacks/{test_modpack.slug}",
        json={"description": "Updated description"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_modpack(client, auth_headers, test_modpack):
    """Test deleting a modpack"""
    response = client.delete(
        f"/modpacks/{test_modpack.slug}",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    get_response = client.get(f"/modpacks/{test_modpack.slug}")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_modpack_unauthorized(client, test_modpack):
    """Test deleting modpack without authentication"""
    response = client.delete(f"/modpacks/{test_modpack.slug}")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_slug_generation():
    """Test slug generation from modpack name"""
    from routers.modpacks import generate_slug
    
    assert generate_slug("My Awesome Modpack") == "my-awesome-modpack"
    assert generate_slug("All The Mods 9") == "all-the-mods-9"
    assert generate_slug("Test!!!Modpack???") == "testmodpack"
