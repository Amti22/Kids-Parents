from flask_socketio import SocketIO

# SOCKET_INSTANCE_BRIDGE
# This file acts as the central hub for the SocketIO object.
# By defining it here, we prevent Circular Dependency errors
# between run.py and routes/socket_events.py.

socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')