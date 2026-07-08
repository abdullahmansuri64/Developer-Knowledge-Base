from config.db import db
from datetime import datetime

class Article(db.Model):

    __tablename__ = "articles"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    title = db.Column(
        db.String(255),
        nullable=False
    )

    content = db.Column(
        db.Text,
        nullable=False
    )

    status = db.Column(
        db.String(20),
        default="draft"
    )

    views = db.Column(
        db.Integer,
        default=0
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id")
    )

    author_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )