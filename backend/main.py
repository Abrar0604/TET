import os
import json
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
from models import User, TestAttempt, QuestionResponse, UserServedQuestion
import auth
from auth import hash_password, verify_password, create_access_token, get_current_user_optional, get_current_user

# Create database tables fresh
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TET Mock Exam Platform API",
    description="Backend API for Subject-wise and Full-Length Mock Exams with Analytics, Persistent Sessions, and Resumable Timers",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter()

# In-memory question bank and active attempts cache
bank = {
    "questions": {},  # subject -> [question_dicts]
    "active_attempts": {}  # attempt_id -> full attempt data with answers
}

SUBJECTS = {
    "Math": "Mathematics",
    "Urdu": "Urdu",
    "Bio": "Biology",
    "PS": "Pedagogy of Science",
    "CDP": "Child Development and Pedagogy",
    "Eng": "English"
}

def load_data():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    for subject in SUBJECTS.keys():
        file_path = os.path.join(data_dir, f"{subject}.json")
        if subject == "Bio":
            file_path = os.path.join(data_dir, "2A_Biology.json")
        elif subject == "Math":
            file_path = os.path.join(data_dir, "2A Maths.json")
        elif subject == "PS":
            file_path = os.path.join(data_dir, "2A Physical Science.json")
        elif subject == "CDP":
            file_path = os.path.join(data_dir, "2A CDP.json")
        elif subject == "Eng":
            file_path = os.path.join(data_dir, "2A English.json")
        elif subject == "Urdu":
            file_path = os.path.join(data_dir, "urdu.json")
        
        try:
            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    bank["questions"][subject] = json.load(f)
            else:
                print(f"Warning: File not found: {file_path}")
                bank["questions"][subject] = []
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            bank["questions"][subject] = []

load_data()

# ----------------- QUESTION COVERAGE WITHOUT REPETITION -----------------

def sample_unseen_questions(
    db: Session,
    user: Optional[User],
    guest_id: Optional[str],
    subject: str,
    count: int,
    all_qs: list,
    attempt_id: str
) -> list:
    """
    Selects questions that have NOT yet been covered by the user.
    If the remaining unseen questions are fewer than count:
      1. Take all remaining unseen questions (guaranteeing 100% subject coverage).
      2. Reset the served history for this subject for this user (cycle complete).
      3. Sample the remaining needed questions from the fresh pool.
      4. Record the selected questions in user_served_questions.
    """
    if not all_qs:
        return []

    count = min(count, len(all_qs))

    # Query already served question IDs for this user or guest
    query = db.query(UserServedQuestion.question_id).filter(UserServedQuestion.subject == subject)
    if user:
        query = query.filter(UserServedQuestion.user_id == user.id)
    elif guest_id:
        query = query.filter(UserServedQuestion.guest_id == guest_id)
    else:
        # Fallback random if no identity at all
        return random.sample(all_qs, count)

    served_qids = set(row[0] for row in query.all())

    # Find unseen questions
    unseen_qs = [q for q in all_qs if q["question_id"] not in served_qids]

    selected_qs = []

    if len(unseen_qs) >= count:
        # We have enough unseen questions
        selected_qs = random.sample(unseen_qs, count)
    else:
        # Take all remaining unseen questions to complete the pool coverage
        selected_qs = list(unseen_qs)
        needed = count - len(selected_qs)

        # Reset served history for this subject for this user because all questions are now covered!
        del_query = db.query(UserServedQuestion).filter(UserServedQuestion.subject == subject)
        if user:
            del_query = del_query.filter(UserServedQuestion.user_id == user.id)
        else:
            del_query = del_query.filter(UserServedQuestion.guest_id == guest_id)
        del_query.delete(synchronize_session=False)
        db.commit()

        # From the freshly reset pool (excluding what we just took in this batch), sample the rest
        already_taken_ids = set(q["question_id"] for q in selected_qs)
        fresh_pool = [q for q in all_qs if q["question_id"] not in already_taken_ids]
        if fresh_pool:
            selected_qs.extend(random.sample(fresh_pool, min(needed, len(fresh_pool))))

    # Record the selected questions in user_served_questions
    for q in selected_qs:
        served_record = UserServedQuestion(
            user_id=user.id if user else None,
            guest_id=guest_id if not user else None,
            subject=subject,
            question_id=q["question_id"],
            attempt_id=attempt_id
        )
        db.add(served_record)
    db.commit()

    return selected_qs

def compute_remaining_seconds(attempt: TestAttempt) -> int:
    """
    Computes exact remaining seconds based on real-world wall clock.
    If is_paused is True (subject-wise only), time is frozen at paused_at.
    """
    total_allowed_sec = (attempt.duration_minutes or 60) * 60
    now = datetime.utcnow()
    
    if attempt.is_paused and attempt.paused_at:
        elapsed = (attempt.paused_at - attempt.started_at).total_seconds() - (attempt.total_paused_seconds or 0)
    else:
        elapsed = (now - attempt.started_at).total_seconds() - (attempt.total_paused_seconds or 0)

    remaining = total_allowed_sec - elapsed
    return max(0, int(remaining))

# ----------------- AUTH ENDPOINTS -----------------

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

@api.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    username = req.username.strip()
    email = req.email.strip().lower()
    
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    existing_user = db.query(User).filter(
        (func.lower(User.username) == username.lower()) | (func.lower(User.email) == email)
    ).first()
    if existing_user:
        if existing_user.username.lower() == username.lower():
            raise HTTPException(status_code=400, detail="Username is already taken. Try signing in or choosing another username.")
        else:
            raise HTTPException(status_code=400, detail="Email is already registered. Try signing in instead.")

    new_user = User(
        username=username,
        email=email,
        hashed_password=hash_password(req.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "username": new_user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email
        }
    }

@api.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    ident = req.username_or_email.strip().lower()
    user = db.query(User).filter(
        (func.lower(User.username) == ident) | (func.lower(User.email) == ident)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="No account found with this username or email. Please register first or check spelling."
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=401, 
            detail="Incorrect password. Please verify your password."
        )

    token = create_access_token({"sub": str(user.id), "username": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }

@api.get("/auth/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt_count = db.query(TestAttempt).filter(TestAttempt.user_id == current_user.id, TestAttempt.submitted_at.isnot(None)).count()
    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "total_tests": attempt_count
        }
    }

# ----------------- TEST FLOW ENDPOINTS -----------------

@api.get("/subjects")
def get_subjects():
    result = []
    for code, name in SUBJECTS.items():
        result.append({
            "code": code,
            "name": name,
            "total_questions": len(bank["questions"].get(code, []))
        })
    return result

class SubjectWiseRequest(BaseModel):
    subject: str
    question_count: int
    guest_id: Optional[str] = None

