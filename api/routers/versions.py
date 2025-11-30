from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.database import get_db
from api.models.modpack import Modpack, ModpackVersion, User
from api.routers.auth import get_current_active_user

router = APIRouter(prefix="/modpacks/{slug}/versions", tags=["versions"])

class VersionCreate(BaseModel):
    version: str
    mc_version: str
    loader: str
    loader_version: Optional[str] = None
    changelog: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    is_stable: bool = True

class VersionResponse(BaseModel):
    id: int
    modpack_id: int
    version: str
    mc_version: str
    loader: str
    loader_version: Optional[str]
    changelog: Optional[str]
    download_url: Optional[str]
    file_size: Optional[int]
    downloads: int
    is_stable: bool
    
    class Config:
        from_attributes = True

@router.post("/", response_model=VersionResponse, status_code=status.HTTP_201_CREATED)
def create_version(
    slug: str,
    version: VersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if modpack.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create versions for this modpack")
    
    existing = db.query(ModpackVersion).filter(
        ModpackVersion.modpack_id == modpack.id,
        ModpackVersion.version == version.version
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Version already exists")
    
    db_version = ModpackVersion(
        modpack_id=modpack.id,
        version=version.version,
        mc_version=version.mc_version,
        loader=version.loader,
        loader_version=version.loader_version,
        changelog=version.changelog,
        download_url=version.download_url,
        file_size=version.file_size,
        is_stable=version.is_stable
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_version)
    return db_version

@router.get("/", response_model=List[VersionResponse])
def list_versions(
    slug: str,
    stable_only: bool = False,
    db: Session = Depends(get_db)
):
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if not modpack.is_published:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    query = db.query(ModpackVersion).filter(ModpackVersion.modpack_id == modpack.id)
    
    if stable_only:
        query = query.filter(ModpackVersion.is_stable == True)
    
    versions = query.order_by(ModpackVersion.created_at.desc()).all()
    return versions

@router.get("/{version}", response_model=VersionResponse)
def get_version(
    slug: str,
    version: str,
    db: Session = Depends(get_db)
):
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if not modpack.is_published:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    db_version = db.query(ModpackVersion).filter(
        ModpackVersion.modpack_id == modpack.id,
        ModpackVersion.version == version
    ).first()
    
    if not db_version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    db_version.downloads += 1
    db.commit()
    
    return db_version

@router.get("/latest", response_model=VersionResponse)
def get_latest_version(
    slug: str,
    stable_only: bool = True,
    db: Session = Depends(get_db)
):
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if not modpack.is_published:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    query = db.query(ModpackVersion).filter(ModpackVersion.modpack_id == modpack.id)
    
    if stable_only:
        query = query.filter(ModpackVersion.is_stable == True)
    
    latest = query.order_by(ModpackVersion.created_at.desc()).first()
    
    if not latest:
        raise HTTPException(status_code=404, detail="No versions found")
    
    return latest
