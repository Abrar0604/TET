from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    attempts = relationship("TestAttempt", back_populates="user", cascade="all, delete-orphan")
    served_questions = relationship("UserServedQuestion", back_populates="user", cascade="all, delete-orphan")


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    guest_id = Column(String(64), nullable=True, index=True)
    test_type = Column(String(30), nullable=False)  # "subject_wise" or "full_length"
    title = Column(String(100), nullable=False)
    subject_name = Column(String(50), nullable=True)
    score = Column(Integer, default=0)
    max_score = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    correct_count = Column(Integer, default=0)
    incorrect_count = Column(Integer, default=0)
    unattempted_count = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, default=0)
    duration_minutes = Column(Integer, default=0)
    subjects_included = Column(Text, default="[]")  # JSON list
    subject_wise_score = Column(Text, default="{}")  # JSON dict
    questions_data = Column(Text, nullable=True)  # JSON questions bank for active test
    current_answers = Column(Text, default="{}")  # Autosaved answers JSON: { "subject": { "qId": choice } }
    marked_for_review = Column(Text, default="{}")  # Autosaved marked review JSON: { "subject": { "qId": bool } }
    
    # Timer controls
    is_paused = Column(Boolean, default=False)  # Can be paused in subject-wise tests
    paused_at = Column(DateTime, nullable=True)
    total_paused_seconds = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="attempts")
    responses = relationship("QuestionResponse", back_populates="attempt", cascade="all, delete-orphan", order_by="QuestionResponse.id")


class QuestionResponse(Base):
    __tablename__ = "question_responses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    attempt_id = Column(String(36), ForeignKey("test_attempts.id", ondelete="CASCADE"), index=True, nullable=False)
    question_id = Column(Integer, nullable=False)
    subject = Column(String(50), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(Text, nullable=False)  # JSON string
    selected_option = Column(Integer, nullable=True)
    correct_option = Column(Integer, nullable=False)
    is_correct = Column(Boolean, default=False)
    status = Column(String(20), default="unattempted")  # "correct", "incorrect", "unattempted"
    time_spent_seconds = Column(Integer, default=0)

    attempt = relationship("TestAttempt", back_populates="responses")


class UserServedQuestion(Base):
    __tablename__ = "user_served_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    guest_id = Column(String(64), nullable=True, index=True)
    subject = Column(String(50), nullable=False, index=True)
    question_id = Column(Integer, nullable=False, index=True)
    attempt_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="served_questions")

    __table_args__ = (
        Index('idx_user_sub_qid', 'user_id', 'subject', 'question_id'),
        Index('idx_guest_sub_qid', 'guest_id', 'subject', 'question_id'),
    )
