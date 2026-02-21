# [AUDIT]
# FILE: run.py
# ROLE: Flask Application Entry Point
# LAST_CHANGE: Fixed issubclass error by simplifying exports for Vercel.

from flask import Flask, redirect, url_for, send_from_directory
import os
from extensions import socketio, db

# [BLOCK: RUN_APP_CORE]
app = Flask(__name__)
app.config['SECRET_KEY'] = 'kiddie_secret_99'

# Initialize shared socket bridge
socketio.init_app(app)

# Register Blueprints
from routes.parent import parent_bp
from routes.kid import kid_bp
app.register_blueprint(parent_bp, url_prefix='/parent')
app.register_blueprint(kid_bp, url_prefix='/kid')

# Import events
import routes.socket_events
# [/BLOCK: RUN_APP_CORE]

# [BLOCK: MAIN_ROUTES]
@app.route('/')
def index():
    return redirect('/parent/dashboard')

@app.route('/vault/<filename>')
def serve_vault_image(filename):
    return send_from_directory(os.path.join('database', 'vault'), filename)
# [/BLOCK: MAIN_ROUTES]

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)