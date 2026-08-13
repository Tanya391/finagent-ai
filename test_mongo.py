from pymongo import MongoClient

uri = "mongodb+srv://tanyayadav2552005_db_user:z50Lnd2DMdfHYa9B@cluster0.wnjd0ld.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("SUCCESS: Connected to Atlas")
except Exception as e:
    print("ERROR:", e)
