from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from models import PickupRequest, User, RewardRedemption, Reward
from extensions import db
from datetime import datetime, timedelta

admin_bp = Blueprint("admin", __name__)



def check_admin():
    return current_user.is_authenticated and current_user.role == "admin"


def get_analytics_report_data(timeframe="weekly"):
    now = datetime.utcnow()

    if timeframe == "weekly":
        cutoff_date = now - timedelta(days=56)
    elif timeframe == "monthly":
        cutoff_date = now - timedelta(days=180)
    else:
        cutoff_date = datetime(2000, 1, 1)

    requests_query = PickupRequest.query.filter(PickupRequest.created_at >= cutoff_date).all()
    redemptions_query = RewardRedemption.query.filter(RewardRedemption.created_at >= cutoff_date).all()
    collectors = User.query.filter_by(role="collector").all()
    citizens = User.query.filter_by(role="citizen").all()

    total_requests = len(requests_query)
    completed_requests = [r for r in requests_query if r.status == "Collected"]
    assigned_requests = [r for r in requests_query if r.status == "Assigned"]
    pending_requests = [r for r in requests_query if r.status == "Pending"]

    total_weight_kg = sum(r.estimated_weight or 0 for r in completed_requests)
    completion_rate = round((len(completed_requests) / total_requests * 100), 1) if total_requests > 0 else 0.0

    # 1. Timeline Chart Data (Citizen Requests Created vs Collector Completed)
    labels = []
    created_series = []
    completed_series = []
    weight_series = []

    if timeframe == "weekly":
        for i in range(7, -1, -1):
            w_start = now - timedelta(days=(i + 1) * 7)
            w_end = now - timedelta(days=i * 7)
            label = f"Wk {8 - i} ({w_start.strftime('%b %d')})"
            labels.append(label)

            c_count = sum(1 for r in requests_query if w_start <= r.created_at < w_end)
            comp_count = sum(1 for r in requests_query if r.status == "Collected" and w_start <= r.created_at < w_end)
            w_sum = sum(r.estimated_weight or 0 for r in requests_query if r.status == "Collected" and w_start <= r.created_at < w_end)

            created_series.append(c_count)
            completed_series.append(comp_count)
            weight_series.append(round(w_sum, 1))

    elif timeframe == "monthly":
        for i in range(5, -1, -1):
            m_start = now - timedelta(days=(i + 1) * 30)
            m_end = now - timedelta(days=i * 30)
            label = m_start.strftime("%b %Y")
            labels.append(label)

            c_count = sum(1 for r in requests_query if m_start <= r.created_at < m_end)
            comp_count = sum(1 for r in requests_query if r.status == "Collected" and m_start <= r.created_at < m_end)
            w_sum = sum(r.estimated_weight or 0 for r in requests_query if r.status == "Collected" and m_start <= r.created_at < m_end)

            created_series.append(c_count)
            completed_series.append(comp_count)
            weight_series.append(round(w_sum, 1))
    else:
        all_reqs = PickupRequest.query.all()
        first_date = min((r.created_at for r in all_reqs), default=now - timedelta(days=30))
        delta = (now - first_date) / 8 or timedelta(days=7)

        for i in range(8):
            b_start = first_date + delta * i
            b_end = first_date + delta * (i + 1)
            label = b_start.strftime("%b %d")
            labels.append(label)

            c_count = sum(1 for r in requests_query if b_start <= r.created_at <= b_end)
            comp_count = sum(1 for r in requests_query if r.status == "Collected" and b_start <= r.created_at <= b_end)
            w_sum = sum(r.estimated_weight or 0 for r in requests_query if r.status == "Collected" and b_start <= r.created_at <= b_end)

            created_series.append(c_count)
            completed_series.append(comp_count)
            weight_series.append(round(w_sum, 1))

    # 2. Waste Category Breakdown
    categories = ["Plastic", "Metal", "Paper", "Glass", "Rubber", "Waste"]
    waste_breakdown = {}
    for cat in categories:
        cat_reqs = [r for r in requests_query if r.waste_type == cat]
        cat_weight = sum(r.estimated_weight or 0 for r in cat_reqs if r.status == "Collected")
        waste_breakdown[cat] = {
            "count": len(cat_reqs),
            "weight": round(cat_weight, 1)
        }

    # 3. Collector Performance Breakdown
    collector_perf = []
    for c in collectors:
        c_assigned = sum(1 for r in requests_query if r.collector_id == c.id)
        c_completed = sum(1 for r in requests_query if r.collector_id == c.id and r.status == "Collected")
        c_weight = sum(r.estimated_weight or 0 for r in requests_query if r.collector_id == c.id and r.status == "Collected")
        rate = round((c_completed / c_assigned * 100), 1) if c_assigned > 0 else 0.0

        collector_perf.append({
            "id": c.id,
            "name": f"{c.first_name} {c.last_name}",
            "assigned": c_assigned,
            "completed": c_completed,
            "weight": round(c_weight, 1),
            "rate": rate
        })

    collector_perf.sort(key=lambda x: x["completed"], reverse=True)

    # 4. Citizen Reward Redemptions Breakdown
    redemption_counts = {}
    total_points_spent = 0
    for r in redemptions_query:
        redemption_counts[r.reward_name] = redemption_counts.get(r.reward_name, 0) + 1
        total_points_spent += r.points_spent

    sorted_redemptions = sorted(redemption_counts.items(), key=lambda x: x[1], reverse=True)[:6]

    # 5. Location Hotspots
    location_counts = {}
    for r in requests_query:
        loc_key = r.pickup_location.split(",")[0].strip() if "," in r.pickup_location else r.pickup_location
        location_counts[loc_key] = location_counts.get(loc_key, 0) + 1

    top_locations = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)[:6]

    return {
        "timeframe": timeframe,
        "kpi": {
            "total_requests": total_requests,
            "completed_requests": len(completed_requests),
            "pending_requests": len(pending_requests),
            "assigned_requests": len(assigned_requests),
            "total_weight_kg": round(total_weight_kg, 1),
            "completion_rate": completion_rate,
            "active_citizens": len(citizens),
            "active_collectors": len(collectors),
            "total_redemptions": len(redemptions_query),
            "total_points_spent": total_points_spent
        },
        "timeline": {
            "labels": labels,
            "created": created_series,
            "completed": completed_series,
            "weight": weight_series
        },
        "waste_breakdown": waste_breakdown,
        "collector_perf": collector_perf,
        "top_redemptions": {
            "labels": [item[0] for item in sorted_redemptions],
            "data": [item[1] for item in sorted_redemptions]
        },
        "top_locations": {
            "labels": [item[0] for item in top_locations],
            "data": [item[1] for item in top_locations]
        }
    }


