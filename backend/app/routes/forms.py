import csv
from io import StringIO
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Form, Question, Response, Answer, generate_slug
from app.schemas import (
    FormCreate, FormUpdate, FormOut, QuestionCreate, QuestionUpdate,
    QuestionOut, ReorderRequest, PublishRequest, ResponseOut, FormStats, QuestionStat
)

router = APIRouter(prefix="/api/forms", tags=["Forms"])


def serialize_form(form: Form, db: Session = None) -> Dict[str, Any]:
    """Helper to serialize a Form ORM object into a dictionary for FormOut."""
    if db is not None:
        resp_count = db.query(Response).filter(Response.form_id == form.id).count()
    else:
        resp_count = len(form.responses)

    return {
        "id": form.id,
        "title": form.title,
        "slug": form.slug,
        "status": form.status,
        "thank_you_message": form.thank_you_message,
        "theme": form.theme,
        "questions": form.questions,
        "response_count": resp_count,
        "created_at": form.created_at,
        "updated_at": form.updated_at
    }


@router.get("", response_model=List[FormOut])
def list_forms(db: Session = Depends(get_db)):
    """List all forms, ordered by updated_at descending."""
    forms = db.query(Form).order_by(desc(Form.updated_at)).all()
    return [serialize_form(f, db) for f in forms]


