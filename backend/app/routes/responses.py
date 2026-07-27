import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.models import Form, Response, Answer
from app.schemas import FormOut, SubmitResponse, ResponseOut
from app.routes.forms import serialize_form

router = APIRouter(prefix="/api/public", tags=["Public"])

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

@router.get("/forms/{slug}", response_model=FormOut)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    """Get public form by slug."""
    form = db.query(Form).filter(Form.slug == slug).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return serialize_form(form, db)

@router.post("/forms/{slug}/responses", response_model=ResponseOut, status_code=status.HTTP_201_CREATED)
def submit_response(slug: str, req: SubmitResponse, db: Session = Depends(get_db)):
    """Submit a response to a form."""
    form = db.query(Form).filter(Form.slug == slug).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    errors = {}
    parsed_answers = {}
    
    for q in form.questions:
        ans_val = req.answers.get(str(q.id), "")
        
        # Check required
        if q.required and not str(ans_val).strip():
            errors[str(q.id)] = "This question is required"
            continue
            
        if not ans_val:
            parsed_answers[q.id] = ""
            continue
            
        ans_str = str(ans_val).strip()
        
        # Email validation
        if q.type == "email":
            if not EMAIL_REGEX.match(ans_str):
                errors[str(q.id)] = "Invalid email format"
                
        # Number/rating validation
        elif q.type in ["number", "rating"]:
            try:
                float_val = float(ans_str)
            except ValueError:
                errors[str(q.id)] = "Must be a valid number"
                
        parsed_answers[q.id] = ans_str
        
    if errors:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)
        
    response = Response(form_id=form.id, completed=True)
    db.add(response)
    db.flush()
    
    for q_id, val in parsed_answers.items():
        ans = Answer(response_id=response.id, question_id=q_id, value=val)
        db.add(ans)
        
    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(response)
    
    return ResponseOut(
        id=response.id,
        submitted_at=response.submitted_at,
        completed=response.completed,
        answers=req.answers
    )
