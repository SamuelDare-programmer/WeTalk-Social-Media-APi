import re
from typing import List, Set

def extract_mentions(text: str) -> Set[str]:
    """
    Extracts @usernames from text.
    Returns a set of unique usernames (without the @ prefix).
    """
    if not text:
        return set()
    # Matches @ followed by word characters, ensuring it's not preceded by a non-space character (like an email)
    # and ensuring it's not just @ by itself.
    mentions = re.findall(r'(?<!\w)@(\w+)', text)
    return set(mentions)

def extract_hashtags(text: str) -> Set[str]:
    """
    Extracts #hashtags from text.
    Returns a set of unique hashtags (without the # prefix).
    """
    if not text:
        return set()
    # Matches # followed by word characters.
    hashtags = re.findall(r'(?<!\w)#(\w+)', text)
    return set(hashtags)
