from app.utils import hash, verify

try:
    password = "testpassword123"
    print(f"Testing password: {password}")
    
    hashed = hash(password)
    print(f"Hashed: {hashed}")
    
    is_valid = verify(password, hashed)
    print(f"Verification: {is_valid}")
    
    if is_valid:
        print("✅ SUCCESS: Password hashing works!")
    else:
        print("❌ FAILURE: Verification failed!")
        
except Exception as e:
    print(f"❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
