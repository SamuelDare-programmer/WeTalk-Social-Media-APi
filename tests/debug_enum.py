from app.posts.models import MediaType

def test_enum():
    v = MediaType.VIDEO
    print(f"Value: {v}")
    print(f"Str: {str(v)}")
    print(f"Is instance of str: {isinstance(v, str)}")
    print(f"Equality check 'video': {v == 'video'}")
    print(f"Equality check 'MediaType.VIDEO': {v == 'MediaType.VIDEO'}")

if __name__ == "__main__":
    test_enum()
