from .base import *

DEBUG = False

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

# CORS Settings for production
CORS_ALLOWED_ORIGINS = [
    'http://roadmate.p-e.kr',
    'http://3.34.190.189',
]
CORS_ALLOW_CREDENTIALS = True

DATABASES = {
    'default': env.db('DATABASE_URL', default='postgres://postgres:postgres@db:5432/road_mate')
}
