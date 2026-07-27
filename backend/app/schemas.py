from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# --- Request Schemas ---

class FormCreate(BaseModel):
    title: str = Field(default="Untitled form")
    thank_you_message: Optional[str] = None


class FormUpdate(BaseModel):
    title: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class QuestionCreate(BaseModel):
    title: str
    description: str = Field(default="")
    type: str = Field(default="short_text")
    required: bool = Field(default=False)
    settings: Dict[str, Any] = Field(default_factory=dict)


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class ReorderRequest(BaseModel):
    question_ids: List[int]


class PublishRequest(BaseModel):
    published: bool


class SubmitResponse(BaseModel):
    answers: Dict[str, str]


# --- Response Schemas ---

class QuestionOut(BaseModel):
    id: int
    title: str
    description: str
    type: str
    required: bool
    position: int
    settings: Dict[str, Any]

    class Config:
        orm_mode = True
        from_attributes = True


class FormOut(BaseModel):
    id: int
    title: str
    slug: str
    status: str
    thank_you_message: str
    theme: Dict[str, Any]
    questions: List[QuestionOut]
    response_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True


class ResponseOut(BaseModel):
    id: int
    submitted_at: datetime
    completed: bool
    answers: Dict[str, str]

    class Config:
        orm_mode = True
        from_attributes = True


class QuestionStat(BaseModel):
    question_id: int
    title: str
    type: str
    count: int
    counts: Optional[Dict[str, int]] = None
    average: Optional[float] = None


class FormStats(BaseModel):
    total_responses: int
    completion_rate: float
    questions: List[QuestionStat]
