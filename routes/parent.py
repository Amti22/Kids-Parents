"""
[AUDIT]
# FILE: routes/parent.py
# ROLE: Handling Parent UI routes, serving Vault images, and Library management.
# VERSION: 2.8 (Corrected Sync Relay)
# LAST_CHANGE: Updated assign_library to return the actual YouTube URL/ID instead of the DB Key.
"""

from flask import Blueprint, render_template, request, url_for, send_from_directory, jsonify
from database.context_manager import ContextManager
import uuid
import os

parent_bp = Blueprint('parent', __name__)
db = ContextManager()


# [BLOCK: ENROLLMENT_LOGIC]
@parent_bp.route('/enroll', methods=['GET', 'POST'])
def enroll():
    """Handles new kid registration and identity generation."""
    if request.method == 'POST':
        # Generate a short, friendly 8-character ID
        kid_id = str(uuid.uuid4())[:8].upper()
        name = request.form.get('kid_name')
        age = request.form.get('kid_age')
        bedtime = request.form.get('bedtime')
        wakeup = request.form.get('wakeup')

        # Persist to Bunker
        db.add_kid(kid_id, name, age, bedtime, wakeup)

        # Generate portal link
        portal_url = url_for('kid.kid_portal', kid_id=kid_id, _external=True)

        return f"""
        <body style="font-family:sans-serif; background:#0f172a; color:white; text-align:center; padding:50px;">
            <div style="background:#1e293b; display:inline-block; padding:30px; border-radius:15px; border:1px solid #334155;">
                <h2 style="color:#38bdf8;">🎉 Enrollment Successful!</h2>
                <p>Child: <strong>{name}</strong></p>
                <p>ID: <strong>{kid_id}</strong></p>
                <hr style="border:0; border-top:1px solid #334155; margin:20px 0;">
                <p>Tablet Link: <br><a href="{portal_url}" style="color:#38bdf8; word-break:break-all;">{portal_url}</a></p>
                <br>
                <a href="/parent/dashboard" style="background:#38bdf8; color:#0f172a; padding:10px 20px; text-decoration:none; border-radius:8px; font-weight:bold;">Go to Dashboard</a>
            </div>
        </body>
        """
    return render_template('enroll.html')
# [/BLOCK: ENROLLMENT_LOGIC]


# [BLOCK: DASHBOARD_CORE]
@parent_bp.route('/dashboard')
def dashboard():
    """
    Renders the Parent Grid.
    RESTORED: Includes 'data=db.data' to fix the Playlist Manager button/modal.
    """
    # Fetch latest data from the Bunker
    kids = db.get_all_kids()
    library = db.get_library()

    # Passing 'data' is essential for the JS Library Manager to populate correctly
    return render_template('parent.html', kids=kids, library=library, data=db.data)
# [/BLOCK: DASHBOARD_CORE]


# [BLOCK: LIBRARY_API_HANDLERS]
@parent_bp.route('/api/library/assign', methods=['POST'])
def assign_library():
    """
    Handles the assignment of specific library playlists to a child's mode.
    FIXED: Returns ACTUAL YouTube ID (result.get('url')) to prevent 'lib_xxx' being sent to YT Player.
    """
    try:
        data = request.json
        kid_id = data.get('kid_id')
        mode = data.get('mode')  # 'day' or 'night'
        library_id = data.get('library_id')

        if not kid_id or not mode:
            return jsonify({"status": "error", "message": "Missing required fields"}), 400

        # Perform the assignment via ContextManager
        # result is the lib_item dict: {"name": "...", "url": "YT_ID", "type": "playlist"}
        success, result = db.assign_to_kid(kid_id, mode, library_id)

        if success:
            print(f"[📚] Assigned Library '{library_id}' to {kid_id} ({mode} mode)")

            # CRITICAL: We send 'video_id' as the actual YouTube string, not the DB key.
            return jsonify({
                "status": "success",
                "assigned_db_id": library_id,
                "video_id": result.get('url'),    # e.g., "PL123..." or "dQw4w9..."
                "media_type": result.get('type')  # 'playlist' or 'video'
            })

        return jsonify({"status": "error", "message": result}), 404

    except Exception as e:
        print(f"[❌] Library Assign Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
# [/BLOCK: LIBRARY_API_HANDLERS]


# [BLOCK: VAULT_SERVICE]
@parent_bp.route('/vault/<filename>')
def serve_vault(filename):
    """Allows the dashboard to load images saved in the database/vault folder."""
    vault_path = os.path.join(os.getcwd(), 'database', 'vault')
    return send_from_directory(vault_path, filename)
# [/BLOCK: VAULT_SERVICE]