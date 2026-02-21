# [BLOCK: KID_ROUTE_FULL]
# [AUDIT]
# FILE: routes/kid.py
# ROLE: Route handler for the kid portal.
# LAST_CHANGE: Fixed Jinja2 500 error by passing kid_data to render_template.

from flask import Blueprint, render_template, abort
from database.context_manager import ContextManager

kid_bp = Blueprint('kid', __name__)
db = ContextManager()


@kid_bp.route('/portal/<kid_id>')
def portal(kid_id):
    # Verify the kid exists in our JSON
    kid_data = db.get_kid(kid_id)

    if not kid_data:
        abort(404, description="Kid Profile Not Found")

    # [FIX]: We must pass the 'kid_data' object so that kid.html
    # can use {{ kid_data|tojson }} for the YouTube player settings.
    return render_template(
        'kid.html',
        kid_id=kid_id,
        kid_name=kid_data.get('name', 'Kid'),
        kid_data=kid_data
    )
# [/BLOCK: KID_ROUTE_FULL]