from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel

from database import get_db
from models.modpack import Modpack, ModpackVersion, User

router = APIRouter(prefix="/projects", tags=["projects"])


class AuthorInfo(BaseModel):
    """Author information for project pages."""
    id: int
    username: str

    class Config:
        from_attributes = True


class VersionInfo(BaseModel):
    """Version information for project pages."""
    id: int
    version: str
    mc_version: str
    loader: str
    loader_version: Optional[str]
    changelog: Optional[str]
    download_url: Optional[str]
    file_size: Optional[int]
    downloads: int
    is_stable: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class DownloadStats(BaseModel):
    """Download statistics for project pages."""
    total_downloads: int
    version_downloads: int


class ProjectDetail(BaseModel):
    """Detailed project information for dedicated project pages."""
    id: int
    name: str
    slug: str
    description: Optional[str]
    mc_version: str
    loader: str
    loader_version: Optional[str]
    recommended_ram_gb: int
    downloads: int
    is_published: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    author: AuthorInfo
    versions: List[VersionInfo]
    download_stats: DownloadStats

    class Config:
        from_attributes = True


@router.get("/{slug}", response_model=ProjectDetail)
def get_project_detail(slug: str, db: Session = Depends(get_db)):
    """
    Get detailed project information for a mod/modpack project page.

    Returns comprehensive metadata including:
    - Project metadata (name, description, Minecraft version, loader, etc.)
    - Author information
    - Complete version history
    - Download statistics (total and per-version aggregated)

    **Consumed by:** chunk-app frontend for project detail pages.
    """
    modpack = (
        db.query(Modpack)
        .options(
            joinedload(Modpack.author),
            joinedload(Modpack.versions)
        )
        .filter(Modpack.slug == slug)
        .first()
    )

    if not modpack:
        raise HTTPException(status_code=404, detail="Project not found")

    if not modpack.is_published:
        raise HTTPException(status_code=404, detail="Project not found")

    # Calculate version downloads
    version_downloads = sum(v.downloads for v in modpack.versions)

    # Sort versions by created_at descending (newest first), then by id descending as tiebreaker
    sorted_versions = sorted(
        modpack.versions,
        key=lambda v: (v.created_at if v.created_at else datetime.min, v.id),
        reverse=True
    )

    return ProjectDetail(
        id=modpack.id,
        name=modpack.name,
        slug=modpack.slug,
        description=modpack.description,
        mc_version=modpack.mc_version,
        loader=modpack.loader,
        loader_version=modpack.loader_version,
        recommended_ram_gb=modpack.recommended_ram_gb,
        downloads=modpack.downloads,
        is_published=modpack.is_published,
        created_at=modpack.created_at,
        updated_at=modpack.updated_at,
        author=AuthorInfo(
            id=modpack.author.id,
            username=modpack.author.username
        ),
        versions=[
            VersionInfo(
                id=v.id,
                version=v.version,
                mc_version=v.mc_version,
                loader=v.loader,
                loader_version=v.loader_version,
                changelog=v.changelog,
                download_url=v.download_url,
                file_size=v.file_size,
                downloads=v.downloads,
                is_stable=v.is_stable,
                created_at=v.created_at
            )
            for v in sorted_versions
        ],
        download_stats=DownloadStats(
            total_downloads=modpack.downloads,
            version_downloads=version_downloads
        )
    )
