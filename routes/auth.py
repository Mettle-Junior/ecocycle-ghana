from flask import Blueprint, render_template, request, redirect, url_for, flash
from extensions import db
from models import User
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()

        if User.query.filter_by(username=username).first():
            flash("Username already exists. Please choose a different one.")
            return redirect(url_for("auth.register"))

        if email and User.query.filter_by(email=email).first():
            flash("Email already registered.")
            return redirect(url_for("auth.register"))

        role = request.form.get("role", "citizen")
        if role not in ["citizen", "collector", "admin"]:
            role = "citizen"

        new_user = User(
            first_name=request.form.get("first_name", "").strip(),
            last_name=request.form.get("last_name", "").strip(),
            username=username,
            phone=request.form.get("phone", "").strip(),
            email=email if email else None,
            password=generate_password_hash(request.form.get("password", "")),
            role=role
        )

        db.session.add(new_user)
        db.session.commit()

        flash("Account created successfully! Please log in.")
        return redirect(url_for("auth.login"))

    return render_template("register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)

            if user.role == "admin":
                return redirect("/admin/dashboard")
            elif user.role == "collector":
                return redirect("/collector/dashboard")
            return redirect("/citizen/dashboard")

        flash("Invalid username or password")
        return redirect(url_for("auth.login"))

    return render_template("login.html")


@auth_bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        phone = request.form.get("phone", "").strip()
        new_password = request.form.get("new_password", "")

        user = User.query.filter_by(username=username).first()

        if user and (user.phone == phone or (user.email and user.email == phone)):
            user.password = generate_password_hash(new_password)
            db.session.commit()
            flash("Password updated successfully! Please log in with your new password.")
            return redirect(url_for("auth.login"))
        else:
            flash("User not found or phone number verification failed.")
            return redirect(url_for("auth.forgot_password"))

    return render_template("forgot_password.html")


@auth_bp.route("/logout")
def logout():
    logout_user()
    flash("You have been logged out.")
    return redirect(url_for("auth.login"))