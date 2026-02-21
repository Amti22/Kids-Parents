# [BLOCK: EXTENSIONS_BRIDGE]
from flask_socketio import SocketIO
from database.context_manager import ContextManager

# Initialize instances here without the app context
socketio = SocketIO(cors_allowed_origins="*")
db = ContextManager()
# [/BLOCK: EXTENSIONS_BRIDGE]