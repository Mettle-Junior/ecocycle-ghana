import os
import time
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from extensions import db
import random
import string
from models import PickupRequest, RewardRedemption, Reward

citizen_bp = Blueprint("citizen", __name__)


# -----------------------
# REDEEM REWARDS
# -----------------------
@citizen_bp.route("/citizen/redeem", methods=["GET", "POST"])
@citizen_bp.route("/redeem", methods=["GET", "POST"])
@citizen_bp.route("/rewards", methods=["GET", "POST"])
@citizen_bp.route("/citizen/rewards", methods=["GET", "POST"])
@login_required
def redeem_rewards():
    if request.method == "POST":
        reward_id_str = request.form.get("reward_id")
        try:
            reward_id = int(reward_id_str)
            selected_reward = Reward.query.get(reward_id)
        except (ValueError, TypeError):
            selected_reward = None

        if not selected_reward or not selected_reward.is_active:
            flash("Invalid or unavailable reward selected.")
            return redirect(url_for("citizen.redeem_rewards"))

        if current_user.reward_points < selected_reward.points:
            flash(f"Insufficient points! You need {selected_reward.points} points to redeem {selected_reward.name}.")
            return redirect(url_for("citizen.redeem_rewards"))

        # Deduct points
        current_user.reward_points -= selected_reward.points

        # Generate unique redemption code
        code_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        redemption_code = f"ECO-{code_suffix[:4]}-{code_suffix[4:]}"

        new_redemption = RewardRedemption(
            user_id=current_user.id,
            reward_name=selected_reward.name,
            points_spent=selected_reward.points,
            redemption_code=redemption_code
        )

        db.session.add(new_redemption)
        db.session.commit()

        flash(f"Success! Redeemed '{selected_reward.name}'. Your Redemption Code is: {redemption_code}")
        return redirect(url_for("citizen.redeem_rewards"))

    catalog = Reward.query.filter_by(is_active=True).order_by(Reward.points.asc()).all()
    redemptions = RewardRedemption.query.filter_by(user_id=current_user.id).order_by(RewardRedemption.created_at.desc()).all()

    return render_template(
        "redeem.html",
        user=current_user,
        catalog=catalog,
        redemptions=redemptions
    )



# -----------------------
# DASHBOARD
# -----------------------
@citizen_bp.route("/citizen/dashboard")
@citizen_bp.route("/dashboard")
@login_required
def dashboard():
    requests = PickupRequest.query.filter_by(user_id=current_user.id).order_by(PickupRequest.created_at.desc()).all()

    return render_template(
        "citizen_dashboard.html",
        user=current_user,
        requests=requests
    )


# -----------------------
# REQUEST PICKUP
# -----------------------
@citizen_bp.route("/citizen/request-pickup", methods=["GET", "POST"])
@citizen_bp.route("/request-pickup", methods=["GET", "POST"])
@citizen_bp.route("/citizen/request/new", methods=["GET", "POST"])
@citizen_bp.route("/request/new", methods=["GET", "POST"])
@citizen_bp.route("/citizen/request_pickup", methods=["GET", "POST"])
@citizen_bp.route("/request_pickup", methods=["GET", "POST"])
@login_required
def request_pickup():
    if request.method == "POST":
        waste_type = request.form.get("waste_type")
        location = request.form.get("pickup_location", "").strip()
        weight_str = request.form.get("estimated_weight")

        try:
            estimated_weight = float(weight_str) if weight_str else 1.0
        except ValueError:
            estimated_weight = 1.0

        if not location:
            flash("Please provide a pickup location.")
            return render_template("request_pickup.html")

        image_file = request.files.get("waste_image")
        filename = None

        if image_file and image_file.filename:
            ext = os.path.splitext(image_file.filename)[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
                ext = ".jpg"
            filename = f"waste_{current_user.id}_{int(time.time())}{ext}"
            upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "uploads"))
            os.makedirs(upload_dir, exist_ok=True)
            image_file.save(os.path.join(upload_dir, filename))
        else:
            filename = "sample_waste.jpg"

        new_request = PickupRequest(
            user_id=current_user.id,
            waste_type=waste_type,
            estimated_weight=estimated_weight,
            pickup_location=location,
            image_filename=filename,
            status="Pending"
        )

        db.session.add(new_request)
        db.session.commit()

        flash("Pickup request submitted successfully with verified waste photo!")
        return redirect(url_for("citizen.dashboard"))

    return render_template("request_pickup.html")