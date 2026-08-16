from flask import Flask, render_template, session, redirect
from config import Config
from extensions import db

from flask_login import LoginManager, current_user
from models import User

from routes.auth import auth_bp
from routes.citizen import citizen_bp
from routes.admin import admin_bp
from routes.collector import collector_bp


def create_app():

    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    with app.app_context():
        db.create_all()

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    app.register_blueprint(auth_bp)
    app.register_blueprint(citizen_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(collector_bp)

    @app.route("/")
    def home():
        if current_user.is_authenticated:
            if current_user.role == "admin":
                return redirect("/admin/dashboard")
            elif current_user.role == "collector":
                return redirect("/collector/dashboard")
            return redirect("/citizen/dashboard")
        return render_template("index.html")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)