@admin_bp.route("/admin/dashboard")
@admin_bp.route("/admin")
@login_required
def dashboard():
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    timeframe = request.args.get("timeframe", "weekly")
    report_data = get_analytics_report_data(timeframe)

    return render_template("admin_dashboard.html", report_data=report_data)


@admin_bp.route("/admin/api/reports")
@login_required
def api_reports():
    if not check_admin():
        return jsonify({"error": "Admin access required"}), 403

    timeframe = request.args.get("timeframe", "weekly")
    data = get_analytics_report_data(timeframe)
    return jsonify(data)



@admin_bp.route("/admin/requests")
@login_required
def view_requests():
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    requests = PickupRequest.query.order_by(PickupRequest.created_at.desc()).all()
    collectors = User.query.filter_by(role="collector").all()

    total_requests = len(requests)
    pending = sum(1 for r in requests if r.status == "Pending")
    assigned = sum(1 for r in requests if r.status == "Assigned")
    collected = sum(1 for r in requests if r.status == "Collected")

    waste_types = {}
    for r in requests:
        waste_types[r.waste_type] = waste_types.get(r.waste_type, 0) + 1

    return render_template(
        "admin_requests.html",
        requests=requests,
        collectors=collectors,
        total_requests=total_requests,
        pending=pending,
        assigned=assigned,
        collected=collected,
        waste_types=waste_types
    )


@admin_bp.route("/admin/assign/<int:id>", methods=["POST"])
@login_required
def assign_request(id):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    req = PickupRequest.query.get_or_404(id)
    collector_id = request.form.get("collector_id")

    if collector_id:
        req.collector_id = int(collector_id)
        req.status = "Assigned"
        db.session.commit()
        flash("Pickup request assigned successfully.")

    return redirect("/admin/requests")


@admin_bp.route("/admin/update-status/<int:id>/<string:status>")
@admin_bp.route("/admin/mark-collected/<int:id>")
@login_required
def mark_collected(id, status="Collected"):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    req = PickupRequest.query.get_or_404(id)
    req.status = status

    if status == "Collected":
        reward_map = {
            "Plastic": 2,
            "Metal": 5,
            "Paper": 1,
            "Glass": 1,
            "Rubber": 3,
            "Waste": 3
        }

        points = reward_map.get(req.waste_type, 1) * (req.estimated_weight or 1)
        user = db.session.get(User, req.user_id)
        if user:
            user.reward_points += int(points)

    db.session.commit()
    flash(f"Pickup request updated to {status}.")

    return redirect("/admin/requests")


@admin_bp.route("/admin/users")
@login_required
def view_users():
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    users = User.query.all()
    citizens = [u for u in users if u.role == "citizen"]
    collectors = [u for u in users if u.role == "collector"]
    leaderboard = User.query.order_by(User.reward_points.desc()).limit(10).all()

    return render_template(
        "admin_users.html",
        users=users,
        citizens=citizens,
        collectors=collectors,
        leaderboard=leaderboard
    )


