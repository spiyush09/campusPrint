import os
import logging
from datetime import timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_jwt_extended import JWTManager
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# -------------------
# Create Flask app
# -------------------
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# -------------------
# Database config
# -------------------
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///campus_print.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# -------------------
# JWT config
# -------------------
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-change-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
jwt = JWTManager(app)

# -------------------
# Login manager
# -------------------
login_manager = LoginManager(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# -------------------
# Upload folder
# -------------------
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# -------------------
# Create tables and default admin
# -------------------
with app.app_context():
    import models  # Import after db is initialized
    db.create_all()

    admin_user = models.User.query.filter_by(email="admin@campus.edu").first()
    if not admin_user:
        from werkzeug.security import generate_password_hash
        admin = models.User(
            username="admin",
            email="admin@campus.edu",
            password_hash=generate_password_hash("admin123"),
            role="admin"
        )
        db.session.add(admin)
        db.session.commit()
        logging.info("Default admin user created")

# -------------------
# Import routes
# -------------------
import routes
