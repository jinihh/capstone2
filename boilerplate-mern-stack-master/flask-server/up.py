from pymongo import MongoClient
from pymongo.server_api import ServerApi
import base64

# MongoDB Atlas 연결
uri = "mongodb+srv://capstone:rkdqkrchlghd@cluster0.l6abg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, server_api=ServerApi('1'))

# 데이터베이스 선택
db = client['cap']

# 컬렉션 선택
collection = db['videos']

def upload_video(file_path):
    try:
        # 파일을 바이너리로 읽기
        with open(file_path, "rb") as file:
            video_binary = file.read()
        
        # Base64 인코딩
        video_base64 = base64.b64encode(video_binary).decode('utf-8')
        
        # 문서 생성
        video_document = {
            "filename": "japan.mp4",
            "content_type": "video/mp4",
            "video_data": video_base64
        }
        
        # 데이터베이스에 문서 삽입
        result = collection.insert_one(video_document)
        
        print(f"Video uploaded successfully with ID: {result.inserted_id}")
        return result.inserted_id
    
    except FileNotFoundError:
        print(f"File not found: {file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

# 동영상 업로드
file_path = r"C:\Users\ghdal\OneDrive\바탕 화면\test\finaltest.mp4"
upload_video(file_path)