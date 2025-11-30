from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.modpack import Modpack, User
from routers.auth import get_current_active_user

router = APIRouter(prefix="/modpacks", tags=["modpacks"])

class ModpackCreate(BaseModel):
    name: str
    description: Optional[str] = None
    mc_version: str
    loader: str
    loader_version: Optional[str] = None
    recommended_ram_gb: int = 4

class ModpackUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mc_version: Optional[str] = None
    loader: Optional[str] = None
    loader_version: Optional[str] = None
    recommended_ram_gb: Optional[int] = None
    is_published: Optional[bool] = None

class ModpackResponse(BaseModel):
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
    author_id: int
    
    class Config:
        from_attributes = True

def generate_slug(name: str) -> str:
    slug = name.lower()
    slug = slug.replace(" ", "-")
    allowed_chars = "abcdefghijklmnopqrstuvwxyz0123456789-"
    slug = "".join(c for c in slug if c in allowed_chars)
    return slug

@router.post("/", response_model=ModpackResponse, status_code=status.HTTP_201_CREATED)
def create_modpack(
    modpack: ModpackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    slug = generate_slug(modpack.name)
    
    existing = db.query(Modpack).filter(Modpack.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Modpack with this name already exists")
    
    db_modpack = Modpack(
        name=modpack.name,
        slug=slug,
        description=modpack.description,
        mc_version=modpack.mc_version,
        loader=modpack.loader,
        loader_version=modpack.loader_version,
        recommended_ram_gb=modpack.recommended_ram_gb,
        author_id=current_user.id
    )
    db.add(db_modpack)
    db.commit()
    db.refresh(db_modpack)
    return db_modpack

@router.get("/", response_model=List[ModpackResponse])
def list_modpacks(
    skip: int = 0,
    limit: int = 20,
    mc_version: Optional[str] = None,
    loader: Optional[str] = None,
    published_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Modpack)
    
    if published_only:
        query = query.filter(Modpack.is_published == True)
    
    if mc_version:
        query = query.filter(Modpack.mc_version == mc_version)
    
    if loader:
        query = query.filter(Modpack.loader == loader)
    
    modpacks = query.offset(skip).limit(limit).all()
    return modpacks

@router.get("/{slug}", response_model=ModpackResponse)
def get_modpack(slug: str, db: Session = Depends(get_db)):
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if not modpack.is_published:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    modpack.downloads += 1
    db.commit()
    
    return modpack

@router.put("/{slug}", response_model=ModpackResponse)
def update_modpack(
    slug: str,
    modpack_update: ModpackUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if modpack.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this modpack")
    
    update_data = modpack_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(modpack, field, value)
    
    db.commit()
    db.refresh(modpack)
    return modpack

@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_modpack(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if modpack.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this modpack")
    
    db.delete(modpack)
    db.commit()
    return None
