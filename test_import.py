try:
    from app import app
    print("Backend imported successfully")
except Exception as e:
    import traceback
    traceback.print_exc()
