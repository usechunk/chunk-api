from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.modpack import Modpack
from middleware.ratelimit import limiter

router = APIRouter(prefix="/search", tags=["search"])

class SearchResult(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    mc_version: str
    loader: str
    downloads: int
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[SearchResult])
@limiter.limit("30/minute")
def search_modpacks(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
    mc_version: Optional[str] = None,
    loader: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Search for modpacks by name or description.
    
    - **q**: Search query (searches in name and description)
    - **mc_version**: Filter by Minecraft version
    - **loader**: Filter by mod loader (forge, fabric, neoforge)
    - **skip**: Number of results to skip (pagination)
    - **limit**: Maximum number of results to return
    """
    query = db.query(Modpack).filter(Modpack.is_published == True)
    
    search_term = f"%{q.lower()}%"
    query = query.filter(
        (Modpack.name.ilike(search_term)) | 
        (Modpack.description.ilike(search_term))
    )
    
    if mc_version:
        query = query.filter(Modpack.mc_version == mc_version)
    
    if loader:
        query = query.filter(Modpack.loader == loader)
    
    query = query.order_by(Modpack.downloads.desc())
    
    modpacks = query.offset(skip).limit(limit).all()
    return modpacks