@api.post("/test/subject-wise/start")
def start_subject_wise_test(
    req: SubjectWiseRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if req.subject not in bank["questions"]:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    all_qs = bank["questions"][req.subject]
    if not all_qs:
        raise HTTPException(status_code=400, detail="No questions available for this subject")
        
    attempt_id = str(uuid.uuid4())
    subject_full_name = SUBJECTS.get(req.subject, req.subject)

    # Sample without repetition until all questions are covered
    selected_qs = sample_unseen_questions(
        db=db,
        user=current_user,
        guest_id=req.guest_id,
        subject=req.subject,
        count=req.question_count,
        all_qs=all_qs,
        attempt_id=attempt_id
    )

    actual_count = len(selected_qs)
    duration_minutes = int(actual_count * 1.2) + (1 if (actual_count * 1.2) % 1 > 0 else 0)
    now_dt = datetime.utcnow()

    # Store full questions in memory cache
    bank["active_attempts"][attempt_id] = {
        "id": attempt_id,
        "user_id": current_user.id if current_user else None,
        "guest_id": req.guest_id,
        "test_type": "subject_wise",
        "title": f"{subject_full_name} Practice ({actual_count} Questions)",
        "subject_name": req.subject,
        "subjects_included": [req.subject],
        "questions": {req.subject: selected_qs},
        "started_at": now_dt.isoformat(),
        "duration_minutes": duration_minutes,
        "is_paused": False
    }

    # Persist in SQLite
    db_attempt = TestAttempt(
        id=attempt_id,
        user_id=current_user.id if current_user else None,
        guest_id=req.guest_id,
        test_type="subject_wise",
        title=f"{subject_full_name} Practice",
        subject_name=req.subject,
        score=0,
        max_score=actual_count,
        duration_minutes=duration_minutes,
        subjects_included=json.dumps([req.subject]),
        subject_wise_score="{}",
        questions_data=json.dumps({req.subject: selected_qs}),
        current_answers="{}",
        marked_for_review="{}",
        is_paused=False,
        total_paused_seconds=0,
        created_at=now_dt,
        started_at=now_dt
    )
    db.add(db_attempt)
    db.commit()

    safe_qs = [
        {
            "question_id": q["question_id"],
            "question_text": q["question_text"],
            "options": q["options"]
        }
        for q in selected_qs
    ]

    return {
        "attempt_id": attempt_id,
        "title": f"{subject_full_name} Practice",
        "subject": req.subject,
        "test_type": "subject_wise",
        "subjects_included": [req.subject],
        "questions": {req.subject: safe_qs},
        "duration_minutes": duration_minutes,
        "remaining_seconds": duration_minutes * 60,
        "is_paused": False,
        "can_pause": True
    }

class FullLengthRequest(BaseModel):
    guest_id: Optional[str] = None

@api.post("/test/full-length/start")
def start_full_length_test(
    req: Optional[FullLengthRequest] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    counts = {
        "Urdu": 30, "CDP": 30, "Eng": 30,
        "Math": 20, "PS": 20, "Bio": 20
    }
    
    guest_id = req.guest_id if req else None
    attempt_id = str(uuid.uuid4())
    selected_qs = {}
    safe_qs = {}
    total_q_count = 0
    now_dt = datetime.utcnow()
    
    for subject, count in counts.items():
        all_qs = bank["questions"].get(subject, [])
        sampled = sample_unseen_questions(
            db=db,
            user=current_user,
            guest_id=guest_id,
            subject=subject,
            count=count,
            all_qs=all_qs,
            attempt_id=attempt_id
        )
        selected_qs[subject] = sampled
        total_q_count += len(sampled)
        safe_qs[subject] = [
            {"question_id": q["question_id"], "question_text": q["question_text"], "options": q["options"]} 
            for q in sampled
        ]
        
    duration_minutes = 150

    bank["active_attempts"][attempt_id] = {
        "id": attempt_id,
        "user_id": current_user.id if current_user else None,
        "guest_id": guest_id,
        "test_type": "full_length",
        "title": "Full Length Mock Exam (150 Questions)",
        "subject_name": "Full Length",
        "subjects_included": list(counts.keys()),
        "questions": selected_qs,
        "started_at": now_dt.isoformat(),
        "duration_minutes": duration_minutes,
        "is_paused": False
    }

    db_attempt = TestAttempt(
        id=attempt_id,
        user_id=current_user.id if current_user else None,
        guest_id=guest_id,
        test_type="full_length",
        title="Full Length Mock Exam",
        subject_name="Full Length",
        score=0,
        max_score=total_q_count,
        duration_minutes=duration_minutes,
        subjects_included=json.dumps(list(counts.keys())),
        subject_wise_score="{}",
        questions_data=json.dumps(selected_qs),
        current_answers="{}",
        marked_for_review="{}",
        is_paused=False,
        total_paused_seconds=0,
        created_at=now_dt,
        started_at=now_dt
    )
    db.add(db_attempt)
    db.commit()

    return {
        "attempt_id": attempt_id,
        "title": "Full Length Mock Exam",
        "test_type": "full_length",
        "subjects_included": list(counts.keys()),
        "questions": safe_qs,
        "duration_minutes": duration_minutes,
        "remaining_seconds": duration_minutes * 60,
        "is_paused": False,
        "can_pause": False  # Full-length timer never pauses!
    }

# ----------------- SESSION PERSISTENCE & TIMER CONTROLS -----------------

class AutosaveRequest(BaseModel):
    answers: Dict[str, Dict[str, Optional[int]]]
    marked_for_review: Optional[Dict[str, Dict[str, bool]]] = None

@api.post("/test/{attempt_id}/autosave")
def autosave_test_progress(
    attempt_id: str,
    req: AutosaveRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    db_attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")
        
    if db_attempt.submitted_at is not None:
        return {"status": "already_submitted"}

    db_attempt.current_answers = json.dumps(req.answers)
    if req.marked_for_review is not None:
        db_attempt.marked_for_review = json.dumps(req.marked_for_review)
    db.commit()

    remaining_sec = compute_remaining_seconds(db_attempt)
    return {
        "status": "saved",
        "remaining_seconds": remaining_sec,
        "is_paused": db_attempt.is_paused
    }

class PauseRequest(BaseModel):
    pause: bool

@api.post("/test/{attempt_id}/toggle-pause")
def toggle_test_pause(
    attempt_id: str,
    req: PauseRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    db_attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")

    if db_attempt.test_type != "subject_wise":
        raise HTTPException(status_code=400, detail="Timer cannot be paused in full-length mock exams.")

    if db_attempt.submitted_at is not None:
        raise HTTPException(status_code=400, detail="Test is already submitted.")

    now = datetime.utcnow()
    if req.pause and not db_attempt.is_paused:
        # Pause timer
        db_attempt.is_paused = True
        db_attempt.paused_at = now
    elif not req.pause and db_attempt.is_paused:
        # Resume timer
        if db_attempt.paused_at:
            paused_duration = int((now - db_attempt.paused_at).total_seconds())
            db_attempt.total_paused_seconds = (db_attempt.total_paused_seconds or 0) + paused_duration
        db_attempt.is_paused = False
        db_attempt.paused_at = None

    db.commit()

    remaining_sec = compute_remaining_seconds(db_attempt)
    return {
        "is_paused": db_attempt.is_paused,
        "remaining_seconds": remaining_sec
    }

@api.get("/attempts/active")
def get_active_attempt(
    current_user: Optional[User] = Depends(get_current_user_optional),
    guest_id: Optional[str] = Header(None, alias="X-Guest-ID"),
    db: Session = Depends(get_db)
):
    """
    Returns any in-progress test that is not yet submitted and has time remaining.
    """
    query = db.query(TestAttempt).filter(TestAttempt.submitted_at.is_(None))
    if current_user:
        query = query.filter(TestAttempt.user_id == current_user.id)
    elif guest_id:
        query = query.filter(TestAttempt.guest_id == guest_id)
    else:
        return {"has_active_test": False}

    active_attempt = query.order_by(TestAttempt.created_at.desc()).first()
    if not active_attempt:
        return {"has_active_test": False}

    remaining = compute_remaining_seconds(active_attempt)
    if remaining <= 0 and not active_attempt.is_paused:
        return {"has_active_test": False, "expired": True, "attempt_id": active_attempt.id}

    return {
        "has_active_test": True,
        "attempt_id": active_attempt.id,
        "title": active_attempt.title,
        "test_type": active_attempt.test_type,
        "subject_name": active_attempt.subject_name,
        "remaining_seconds": remaining,
        "duration_minutes": active_attempt.duration_minutes,
        "is_paused": active_attempt.is_paused,
        "can_pause": (active_attempt.test_type == "subject_wise")
    }

# ----------------- SUBMIT & REVIEW -----------------

class SubmitRequest(BaseModel):
    attempt_id: str
    answers: Dict[str, Dict[str, Optional[int]]]
    time_taken_seconds: Optional[int] = 0

@api.post("/test/submit")
def submit_test(
    req: SubmitRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    attempt_data = bank["active_attempts"].get(req.attempt_id)
    db_attempt = db.query(TestAttempt).filter(TestAttempt.id == req.attempt_id).first()

    if not db_attempt and not attempt_data:
        raise HTTPException(status_code=404, detail="Test attempt not found")
        
    if not attempt_data and db_attempt and db_attempt.questions_data:
        try:
            raw_qs = json.loads(db_attempt.questions_data)
            subjects_inc = json.loads(db_attempt.subjects_included or "[]")
            attempt_data = {
                "id": db_attempt.id,
                "user_id": db_attempt.user_id,
                "test_type": db_attempt.test_type,
                "title": db_attempt.title,
                "subject_name": db_attempt.subject_name,
                "subjects_included": subjects_inc,
                "questions": raw_qs,
                "started_at": db_attempt.started_at.isoformat() if db_attempt.started_at else datetime.utcnow().isoformat(),
                "duration_minutes": db_attempt.duration_minutes
            }
            bank["active_attempts"][req.attempt_id] = attempt_data
        except Exception as e:
            print(f"Error restoring questions data: {e}")

    if not attempt_data:
        raise HTTPException(status_code=400, detail="Test session data could not be retrieved.")

    # Calculate time taken if not supplied
    if not req.time_taken_seconds or req.time_taken_seconds <= 0:
        if db_attempt:
            total_allowed_sec = (db_attempt.duration_minutes or 60) * 60
            rem = compute_remaining_seconds(db_attempt)
            req.time_taken_seconds = max(0, total_allowed_sec - rem)

    total_correct = 0
    total_incorrect = 0
    total_unattempted = 0
    total_questions = 0
    subject_scores = {}
    analysis_questions = []

    if current_user and db_attempt:
        db_attempt.user_id = current_user.id

    for subject in attempt_data["subjects_included"]:
        sub_correct = 0
        sub_incorrect = 0
        sub_unattempted = 0
        sub_qs = attempt_data["questions"].get(subject, [])
        sub_total = len(sub_qs)
        
        for q in sub_qs:
            q_id = str(q["question_id"])
            user_ans = req.answers.get(subject, {}).get(q_id)
            correct_ans = q.get("answer")

            if user_ans is None or user_ans == 0:
                status_str = "unattempted"
                is_correct = False
                sub_unattempted += 1
            elif user_ans == correct_ans:
                status_str = "correct"
                is_correct = True
                sub_correct += 1
            else:
                status_str = "incorrect"
                is_correct = False
                sub_incorrect += 1

            analysis_item = {
                "question_id": q["question_id"],
                "subject": subject,
                "subject_name": SUBJECTS.get(subject, subject),
                "question_text": q.get("question_text", ""),
                "options": q.get("options", {}),
                "selected_option": user_ans if user_ans and user_ans != 0 else None,
                "correct_option": correct_ans,
                "is_correct": is_correct,
                "status": status_str
            }
            analysis_questions.append(analysis_item)

            db_response = QuestionResponse(
                attempt_id=req.attempt_id,
                question_id=q["question_id"],
                subject=subject,
                question_text=q.get("question_text", ""),
                options=json.dumps(q.get("options", {})),
                selected_option=user_ans if user_ans and user_ans != 0 else None,
                correct_option=correct_ans if correct_ans is not None else 1,
                is_correct=is_correct,
                status=status_str,
                time_spent_seconds=0
            )
            db.add(db_response)

        subject_scores[subject] = {
            "subject_name": SUBJECTS.get(subject, subject),
            "correct": sub_correct,
            "incorrect": sub_incorrect,
            "unattempted": sub_unattempted,
            "total": sub_total,
            "accuracy": round((sub_correct / (sub_correct + sub_incorrect)) * 100, 1) if (sub_correct + sub_incorrect) > 0 else 0.0
        }
        total_correct += sub_correct
        total_incorrect += sub_incorrect
        total_unattempted += sub_unattempted
        total_questions += sub_total

    accuracy = round((total_correct / (total_correct + total_incorrect)) * 100, 1) if (total_correct + total_incorrect) > 0 else 0.0
    now_dt = datetime.utcnow()

    if db_attempt:
        db_attempt.score = total_correct
        db_attempt.max_score = total_questions
        db_attempt.accuracy = accuracy
        db_attempt.correct_count = total_correct
        db_attempt.incorrect_count = total_incorrect
        db_attempt.unattempted_count = total_unattempted
        db_attempt.time_taken_seconds = req.time_taken_seconds or 0
        db_attempt.subject_wise_score = json.dumps(subject_scores)
        db_attempt.current_answers = json.dumps(req.answers)
        db_attempt.is_paused = False
        db_attempt.submitted_at = now_dt
        db.commit()

    attempt_data["submitted_at"] = now_dt.isoformat()
    attempt_data["score"] = total_correct
    attempt_data["max_score"] = total_questions
    attempt_data["accuracy"] = accuracy
    attempt_data["correct_count"] = total_correct
    attempt_data["incorrect_count"] = total_incorrect
    attempt_data["unattempted_count"] = total_unattempted
    attempt_data["time_taken_seconds"] = req.time_taken_seconds or 0
    attempt_data["subject_wise_score"] = subject_scores
    attempt_data["answers_given"] = req.answers
    attempt_data["analysis_questions"] = analysis_questions

    return {
        "attempt_id": req.attempt_id,
        "title": attempt_data.get("title", "Test"),
        "test_type": attempt_data.get("test_type", "subject_wise"),
        "score": total_correct,
        "max_score": total_questions,
        "accuracy": accuracy,
        "correct_count": total_correct,
        "incorrect_count": total_incorrect,
        "unattempted_count": total_unattempted,
        "time_taken_seconds": req.time_taken_seconds or 0,
        "submitted_at": now_dt.isoformat(),
        "subject_wise_score": subject_scores,
        "questions_analysis": analysis_questions
    }

# ----------------- ATTEMPTS HISTORY & REVIEW -----------------

@api.get("/attempts/history")
def get_attempts_history(
    current_user: Optional[User] = Depends(get_current_user_optional),
    guest_id: Optional[str] = Header(None, alias="X-Guest-ID"),
    db: Session = Depends(get_db)
):
    query = db.query(TestAttempt).filter(TestAttempt.submitted_at.isnot(None))
    if current_user:
        query = query.filter(TestAttempt.user_id == current_user.id)
    elif guest_id:
        query = query.filter(TestAttempt.guest_id == guest_id)
    
    attempts = query.order_by(TestAttempt.submitted_at.desc()).all()
    result = []
    for a in attempts:
        try:
            sub_scores = json.loads(a.subject_wise_score or "{}")
        except Exception:
            sub_scores = {}
        result.append({
            "id": a.id,
            "title": a.title,
            "test_type": a.test_type,
            "subject_name": a.subject_name,
            "score": a.score,
            "max_score": a.max_score,
            "accuracy": a.accuracy,
            "correct_count": a.correct_count,
            "incorrect_count": a.incorrect_count,
            "unattempted_count": a.unattempted_count,
            "time_taken_seconds": a.time_taken_seconds,
            "date": a.submitted_at.isoformat() if a.submitted_at else a.created_at.isoformat(),
            "subject_wise_score": sub_scores
        })
    return result

@api.get("/attempts/{attempt_id}/review")
def get_attempt_review(
    attempt_id: str,
    db: Session = Depends(get_db)
):
    db_attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    
    # Active unsubmitted test session
    is_active = (db_attempt and db_attempt.submitted_at is None) or (not db_attempt and attempt_id in bank["active_attempts"])
    
    if is_active:
        raw_qs = bank["active_attempts"].get(attempt_id, {}).get("questions")
        if not raw_qs and db_attempt and db_attempt.questions_data:
            try:
                raw_qs = json.loads(db_attempt.questions_data)
            except Exception:
                raw_qs = {}

        safe_qs = {}
        if raw_qs:
            for sub, qlist in raw_qs.items():
                safe_qs[sub] = [
                    {"question_id": q["question_id"], "question_text": q["question_text"], "options": q["options"]}
                    for q in qlist
                ]

        title = (db_attempt.title if db_attempt else None) or bank["active_attempts"].get(attempt_id, {}).get("title", "Test")
        test_type = (db_attempt.test_type if db_attempt else None) or bank["active_attempts"].get(attempt_id, {}).get("test_type", "subject_wise")
        duration_minutes = (db_attempt.duration_minutes if db_attempt else None) or bank["active_attempts"].get(attempt_id, {}).get("duration_minutes", 60)
        
        try:
            subjects_inc = json.loads(db_attempt.subjects_included) if (db_attempt and db_attempt.subjects_included) else list(safe_qs.keys())
        except Exception:
            subjects_inc = list(safe_qs.keys())

        # Load saved answers and marked review state
        try:
            current_ans = json.loads(db_attempt.current_answers) if (db_attempt and db_attempt.current_answers) else {}
        except Exception:
            current_ans = {}

        try:
            marked_rev = json.loads(db_attempt.marked_for_review) if (db_attempt and db_attempt.marked_for_review) else {}
        except Exception:
            marked_rev = {}

        remaining_sec = compute_remaining_seconds(db_attempt) if db_attempt else (duration_minutes * 60)
        is_paused = db_attempt.is_paused if db_attempt else False

        return {
            "attempt_id": attempt_id,
            "title": title,
            "test_type": test_type,
            "subject_name": db_attempt.subject_name if db_attempt else None,
            "subjects_included": subjects_inc,
            "questions": safe_qs,
            "duration_minutes": duration_minutes,
            "remaining_seconds": remaining_sec,
            "current_answers": current_ans,
            "marked_for_review": marked_rev,
            "is_paused": is_paused,
            "can_pause": (test_type == "subject_wise"),
            "submitted_at": None
        }

    if not db_attempt:
        raise HTTPException(status_code=404, detail="Test attempt not found")

    db_responses = db.query(QuestionResponse).filter(QuestionResponse.attempt_id == attempt_id).all()
    
    questions_analysis = []
    for r in db_responses:
        try:
            opts = json.loads(r.options)
        except Exception:
            opts = {}
        questions_analysis.append({
            "question_id": r.question_id,
            "subject": r.subject,
            "subject_name": SUBJECTS.get(r.subject, r.subject),
            "question_text": r.question_text,
            "options": opts,
            "selected_option": r.selected_option,
            "correct_option": r.correct_option,
            "is_correct": r.is_correct,
            "status": r.status
        })

    try:
        subjects_inc = json.loads(db_attempt.subjects_included or "[]")
    except Exception:
        subjects_inc = []

    try:
        subject_wise_score = json.loads(db_attempt.subject_wise_score or "{}")
    except Exception:
        subject_wise_score = {}

    return {
        "id": db_attempt.id,
        "title": db_attempt.title,
        "test_type": db_attempt.test_type,
        "subject_name": db_attempt.subject_name,
        "score": db_attempt.score,
        "max_score": db_attempt.max_score,
        "accuracy": db_attempt.accuracy,
        "correct_count": db_attempt.correct_count,
        "incorrect_count": db_attempt.incorrect_count,
        "unattempted_count": db_attempt.unattempted_count,
        "time_taken_seconds": db_attempt.time_taken_seconds,
        "duration_minutes": db_attempt.duration_minutes,
        "subjects_included": subjects_inc,
        "subject_wise_score": subject_wise_score,
        "submitted_at": db_attempt.submitted_at.isoformat() if db_attempt.submitted_at else None,
        "questions_analysis": questions_analysis
    }

# ----------------- RICH PROGRESS METRICS & DASHBOARD -----------------

@api.get("/dashboard/summary")
def get_dashboard_summary(
    current_user: Optional[User] = Depends(get_current_user_optional),
    guest_id: Optional[str] = Header(None, alias="X-Guest-ID"),
    db: Session = Depends(get_db)
):
    query = db.query(TestAttempt).filter(TestAttempt.submitted_at.isnot(None))
    if current_user:
        query = query.filter(TestAttempt.user_id == current_user.id)
    elif guest_id:
        query = query.filter(TestAttempt.guest_id == guest_id)
    
    attempts = query.order_by(TestAttempt.submitted_at.asc()).all()

    total_tests = len(attempts)
    if total_tests == 0:
        return {
            "total_tests_taken": 0,
            "overall_accuracy": 0.0,
            "total_questions_attempted": 0,
            "total_correct": 0,
            "total_time_seconds": 0,
            "average_time_per_question": 0,
            "subject_breakdown": {},
            "recent_attempts": [],
            "progress_trend": [],
            "strengths": [],
            "weaknesses": []
        }

    total_score = 0
    total_max = 0
    total_correct = 0
    total_incorrect = 0
    total_unattempted = 0
    total_time_seconds = 0

    subject_stats = {}
    for code, full_name in SUBJECTS.items():
        subject_stats[code] = {
            "code": code,
            "name": full_name,
            "total_questions": 0,
            "attempted": 0,
            "correct": 0,
            "incorrect": 0,
            "unattempted": 0,
            "accuracy": 0.0
        }

    progress_trend = []

    for a in attempts:
        total_score += (a.score or 0)
        total_max += (a.max_score or 0)
        total_correct += (a.correct_count or 0)
        total_incorrect += (a.incorrect_count or 0)
        total_unattempted += (a.unattempted_count or 0)
        total_time_seconds += (a.time_taken_seconds or 0)

        try:
            sub_scores = json.loads(a.subject_wise_score or "{}")
            for sub, stats in sub_scores.items():
                if sub in subject_stats:
                    c = stats.get("correct", 0)
                    inc = stats.get("incorrect", 0)
                    u = stats.get("unattempted", 0)
                    t = stats.get("total", 0)
                    subject_stats[sub]["total_questions"] += t
                    subject_stats[sub]["attempted"] += (c + inc)
                    subject_stats[sub]["correct"] += c
                    subject_stats[sub]["incorrect"] += inc
                    subject_stats[sub]["unattempted"] += u
        except Exception:
            pass

        date_str = a.submitted_at.strftime("%b %d, %H:%M") if a.submitted_at else "Recent"
        progress_trend.append({
            "id": a.id,
            "date": date_str,
            "title": a.title,
            "score": a.score,
            "max_score": a.max_score,
            "accuracy": a.accuracy
        })

    strengths = []
    weaknesses = []
    active_subjects = []

    for code, stats in subject_stats.items():
        if stats["attempted"] > 0:
            stats["accuracy"] = round((stats["correct"] / stats["attempted"]) * 100, 1)
            active_subjects.append(stats)
            if stats["accuracy"] >= 75:
                strengths.append(stats["name"])
            elif stats["accuracy"] < 60:
                weaknesses.append(stats["name"])
        else:
            stats["accuracy"] = 0.0

    total_attempted = total_correct + total_incorrect
    overall_accuracy = round((total_correct / total_attempted) * 100, 1) if total_attempted > 0 else 0.0
    avg_time_per_q = round(total_time_seconds / total_attempted, 1) if total_attempted > 0 else 0.0

    recent_attempts = []
    for a in reversed(attempts[-10:]):
        recent_attempts.append({
            "id": a.id,
            "title": a.title,
            "type": a.test_type,
            "subject": a.subject_name,
            "date": a.submitted_at.strftime("%b %d, %Y • %H:%M") if a.submitted_at else "",
            "score": a.score,
            "max_score": a.max_score,
            "accuracy": a.accuracy,
            "time_taken_seconds": a.time_taken_seconds
        })

    return {
        "total_tests_taken": total_tests,
        "overall_accuracy": overall_accuracy,
        "total_questions_attempted": total_attempted,
        "total_correct": total_correct,
        "total_incorrect": total_incorrect,
        "total_unattempted": total_unattempted,
        "total_time_seconds": total_time_seconds,
        "average_time_per_question": avg_time_per_q,
        "subject_breakdown": subject_stats,
        "recent_attempts": recent_attempts,
        "progress_trend": progress_trend,
        "strengths": strengths,
        "weaknesses": weaknesses
    }

# ----------------- DATABASE FRESH RESET ENDPOINT -----------------

@api.post("/admin/reset-database")
@api.get("/admin/reset-database")
def reset_database():
    """
    Cleans all data and rebuilds database fresh.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    bank["active_attempts"].clear()
    return {"status": "Database successfully reset and created fresh!"}

# Include routes under /api as well as root
app.include_router(api, prefix="/api")
app.include_router(api)

# ----------------- STATIC SPA SERVING -----------------

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "API route not found"})
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend bundle not found"})
