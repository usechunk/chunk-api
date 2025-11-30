from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    modpacks = relationship("Modpack", back_populates="author")

class Modpack(Base):
    __tablename__ = "modpacks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    mc_version = Column(String(20), nullable=False, index=True)
    loader = Column(String(20), nullable=False, index=True)
    loader_version = Column(String(50))
    recommended_ram_gb = Column(Integer, default=4)
    downloads = Column(Integer, default=0)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    author = relationship("User", back_populates="modpacks")
    versions = relationship("ModpackVersion", back_populates="modpack", cascade="all, delete-orphan")

class ModpackVersion(Base):
    __tablename__ = "modpack_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    modpack_id = Column(Integer, ForeignKey("modpacks.id"), nullable=False)
    version = Column(String(50), nullable=False)
    mc_version = Column(String(20), nullable=False)
    loader = Column(String(20), nullable=False)
    loader_version = Column(String(50))
    changelog = Column(Text)
    download_url = Column(String(512))
    file_size = Column(Integer)
    downloads = Column(Integer, default=0)
    is_stable = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    modpack = relationship("Modpack", back_populates="versions")
