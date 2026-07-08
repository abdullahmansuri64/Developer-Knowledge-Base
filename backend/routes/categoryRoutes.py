from flask import Blueprint
from controllers.categoryController import get_categories
from middleware.authMiddleware import token_required

category_bp = Blueprint('categories', __name__, url_prefix='/api/categories')

category_bp.route('/', methods=['GET'])(token_required(get_categories))