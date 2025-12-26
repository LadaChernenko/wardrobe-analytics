from loguru import logger

logger.add(
    'logs.log',
    format='{time} {level} {message}',
    level='INFO',
    rotation='10 MB',
)