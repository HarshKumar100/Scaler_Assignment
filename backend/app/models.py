import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


def generate_slug() -> str:
    """Generate a random 10-character hex string for the form slug."""
    return uuid.uuid4().hex[:10]


class Form(Base):
    """
    Represents a form consisting of multiple questions.
    """
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), default="Untitled form")
    slug = Column(String(32), unique=True, index=True, default=generate_slug)
    status = Column(String(16), default="draft")  # 'draft' or 'published'
    thank_you_message = Column(Text, default="Thanks for completing this form!")
    
    # Theme configuration
    theme = Column(JSON, default=lambda: {
        "primary_color": "#6547db",
        "background_color": "#fffaf2",
        "text_color": "#27272a",
        "font_family": "Inter"
    })
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions = relationship("Question", back_populates="form", cascade="all, delete-orphan", order_by="Question.position")
    responses = relationship("Response", back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    """
    Represents a single question in a form.
    """
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    title = Column(Text, default="Untitled question")
    description = Column(Text, default="")
    type = Column(String(32), default="short_text")  # short_text, long_text, multiple_choice, etc.
    required = Column(Boolean, default=False)
    position = Column(Integer)
    
    # Store options for multiple choice, dropdown, max rating, etc.
    settings = Column(JSON, default=dict)

    # Relationships
    form = relationship("Form", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('form_id', 'position', name='uq_question_form_position'),
    )


class Response(Base):
    """
    Represents a single submission/response to a form.
    """
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    completed = Column(Boolean, default=True)

    # Relationships
    form = relationship("Form", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    """
    Represents an answer to a specific question in a specific response.
    """
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    response_id = Column(Integer, ForeignKey("responses.id", ondelete="CASCADE"))
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"))
    value = Column(Text, default="")

    # Relationships
    response = relationship("Response", back_populates="answers")
    question = relationship("Question", back_populates="answers")

    __table_args__ = (
        UniqueConstraint('response_id', 'question_id', name='uq_answer_response_question'),
    )
