from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from models import PickupRequest, User
from extensions import db

collector_bp = Blueprint("collector", __name__)


@collector_bp.route("/collector/dashboard")
@login_required
def dashboard():
    if current_user.role not in ["collector", "admin"]:
        flash("Unauthorized access.")
        return redirect("/")

    pickups = PickupRequest.query.filter_by(
        collector_id=current_user.id,
        status="Assigned"
    ).all()

    return render_template("collector_dashboard.html", pickups=pickups, user=current_user)


@collector_bp.route("/collector/complete/<int:id>", methods=["GET", "POST"])
@login_required
def complete_pickup(id):
    if current_user.role not in ["collector", "admin"]:
        flash("Unauthorized access.")
        return redirect("/")

    pickup = PickupRequest.query.get_or_404(id)

    if request.method == "POST":
        try:
            actual_weight = float(request.form.get("actual_weight", pickup.estimated_weight or 1))
        except ValueError:
            actual_weight = pickup.estimated_weight or 1.0

        pickup.status = "Collected"

        reward_map = {
            "Plastic": 2,
            "Metal": 5,
            "Paper": 1,
            "Glass": 1,
            "Rubber": 3,
            "Waste": 3
        }

        rate = reward_map.get(pickup.waste_type, 1)
        points = int(rate * actual_weight)

        citizen = db.session.get(User, pickup.user_id)
        if citizen:
            citizen.reward_points += points

        db.session.commit()

        flash(f"Pickup marked as Collected! {points} points awarded to {citizen.first_name if citizen else 'citizen'}.")
        return redirect("/collector/dashboard")

    return render_template("complete_pickup.html", pickup=pickup)