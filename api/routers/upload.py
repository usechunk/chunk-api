from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil
from pathlib import Path
import hashlib

from api.database import get_db
from api.models.modpack import Modpack, ModpackVersion, User
from api.routers.auth import get_current_active_user

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

UPLOAD_DIR.mkdir(exist_ok=True)

def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

@router.post("/modpack/{slug}")
async def upload_modpack_file(
    slug: str,
    version: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a modpack file (.zip or .mrpack) for a specific version.
    
    - **slug**: Modpack slug
    - **version**: Version string
    - **file**: Modpack file (.zip or .mrpack)
    """
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if modpack.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload files for this modpack")
    
    if not file.filename.endswith(('.zip', '.mrpack')):
        raise HTTPException(status_code=400, detail="Only .zip and .mrpack files are allowed")
    
    version_obj = db.query(ModpackVersion).filter(
        ModpackVersion.modpack_id == modpack.id,
        ModpackVersion.version == version
    ).first()
    
    if not version_obj:
        raise HTTPException(status_code=404, detail="Version not found")
    
    file_extension = Path(file.filename).suffix
    safe_filename = f"{slug}-{version}{file_extension}"
    file_path = UPLOAD_DIR / safe_filename
    
    try:
        with file_path.open("wb") as buffer:
            file_size = 0
            while chunk := await file.read(8192):
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    file_path.unlink()
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB"
                    )
                buffer.write(chunk)
        
        file_hash = calculate_file_hash(file_path)
        
        version_obj.download_url = f"/uploads/{safe_filename}"
        version_obj.file_size = file_size
        db.commit()
        
        return {
            "message": "File uploaded successfully",
            "filename": safe_filename,
            "size": file_size,
            "hash": file_hash,
            "download_url": version_obj.download_url
        }
        
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.delete("/modpack/{slug}/{version}")
async def delete_modpack_file(
    slug: str,
    version: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a modpack file"""
    modpack = db.query(Modpack).filter(Modpack.slug == slug).first()
    if not modpack:
        raise HTTPException(status_code=404, detail="Modpack not found")
    
    if modpack.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete files for this modpack")
    
    version_obj = db.query(ModpackVersion).filter(
        ModpackVersion.modpack_id == modpack.id,
        ModpackVersion.version == version
    ).first()
    
    if not version_obj or not version_obj.download_url:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = UPLOAD_DIR / version_obj.download_url.split("/")[-1]
    
    if file_path.exists():
        file_path.unlink()
    
    version_obj.download_url = None
    version_obj.file_size = None
    db.commit()
    
    return {"message": "File deleted successfully"}
