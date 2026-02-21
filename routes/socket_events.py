# routes/socket_events.py
# [BLOCK: SOCKET_CORE_HUB]
"""
[AUDIT]
# FILE: routes/socket_events.py
# ROLE: Identity-based status hub (Role Aware).
# VERSION: 3.3 (Mirror Loop Prevention)
# LAST_CHANGE: Optimized state_report to prevent feedback loops during playlist sync.
"""

import os
import base64
from datetime import datetime
from flask import request
from flask_socketio import emit, join_room
from __main__ import socketio, db

# [BLOCK: STORAGE_CONFIG]
VAULT_DIR = os.path.join('database', 'vault')
if not os.path.exists(VAULT_DIR):
    os.makedirs(VAULT_DIR)

# Track active sessions for status badges and room management
active_sessions = {}
# [/BLOCK: STORAGE_CONFIG]

# [BLOCK: REMOTE_DEBUGGER]
@socketio.on('remote_log')
def handle_remote_log(data):
    """
    RECEIVE BROWSER LOGS:
    Pipes console.log and window.onerror from JS directly to this terminal.
    """
    level = data.get('level', 'LOG')
    source = data.get('source', 'BROWSER')
    msg = data.get('message', '')

    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [JS-{level}] ({source}): {msg}")
# [/BLOCK: REMOTE_DEBUGGER]

# [BLOCK: CONNECTION_HANDLERS]
@socketio.on('join')
def handle_join(data):
    """Triggered when a Kid or Parent joins a room."""
    room = str(data.get('room', '')).strip()
    role = data.get('role', 'parent')

    if room:
        join_room(room)
        active_sessions[request.sid] = {"room": room, "role": role}

        if role == 'kid':
            print(f"[🟢] KID PORTAL ACTIVE: {room}")
            db.update_status(room, "online")
            emit('status_change', {'online': True, 'kid_id': room}, broadcast=True)
        else:
            # Parents join 'parent_admin' to receive global events like stream frames
            join_room('parent_admin')
            print(f"[👨‍💻] PARENT DASHBOARD ONLINE: Listening to Kid {room}")

            kid_data = db.get_kid(room)
            is_online = (kid_data.get('status') == 'online') if kid_data else False
            emit('status_change', {'online': is_online, 'kid_id': room}, to=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    """Handles automatic offline status when a socket closes."""
    session = active_sessions.get(request.sid)
    if session:
        room = session.get('room')
        if session.get('role') == 'kid':
            print(f"[❌] KID PORTAL DISCONNECTED: {room}")
            db.update_status(room, "offline")
            emit('status_change', {'online': False, 'kid_id': room}, broadcast=True)
        del active_sessions[request.sid]
# [/BLOCK: CONNECTION_HANDLERS]

# [BLOCK: STREAM_RELAY_LOGIC]
@socketio.on('kid_stream_frame')
def handle_stream(data):
    """
    RELAY LOGIC: Restores the live camera feed.
    """
    room = str(data.get('room', '')).strip()
    image = data.get('image')

    if room and image:
        emit('live_frame_update', {
            'kid_id': room,
            'image': image
        }, to='parent_admin')
# [/BLOCK: STREAM_RELAY_LOGIC]

# [BLOCK: COMMAND_ROUTING]
@socketio.on('parent_command')
def handle_command(data):
    """
    Universal bridge for Dashboard commands.
    FIXED: Changed event name to 'player_control' to match kid_socket.js listener.
    """
    room = str(data.get('room', '')).strip()
    command = data.get('command')

    # Extract all additional keys (volume, videoId, etc.) into the payload
    payload = {k: v for k, v in data.items() if k not in ['room', 'command']}

    print(f"[🚀] CMD RELAY: {command} -> {room} | Payload: {payload}")

    # Relays to Kid Portal. kid_socket.js listens for 'player_control'
    emit('player_control', {
        'command': command,
        'payload': payload
    }, to=room)
# [/BLOCK: COMMAND_ROUTING]

# [BLOCK: STATE_SYNC]
@socketio.on('state_report')
def handle_state_report(data):
    """
    THE REFLECTOR: Bounces Kid player state (time, videoId) back to Parent Dashboard Mirror.
    FIX: Only relay if source is 'kid' to prevent parent mirrors from triggering each other.
    """
    session = active_sessions.get(request.sid)
    if not session: return

    room = session.get('room')
    role = session.get('role')

    # Only relay state updates that come from the actual Tablet
    if role == 'kid' and room:
        # Send to parent_admin room so the dashboard UI and Mirror update
        emit('state_report', data, to='parent_admin')
# [/BLOCK: STATE_SYNC]

# [BLOCK: SNAPSHOT_LOGIC]
@socketio.on('snapshot_upload')
@socketio.on('cry_alert')
def handle_snapshot(data):
    session = active_sessions.get(request.sid)
    room = str(data.get('room') or (session.get('room') if session else ''))
    image_data = data.get('image')

    if image_data and room:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"SNAP_{room}_{timestamp}.jpg"
        filepath = os.path.join(VAULT_DIR, filename)

        try:
            if "," in image_data:
                _, encoded = image_data.split(",", 1)
            else:
                encoded = image_data

            with open(filepath, "wb") as f:
                f.write(base64.b64decode(encoded))

            print(f"[💾] Snapshot saved for {room}")

            emit('new_snapshot', {
                'kid_id': room,
                'image': image_data,
                'url': f"/parent/vault/{filename}"
            }, to='parent_admin')
        except Exception as e:
            print(f"[❌] Snapshot save failed: {e}")
# [/BLOCK: SNAPSHOT_LOGIC]
# [/BLOCK: SOCKET_CORE_HUB]