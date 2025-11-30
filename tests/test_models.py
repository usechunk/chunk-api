import pytest
from datetime import datetime


def test_user_model(db):
    """Test User model"""
    from models.modpack import User
    from routers.auth import get_password_hash
    
    user = User(
        username="modeluser",
        email="model@example.com",
        hashed_password=get_password_hash("password123"),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    assert user.id is not None
    assert user.username == "modeluser"
    assert user.email == "model@example.com"
    assert user.is_active is True
    assert user.created_at is not None
    assert isinstance(user.created_at, datetime)


def test_modpack_model(db, test_user):
    """Test Modpack model"""
    from models.modpack import Modpack
    
    modpack = Modpack(
        name="Model Test Pack",
        slug="model-test-pack",
        description="Testing the model",
        mc_version="1.20.1",
        loader="forge",
        loader_version="47.2.0",
        recommended_ram_gb=8,
        author_id=test_user.id,
        is_published=True
    )
    db.add(modpack)
    db.commit()
    db.refresh(modpack)
    
    assert modpack.id is not None
    assert modpack.name == "Model Test Pack"
    assert modpack.slug == "model-test-pack"
    assert modpack.downloads == 0
    assert modpack.is_published is True
    assert modpack.author_id == test_user.id
    assert modpack.created_at is not None


def test_modpack_version_model(db, test_modpack):
    """Test ModpackVersion model"""
    from models.modpack import ModpackVersion
    
    version = ModpackVersion(
        modpack_id=test_modpack.id,
        version="1.0.0",
        mc_version="1.20.1",
        loader="forge",
        loader_version="47.2.0",
        changelog="Initial release",
        download_url="https://example.com/download",
        file_size=1024000,
        is_stable=True
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    
    assert version.id is not None
    assert version.modpack_id == test_modpack.id
    assert version.version == "1.0.0"
    assert version.is_stable is True
    assert version.downloads == 0


def test_user_modpack_relationship(db, test_user):
    """Test relationship between User and Modpack"""
    from models.modpack import Modpack
    
    modpack1 = Modpack(
        name="Pack 1",
        slug="pack-1",
        mc_version="1.20.1",
        loader="forge",
        author_id=test_user.id
    )
    modpack2 = Modpack(
        name="Pack 2",
        slug="pack-2",
        mc_version="1.20.1",
        loader="fabric",
        author_id=test_user.id
    )
    
    db.add(modpack1)
    db.add(modpack2)
    db.commit()
    db.refresh(test_user)
    
    assert len(test_user.modpacks) == 2
    assert test_user.modpacks[0].name in ["Pack 1", "Pack 2"]


def test_modpack_version_relationship(db, test_modpack):
    """Test relationship between Modpack and ModpackVersion"""
    from models.modpack import ModpackVersion
    
    version1 = ModpackVersion(
        modpack_id=test_modpack.id,
        version="1.0.0",
        mc_version="1.20.1",
        loader="forge"
    )
    version2 = ModpackVersion(
        modpack_id=test_modpack.id,
        version="1.1.0",
        mc_version="1.20.1",
        loader="forge"
    )
    
    db.add(version1)
    db.add(version2)
    db.commit()
    db.refresh(test_modpack)
    
    assert len(test_modpack.versions) == 2
    versions = [v.version for v in test_modpack.versions]
    assert "1.0.0" in versions
    assert "1.1.0" in versions
