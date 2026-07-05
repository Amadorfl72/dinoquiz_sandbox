import json
import logging
from datetime import datetime

logger = logging.getLogger("structured_logging")


def log_event(event, **fields):
    log_entry = {
        "event": event,
        "timestamp": datetime.utcnow().isoformat(),
        **fields,
    }
    logger.info(json.dumps(log_entry))
    return log_entry
