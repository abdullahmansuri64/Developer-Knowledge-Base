from flask import Blueprint
from controllers.articleController import (
    create_article, get_articles, get_my_articles,
    get_article, update_article, delete_article, search_articles
)
from middleware.authMiddleware import token_required

article_bp = Blueprint('articles', __name__, url_prefix='/api/articles')

article_bp.route('/', methods=['POST'])(token_required(create_article))
article_bp.route('/', methods=['GET'])(token_required(get_articles))
article_bp.route('/my', methods=['GET'])(token_required(get_my_articles))
article_bp.route('/search', methods=['GET'])(token_required(search_articles))
article_bp.route('/<int:article_id>', methods=['GET'])(token_required(get_article))
article_bp.route('/<int:article_id>', methods=['PUT'])(token_required(update_article))
article_bp.route('/<int:article_id>', methods=['DELETE'])(token_required(delete_article))