@router.post("", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def create_form(form_in: FormCreate, db: Session = Depends(get_db)):
    """Create a new form."""
    form = Form(
        title=form_in.title,
        thank_you_message=form_in.thank_you_message or "Thanks for completing this form!"
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return serialize_form(form)


@router.get("/{form_id}", response_model=FormOut)
def get_form(form_id: int, db: Session = Depends(get_db)):
    """Get a single form by ID."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return serialize_form(form)


@router.patch("/{form_id}", response_model=FormOut)
def update_form(form_id: int, form_in: FormUpdate, db: Session = Depends(get_db)):
    """Update form metadata."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    if form_in.title is not None:
        form.title = form_in.title
    if form_in.thank_you_message is not None:
        form.thank_you_message = form_in.thank_you_message
    if form_in.theme is not None:
        form.theme = form_in.theme
    if form_in.status is not None:
        if form_in.status not in ("draft", "published"):
            raise HTTPException(status_code=400, detail="Invalid status. Must be 'draft' or 'published'")
        form.status = form_in.status
        
    db.commit()
    db.refresh(form)
    return serialize_form(form)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    """Delete a form and all its associated questions and responses."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    db.delete(form)
    db.commit()
    return None


@router.post("/{form_id}/duplicate", response_model=FormOut)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    """Duplicate an existing form, including all its questions."""
    original = db.query(Form).filter(Form.id == form_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Form not found")
        
    new_form = Form(
        title=f"{original.title} (copy)",
        slug=generate_slug(),
        status="draft",
        thank_you_message=original.thank_you_message,
        theme=original.theme
    )
    db.add(new_form)
    db.flush() # get new_form.id
    
    for q in original.questions:
        new_q = Question(
            form_id=new_form.id,
            title=q.title,
            description=q.description,
            type=q.type,
            required=q.required,
            position=q.position,
            settings=q.settings
        )
        db.add(new_q)
        
    db.commit()
    db.refresh(new_form)
    return serialize_form(new_form)


@router.post("/{form_id}/publish", response_model=FormOut)
def publish_form(form_id: int, req: PublishRequest, db: Session = Depends(get_db)):
    """Toggle the publish status of a form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    form.status = "published" if req.published else "draft"
    db.commit()
    db.refresh(form)
    return serialize_form(form)


@router.post("/{form_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def add_question(form_id: int, q_in: QuestionCreate, db: Session = Depends(get_db)):
    """Add a new question to the end of the form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    max_pos = 0
    if form.questions:
        max_pos = max([q.position for q in form.questions])
        
    question = Question(
        form_id=form_id,
        title=q_in.title,
        description=q_in.description,
        type=q_in.type,
        required=q_in.required,
        position=max_pos + 1,
        settings=q_in.settings
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.patch("/{form_id}/questions/{question_id}", response_model=QuestionOut)
def update_question(form_id: int, question_id: int, q_in: QuestionUpdate, db: Session = Depends(get_db)):
    """Update a specific question."""
    question = db.query(Question).filter(Question.id == question_id, Question.form_id == form_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    if q_in.title is not None:
        question.title = q_in.title
    if q_in.description is not None:
        question.description = q_in.description
    if q_in.type is not None:
        question.type = q_in.type
    if q_in.required is not None:
        question.required = q_in.required
    if q_in.settings is not None:
        question.settings = q_in.settings
        
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{form_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(form_id: int, question_id: int, db: Session = Depends(get_db)):
    """Delete a question and reorder remaining questions safely."""
    question = db.query(Question).filter(Question.id == question_id, Question.form_id == form_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    db.delete(question)
    db.flush()
    
    # Safely re-index remaining questions in ascending order without unique constraint collisions
    remaining = db.query(Question).filter(Question.form_id == form_id).order_by(Question.position.asc()).all()
    for idx, q in enumerate(remaining, start=1):
        q.position = idx
        
    db.commit()
    return None


@router.put("/{form_id}/questions/reorder")
def reorder_questions(form_id: int, req: ReorderRequest, db: Session = Depends(get_db)):
    """Reorder questions based on the provided list of IDs safely."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    questions = {q.id: q for q in form.questions}
    
    # Step 1: Set temporary negative positions to prevent unique constraint collisions
    for idx, q_id in enumerate(req.question_ids):
        if q_id in questions:
            questions[q_id].position = -(idx + 1000)
    db.flush()
    
    # Step 2: Assign final 1-based positions
    for pos, q_id in enumerate(req.question_ids):
        if q_id in questions:
            questions[q_id].position = pos + 1
            
    db.commit()
    return {"message": "Questions reordered successfully"}


@router.get("/{form_id}/responses", response_model=List[ResponseOut])
def get_responses(form_id: int, db: Session = Depends(get_db)):
    """Get all responses for a given form, ordered by most recent."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    responses = db.query(Response).filter(Response.form_id == form_id).order_by(desc(Response.submitted_at), desc(Response.id)).all()
    
    out = []
    for r in responses:
        answers_dict = {str(a.question_id): a.value for a in r.answers}
        out.append(ResponseOut(
            id=r.id,
            submitted_at=r.submitted_at,
            completed=r.completed,
            answers=answers_dict
        ))
    return out


@router.get("/{form_id}/responses/{response_id}", response_model=ResponseOut)
def get_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    """Get a single response detail."""
    response = db.query(Response).filter(Response.id == response_id, Response.form_id == form_id).first()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
        
    answers_dict = {str(a.question_id): a.value for a in response.answers}
    return ResponseOut(
        id=response.id,
        submitted_at=response.submitted_at,
        completed=response.completed,
        answers=answers_dict
    )


@router.get("/{form_id}/stats", response_model=FormStats)
def get_stats(form_id: int, db: Session = Depends(get_db)):
    """Get per-question statistics."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    responses = db.query(Response).filter(Response.form_id == form_id).all()
    total_responses = len(responses)
    if total_responses == 0:
        return FormStats(total_responses=0, completion_rate=0.0, questions=[])
        
    completed_responses = sum(1 for r in responses if r.completed)
    completion_rate = (completed_responses / total_responses) * 100 if total_responses > 0 else 0.0
    
    questions_stat = []
    for q in form.questions:
        q_answers = [a for a in q.answers if a.value]
        count = len(q_answers)
        
        counts_dict = None
        average = None
        
        if q.type in ['multiple_choice', 'dropdown', 'yes_no']:
            counts_dict = {}
            for a in q_answers:
                counts_dict[a.value] = counts_dict.get(a.value, 0) + 1
                
        elif q.type in ['number', 'rating']:
            valid_nums = []
            for a in q_answers:
                try:
                    valid_nums.append(float(a.value))
                except ValueError:
                    pass
            if valid_nums:
                average = sum(valid_nums) / len(valid_nums)
                
        questions_stat.append(QuestionStat(
            question_id=q.id,
            title=q.title,
            type=q.type,
            count=count,
            counts=counts_dict,
            average=average
        ))
        
    return FormStats(
        total_responses=total_responses,
        completion_rate=completion_rate,
        questions=questions_stat
    )


@router.get("/{form_id}/export-csv")
@router.get("/{form_id}/responses/export")
def export_responses(form_id: int, db: Session = Depends(get_db)):
    """Export all responses as a CSV file."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    # Get ordered questions for header
    questions = sorted(form.questions, key=lambda x: x.position)
    
    si = StringIO()
    cw = csv.writer(si)
    
    header = ["Response ID", "Submitted At", "Completed"] + [q.title for q in questions]
    cw.writerow(header)
    
    for r in form.responses:
        answers_by_q = {a.question_id: a.value for a in r.answers}
        submitted_at_val = ""
        if r.submitted_at:
            if hasattr(r.submitted_at, 'isoformat'):
                submitted_at_val = r.submitted_at.isoformat()
            else:
                submitted_at_val = str(r.submitted_at)
                
        row = [r.id, submitted_at_val, r.completed]
        for q in questions:
            row.append(answers_by_q.get(q.id, ""))
        cw.writerow(row)
        
    csv_content = si.getvalue()
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{form.slug}_responses.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
