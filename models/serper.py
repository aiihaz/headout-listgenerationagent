from typing import Optional
from pydantic import BaseModel


class SerperOrganic(BaseModel):
    title: str
    snippet: str
    link: str


class SerperContext(BaseModel):
    skipped: bool = False
    reason: Optional[str] = None
    query: Optional[str] = None
    organic: list[SerperOrganic] = []
    paa: list[str] = []
    related_searches: list[str] = []