@admin_bp.route("/admin/make-collector/<int:id>")
@login_required
def make_collector(id):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    user = User.query.get_or_404(id)
    user.role = "collector"
    db.session.commit()
    flash(f"{user.first_name} {user.last_name} is now a Collector.")

    return redirect("/admin/users")


@admin_bp.route("/admin/users/<int:id>/change-role", methods=["POST"])
@login_required
def change_user_role(id):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    user = db.session.get(User, id)
    if not user:
        flash("User not found.")
        return redirect("/admin/users")

    new_role = request.form.get("role")
    if new_role in ["citizen", "collector", "admin"]:
        if user.id == current_user.id and new_role != "admin":
            flash("You cannot remove your own admin role.")
            return redirect("/admin/users")

        user.role = new_role
        db.session.commit()
        flash(f"Role for {user.first_name} {user.last_name} changed to {new_role.capitalize()}.")
    else:
        flash("Invalid role selected.")

    return redirect("/admin/users")


@admin_bp.route("/admin/users/<int:id>/delete", methods=["GET", "POST"])
@login_required
def delete_user(id):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    user = User.query.get_or_404(id)
    if user.id == current_user.id:
        flash("Cannot delete your own admin account.")
        return redirect("/admin/users")

    db.session.delete(user)
    db.session.commit()
    flash("User deleted successfully.")

    return redirect("/admin/users")


# -----------------------
# REWARD MANAGEMENT
# -----------------------
@admin_bp.route("/admin/rewards")
@login_required
def view_rewards():
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    rewards = Reward.query.order_by(Reward.created_at.desc()).all()
    categories = list(set([r.category for r in rewards])) if rewards else ["Airtime", "Data Bundle", "Utilities", "Transport", "Groceries", "Entertainment", "Eco Merchandise", "Education", "Dining"]

    total_rewards = len(rewards)
    active_rewards = sum(1 for r in rewards if r.is_active)
    inactive_rewards = total_rewards - active_rewards

    return render_template(
        "admin_rewards.html",
        rewards=rewards,
        categories=categories,
        total_rewards=total_rewards,
        active_rewards=active_rewards,
        inactive_rewards=inactive_rewards
    )


@admin_bp.route("/admin/rewards/add", methods=["POST"])
@login_required
def add_reward():
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    name = request.form.get("name", "").strip()
    points_str = request.form.get("points")
    category = request.form.get("category", "General").strip()
    description = request.form.get("description", "").strip()

    if not name or not points_str:
        flash("Reward name and required points are mandatory.")
        return redirect(url_for("admin.view_rewards"))

    try:
        points = int(points_str)
        if points <= 0:
            raise ValueError
    except ValueError:
        flash("Points required must be a positive integer.")
        return redirect(url_for("admin.view_rewards"))

    new_reward = Reward(
        name=name,
        points=points,
        category=category,
        description=description,
        is_active=True
    )

    db.session.add(new_reward)
    db.session.commit()
    flash(f"Reward '{name}' added successfully to the catalog!")

    return redirect(url_for("admin.view_rewards"))


@admin_bp.route("/admin/rewards/<int:id>/edit", methods=["POST"])
@login_required
def edit_reward(id):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    reward = Reward.query.get_or_404(id)
    name = request.form.get("name", "").strip()
    points_str = request.form.get("points")
    category = request.form.get("category", "General").strip()
    description = request.form.get("description", "").strip()
    is_active = request.form.get("is_active") == "on"

    if not name or not points_str:
        flash("Reward name and points are mandatory.")
        return redirect(url_for("admin.view_rewards"))

    try:
        points = int(points_str)
        if points <= 0:
            raise ValueError
    except ValueError:
        flash("Points required must be a positive integer.")
        return redirect(url_for("admin.view_rewards"))

    reward.name = name
    reward.points = points
    reward.category = category
    reward.description = description
    reward.is_active = is_active

    db.session.commit()
    flash(f"Reward '{reward.name}' updated successfully.")

    return redirect(url_for("admin.view_rewards"))


@admin_bp.route("/admin/rewards/<int:id>/toggle")
@login_required
def toggle_reward_status(id):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    reward = Reward.query.get_or_404(id)
    reward.is_active = not reward.is_active
    db.session.commit()

    status_str = "activated" if reward.is_active else "deactivated"
    flash(f"Reward '{reward.name}' has been {status_str}.")

    return redirect(url_for("admin.view_rewards"))


@admin_bp.route("/admin/rewards/<int:id>/delete", methods=["GET", "POST"])
@login_required
def delete_reward(id):
    if not check_admin():
        flash("Admin access required.")
        return redirect("/")

    reward = Reward.query.get_or_404(id)
    reward_name = reward.name

    db.session.delete(reward)
    db.session.commit()
    flash(f"Reward '{reward_name}' deleted from catalog.")

    return redirect(url_for("admin.view_rewards"))