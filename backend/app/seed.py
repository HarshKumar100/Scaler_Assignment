import os
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import Form, Question, Response, Answer

def seed_db():
    """Insert seed data. Tables must already exist (created by main.py lifespan)."""
    print("Seeding database...")
    
    db: Session = SessionLocal()
    
    try:
        # Form 1
        form1 = Form(
            title='Customer Satisfaction Survey',
            slug='customer-sat',
            status='published'
        )
        db.add(form1)
        db.flush()
        
        q1_1 = Question(form_id=form1.id, title='What is your name?', type='short_text', required=True, position=1)
        q1_2 = Question(form_id=form1.id, title='What is your email address?', type='email', required=True, description='We will use this to follow up', position=2)
        q1_3 = Question(form_id=form1.id, title='How would you rate our service?', type='rating', required=True, position=3)
        q1_4 = Question(form_id=form1.id, title='Which department did you interact with?', type='multiple_choice', required=True, position=4, settings={'options': ['Sales', 'Support', 'Billing', 'Product']})
        q1_5 = Question(form_id=form1.id, title='Any additional feedback?', type='long_text', required=False, position=5)
        q1_6 = Question(form_id=form1.id, title='Would you recommend us to a friend?', type='yes_no', required=True, position=6)
        db.add_all([q1_1, q1_2, q1_3, q1_4, q1_5, q1_6])
        db.flush()

        # Responses for Form 1
        for i in range(5):
            r = Response(form_id=form1.id)
            db.add(r)
            db.flush()
            db.add_all([
                Answer(response_id=r.id, question_id=q1_1.id, value=f'User {i}'),
                Answer(response_id=r.id, question_id=q1_2.id, value=f'user{i}@example.com'),
                Answer(response_id=r.id, question_id=q1_3.id, value=str(3 + (i%3))),
                Answer(response_id=r.id, question_id=q1_4.id, value=['Sales', 'Support', 'Billing', 'Product'][i%4]),
                Answer(response_id=r.id, question_id=q1_5.id, value='Great service!' if i%2==0 else ''),
                Answer(response_id=r.id, question_id=q1_6.id, value='Yes' if i%2==0 else 'No')
            ])

        # Form 2
        form2 = Form(
            title='Event Registration',
            slug='event-2025',
            status='published'
        )
        db.add(form2)
        db.flush()

        q2_1 = Question(form_id=form2.id, title='Full Name', type='short_text', required=True, position=1)
        q2_2 = Question(form_id=form2.id, title='Email Address', type='email', required=True, position=2)
        q2_3 = Question(form_id=form2.id, title='How did you hear about this event?', type='dropdown', required=False, position=3, settings={'options': ['LinkedIn', 'Twitter', 'Friend', 'Newsletter', 'Other']})
        q2_4 = Question(form_id=form2.id, title='Which session interests you most?', type='multiple_choice', required=False, position=4, settings={'options': ['Keynote', 'Workshop A', 'Workshop B', 'Panel Discussion']})
        q2_5 = Question(form_id=form2.id, title='How many guests will you bring?', type='number', required=False, position=5)
        q2_6 = Question(form_id=form2.id, title='Do you have any dietary restrictions?', type='yes_no', required=True, position=6)
        q2_7 = Question(form_id=form2.id, title='Special accommodations needed?', type='long_text', required=False, position=7)
        db.add_all([q2_1, q2_2, q2_3, q2_4, q2_5, q2_6, q2_7])
        db.flush()

        for i in range(4):
            r = Response(form_id=form2.id)
            db.add(r)
            db.flush()
            db.add_all([
                Answer(response_id=r.id, question_id=q2_1.id, value=f'Attendee {i}'),
                Answer(response_id=r.id, question_id=q2_2.id, value=f'attendee{i}@test.com'),
                Answer(response_id=r.id, question_id=q2_3.id, value=['LinkedIn', 'Twitter', 'Friend', 'Newsletter'][i]),
                Answer(response_id=r.id, question_id=q2_4.id, value=['Keynote', 'Workshop A', 'Workshop B', 'Panel Discussion'][i]),
                Answer(response_id=r.id, question_id=q2_5.id, value=str(i%3)),
                Answer(response_id=r.id, question_id=q2_6.id, value='No'),
                Answer(response_id=r.id, question_id=q2_7.id, value='')
            ])

        # Form 3
        form3 = Form(
            title='Product Feedback',
            slug='product-feedback',
            status='draft'
        )
        db.add(form3)
        db.flush()

        q3_1 = Question(form_id=form3.id, title='Overall product satisfaction?', type='rating', required=True, position=1)
        q3_2 = Question(form_id=form3.id, title='Which feature do you use most?', type='multiple_choice', required=False, position=2, settings={'options': ['Dashboard', 'Reports', 'Integrations', 'API']})
        q3_3 = Question(form_id=form3.id, title='What feature would you like to see next?', type='long_text', required=False, position=3)
        q3_4 = Question(form_id=form3.id, title='Would you participate in a user interview?', type='yes_no', required=False, position=4)
        db.add_all([q3_1, q3_2, q3_3, q3_4])
        
        db.commit()
        print("Database seeded successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
