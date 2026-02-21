# [AUDIT]
# FILE: run.py
# ROLE: Flask Application Entry Point & SocketIO Bridge.
# LAST_CHANGE: Fixed __main__ import error for Vercel by using extensions.py bridge.

from flask import Flask, redirect, url_for, send_from_directory
import os
# Import shared instances to prevent circular dependency
from extensions import socketio, db

app = Flask(__name__)
app.config['SECRET_KEY'] = 'kiddie_secret_99'

# [BLOCK: DIRECTORY_SETUP]
# Ensure vault directory exists for snapshots
os.makedirs(os.path.join('database', 'vault'), exist_ok=True)
# [/BLOCK: DIRECTORY_SETUP]

# [BLOCK: SOCKET_DB_INIT]
# Initialize shared socket bridge with the app context
socketio.init_app(app)
# [/BLOCK: SOCKET_DB_INIT]

# [BLOCK: BLUEPRINTS]
from routes.parent import parent_bp
from routes.kid import kid_bp

app.register_blueprint(parent_bp, url_prefix='/parent')
app.register_blueprint(kid_bp, url_prefix='/kid')
# [/BLOCK: BLUEPRINTS]

# [BLOCK: SOCKET_EVENTS_IMPORT]
# IMPORTANT: This must be imported AFTER socketio.init_app to avoid circular imports
import routes.socket_events
# [/BLOCK: SOCKET_EVENTS_IMPORT]

# [BLOCK: MAIN_ROUTES]
@app.route('/')
def index():
    return redirect('/parent/dashboard')

@app.route('/vault/<filename>')
def serve_vault_image(filename):
    """Serves captured snapshots from the secure vault."""
    return send_from_directory(os.path.join('database', 'vault'), filename)
# [/BLOCK: MAIN_ROUTES]

if __name__ == '__main__':
    # allow_unsafe_werkzeug=True is required for the development tunnel (Ngrok)
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )