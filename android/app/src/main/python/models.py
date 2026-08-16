from extensions import db
from flask_login import UserMixin
from datetime import datetime


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)

    username = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)

    password = db.Column(db.String(200), nullable=False)

    role = db.Column(db.String(20), default="citizen")

    reward_points = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class PickupRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    waste_type = db.Column(db.String(50), nullable=False)
    estimated_weight = db.Column(db.Float, nullable=True)

    pickup_location = db.Column(db.String(255), nullable=False)

    status = db.Column(db.String(20), default="Pending")

    collector_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    image_filename = db.Column(db.String(255), nullable=True)

    user = db.relationship("User", foreign_keys=[user_id], backref=db.backref("pickup_requests", lazy=True))
    collector = db.relationship("User", foreign_keys=[collector_id], backref=db.backref("assigned_pickups", lazy=True))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class RewardRedemption(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    reward_name = db.Column(db.String(100), nullable=False)
    points_spent = db.Column(db.Integer, nullable=False)
    redemption_code = db.Column(db.String(50), nullable=False)

    user = db.relationship("User", foreign_keys=[user_id], backref=db.backref("redemptions", lazy=True))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Reward(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)
    points = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False, default="General")
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
