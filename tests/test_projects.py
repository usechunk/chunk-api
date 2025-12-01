import pytest
from datetime import datetime
from fastapi import status

from models.modpack import ModpackVersion


def test_get_project_detail(client, test_modpack, db):
    """Test getting detailed project information."""
    # Add a version to the modpack
    version = ModpackVersion(
        modpack_id=test_modpack.id,
        version="1.0.0",
        mc_version="1.20.1",
        loader="forge",
        loader_version="47.2.0",
        changelog="Initial release",
        downloads=100,
        is_stable=True
    )
    db.add(version)
    db.commit()

    response = client.get(f"/projects/{test_modpack.slug}")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["name"] == test_modpack.name
    assert data["slug"] == test_modpack.slug
    assert data["description"] == test_modpack.description
    assert data["mc_version"] == test_modpack.mc_version
    assert data["loader"] == test_modpack.loader
    assert data["recommended_ram_gb"] == test_modpack.recommended_ram_gb
    assert data["is_published"] is True


def test_get_project_detail_includes_author(client, test_modpack, test_user):
    """Test that project detail includes author information."""
    response = client.get(f"/projects/{test_modpack.slug}")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "author" in data
    assert data["author"]["id"] == test_user.id
    assert data["author"]["username"] == test_user.username


def test_get_project_detail_includes_versions(client, test_modpack, db):
    """Test that project detail includes version history."""
    # Add multiple versions
    versions_data = [
        {"version": "1.0.0", "changelog": "Initial release", "is_stable": True, "downloads": 50},
        {"version": "1.1.0", "changelog": "Bug fixes", "is_stable": True, "downloads": 30},
        {"version": "1.2.0-beta", "changelog": "New features", "is_stable": False, "downloads": 10},
    ]

    for v_data in versions_data:
        version = ModpackVersion(
            modpack_id=test_modpack.id,
            mc_version="1.20.1",
            loader="forge",
            **v_data
        )
        db.add(version)
    db.commit()

    response = client.get(f"/projects/{test_modpack.slug}")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "versions" in data
    assert len(data["versions"]) == 3

    # Check version info is complete
    for v in data["versions"]:
        assert "id" in v
        assert "version" in v
        assert "mc_version" in v
        assert "loader" in v
        assert "changelog" in v
        assert "downloads" in v
        assert "is_stable" in v


def test_get_project_detail_includes_download_stats(client, test_modpack, db):
    """Test that project detail includes download statistics."""
    # Add versions with downloads
    version1 = ModpackVersion(
        modpack_id=test_modpack.id,
        version="1.0.0",
        mc_version="1.20.1",
        loader="forge",
        downloads=100,
        is_stable=True
    )
    version2 = ModpackVersion(
        modpack_id=test_modpack.id,
        version="1.1.0",
        mc_version="1.20.1",
        loader="forge",
        downloads=50,
        is_stable=True
    )
    db.add(version1)
    db.add(version2)
    db.commit()

    response = client.get(f"/projects/{test_modpack.slug}")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "download_stats" in data
    assert data["download_stats"]["total_downloads"] == test_modpack.downloads
    assert data["download_stats"]["version_downloads"] == 150  # 100 + 50


def test_get_project_detail_not_found(client):
    """Test getting non-existent project."""
    response = client.get("/projects/nonexistent-project")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Project not found"


def test_get_project_detail_unpublished(client, db, test_user):
    """Test that unpublished projects return 404."""
    from models.modpack import Modpack

    unpublished_modpack = Modpack(
        name="Unpublished Modpack",
        slug="unpublished-modpack",
        description="A hidden modpack",
        mc_version="1.20.1",
        loader="forge",
        author_id=test_user.id,
        is_published=False
    )
    db.add(unpublished_modpack)
    db.commit()

    response = client.get("/projects/unpublished-modpack")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_project_detail_versions_sorted(client, test_modpack, db):
    """Test that versions are sorted by created_at descending."""
    # Add versions - they will be sorted by created_at (newest first)
    # Since created_at uses server_default, we need to add them sequentially
    # The second version added will have a later created_at

    version_old = ModpackVersion(
        modpack_id=test_modpack.id,
        version="1.0.0",
        mc_version="1.20.1",
        loader="forge",
        is_stable=True
    )
    db.add(version_old)
    db.commit()
    db.refresh(version_old)
    old_id = version_old.id

    version_new = ModpackVersion(
        modpack_id=test_modpack.id,
        version="2.0.0",
        mc_version="1.20.1",
        loader="forge",
        is_stable=True
    )
    db.add(version_new)
    db.commit()
    db.refresh(version_new)
    new_id = version_new.id

    response = client.get(f"/projects/{test_modpack.slug}")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    versions = data["versions"]
    assert len(versions) == 2
    # Newest (higher id) should be first since created_at is same
    assert versions[0]["id"] == new_id
    assert versions[1]["id"] == old_id
