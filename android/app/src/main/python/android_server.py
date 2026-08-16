import os
import sys
import threading
from werkzeug.serving import run_simple

_server_started = False
_server_lock = threading.Lock()

def start_flask_app(data_dir):
    global _server_started
    with _server_lock:
        if _server_started:
            return "ALREADY_RUNNING"
        
        # Set environment variable so config.py writes sqlite database to Android filesDir
        os.environ['ANDROID_DATA_DIR'] = data_dir
        
        # Import app modules
        from app import create_app
        from extensions import db
        import init_db

        app = create_app()

        def run_server():
            run_simple('127.0.0.1', 5000, app, threaded=True, use_reloader=False)

        thread = threading.Thread(target=run_server, daemon=True)
        thread.start()
        _server_started = True
        return "OK"
