from flask import Flask, request, jsonify, send_file
import torch
import cv2
import numpy as np
from pymongo import MongoClient
from bson import ObjectId
import tempfile
import base64
import os
from werkzeug.utils import secure_filename
from ultralytics import YOLO
from flask_cors import CORS  # 추가
from flask import send_file

app = Flask(__name__)
CORS(app)  # 모든 출처에 대해 CORS 허용

# MongoDB Atlas 연결
uri = "mongodb+srv://capstone:rkdqkrchlghd@cluster0.l6abg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Create a new client and connect to the server
client = MongoClient(uri, tls=True, tlsAllowInvalidCertificates=True)

try:
    client.admin.command('ping')
    print("Pinged your deployment. Successfully connected to MongoDB!")
except Exception as e:
    print(f"MongoDB connection error: {e}")

# MongoDB setup
db = client['cap']
videos_collection = db['videos']  # videos 컬렉션 사용
detected_videos_collection = db['detected_videos']

# 업로드 파일 경로 설정
UPLOAD_FOLDER = 'uploads'

# Load YOLO model
yolo_model = YOLO('yolo_capstone_model.pt')
yolo_model.overrides['data'] = None  # Disable default dataset loading
yolo_model.fuse()  # Fusing layers to improve inference performance

app = Flask(__name__)


@app.route('/flask-api/detect_objects', methods=['POST'])
def upload_video():
    try:
        # 비디오 파일 받기
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # 파일명을 안전하게 설정하고 서버에 저장
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        # 파일 경로 및 메타데이터를 MongoDB에 저장
        video_document = {
            'filename': filename,
            'content_type': file.content_type,
            'file_path': file_path,  # 서버의 파일 경로를 저장
            'description': 'Uploaded video',  # 필요에 따라 추가 메타데이터 포함
        }
        video_id = videos_collection.insert_one(video_document).inserted_id

        print(f"Uploaded video saved with ID: {video_id}")
        return jsonify({'video_id': str(video_id)}), 201

    except Exception as e:
        print(f"Error uploading video: {e}")
        return jsonify({'error': f'Error uploading video: {e}'}), 500



@app.route('/flask-api/detect_objects', methods=['POST'])
def detect_objects():
    try:
        # Step 1: video_id 확인
        video_id = request.json.get('_id')
        print(f"Received video_id: {video_id}")

        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        # Step 2: MongoDB에서 비디오 파일 가져오기
        video_document = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video_document:
            return jsonify({'error': 'Video not found'}), 404

        print(f"Video file fetched successfully: {video_document['filename']}")

        # Base64 디코딩하여 임시 파일로 저장
        video_data = base64.b64decode(video_document['video_data'])
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
            temp_video.write(video_data)
            temp_video_path = temp_video.name

        print(f"Temporary video saved at: {temp_video_path}")

        video = cv2.VideoCapture(temp_video_path)
        if not video.isOpened():
            return jsonify({'error': 'Failed to open video file'}), 500

        print("Video opened successfully")

        # Step 4: YOLO 모델로 객체 탐지
        detected_frames = []
        fps = video.get(cv2.CAP_PROP_FPS)
        print(f"Video FPS: {fps}")

        frame_index = 0
        frame_duration = 1 / fps  # 각 프레임의 시간 간격
        timeline_data = {}  # 객체 ID별로 Timeline 데이터 저장
        last_detected_frame = {}  # 마지막으로 탐지된 프레임 인덱스 저장

        while True:
            ret, frame = video.read()
            if not ret:
                print("End of video reached")
                break

            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = yolo_model.predict(rgb_frame, verbose=False)
                detections = results[0].boxes

                if len(detections) > 0:
                    for i in range(len(detections)):
                        # 바운딩 박스 좌표
                        x1, y1, x2, y2 = map(int, detections.xyxy[i].tolist())
                        # 신뢰도
                        confidence = float(detections.conf[i])
                        # 클래스 ID
                        class_id = int(detections.cls[i])
                        bbox = [x1, y1, x2, y2]

                        # 타임라인 데이터 업데이트
                        if class_id not in timeline_data:
                            # 새로운 객체 추가
                            timeline_data[class_id] = {
                                "video_id": video_id,
                                "class": class_id,
                                "start_time": frame_index * frame_duration,
                                "end_time": frame_index * frame_duration,
                                "bboxes": [bbox],
                                "frames": [frame_index]
                            }
                            last_detected_frame[class_id] = frame_index
                        else:
                            # 기존 객체 업데이트
                            time_since_last_detected = frame_index - last_detected_frame[class_id]

                            if time_since_last_detected > 10:  # 10 프레임 이상 공백 시 새 문서로 저장
                                timeline_collection = db['Timeline']
                                timeline_collection.insert_one(timeline_data[class_id])
                                print(f"Saved document for class {class_id} with end_time: {timeline_data[class_id]['end_time']}")

                                # 새 문서 시작
                                timeline_data[class_id] = {
                                    "video_id": video_id,
                                    "class": class_id,
                                    "start_time": frame_index * frame_duration,
                                    "end_time": frame_index * frame_duration,
                                    "bboxes": [bbox],
                                    "frames": [frame_index]
                                }
                            else:
                                # 연속 탐지인 경우 데이터 업데이트
                                timeline_data[class_id]["end_time"] = frame_index * frame_duration
                                timeline_data[class_id]["bboxes"].append(bbox)
                                timeline_data[class_id]["frames"].append(frame_index)

                            # 마지막 탐지 프레임 업데이트
                            last_detected_frame[class_id] = frame_index

                        # 바운딩 박스와 텍스트 추가
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(frame, f'Class: {class_id}, Conf: {confidence:.2f}',
                                    (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

                print(f"Frame {frame_index}: {len(detections)} objects detected")
                detected_frames.append(frame)
                frame_index += 1
            except Exception as e:
                print(f"Error during YOLO detection on frame {frame_index}: {e}")

        if not detected_frames:
            return jsonify({'error': 'No frames processed'}), 500

        print(f"Total frames processed: {frame_index}")

        # Step 5: 남아 있는 Timeline 데이터를 MongoDB에 저장
        timeline_collection = db['Timeline']
        for class_id, data in timeline_data.items():
            try:
                timeline_collection.insert_one(data)
                print(f"Saved remaining document for class {class_id}")
            except Exception as e:
                print(f"Error saving timeline data for class {class_id}: {e}")

        # Step 6: 탐지된 비디오 저장
        output_video_path = tempfile.mktemp(suffix='.mp4')
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        height, width, _ = detected_frames[0].shape
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

        for frame in detected_frames:
            out.write(frame)
        out.release()
        print(f"Detected video saved at: {output_video_path}")

        # 탐지된 비디오를 Base64로 인코딩하여 저장
        with open(output_video_path, 'rb') as detected_video_file:
            detected_video_data = base64.b64encode(detected_video_file.read()).decode('utf-8')
        detected_video_id = detected_videos_collection.insert_one({
            'filename': 'detected_video.mp4',
            'content_type': 'video/mp4',
            'video_data': detected_video_data,
            'raw_video': video_id
        }).inserted_id

        print(f"Detected video saved to MongoDB with ID: {detected_video_id}")
        return jsonify({'detected_video_id': str(detected_video_id)}), 200

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500


@app.route('/flask-api/get_video', methods=['GET'])
def get_video():
    try:
        # 요청에서 video_id 가져오기
        video_id = request.args.get('video_id')
        print(f"Received video_id for fetching: {video_id}")

        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        # MongoDB에서 비디오 파일 조회
        video_document = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video_document:
            return jsonify({'error': 'Video not found'}), 404

        print(f"Video file fetched successfully: {video_document['filename']}")

        # Base64 디코딩하여 비디오 파일로 반환
        video_data = base64.b64decode(video_document['video_data'])
        temp_video_path = tempfile.mktemp(suffix='.mp4')
        with open(temp_video_path, 'wb') as temp_video:
            temp_video.write(video_data)

        return send_file(temp_video_path, download_name=video_document['filename'], as_attachment=True, mimetype='video/mp4')

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500
    
@app.route('/')
def index():
    return "Flask server is running"


@app.route('/flask-api/get_video', methods=['GET'])
def get_video():
    try:
        # 요청에서 video_id 가져오기
        video_id = request.args.get('video_id')
        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        # MongoDB에서 비디오 문서 조회
        video_document = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video_document:
            return jsonify({'error': 'Video not found'}), 404
        '''
        # 파일 경로 가져오기
        file_path = video_document['file_path']

        # 파일이 존재하는지 확인
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found on server'}), 404

        # 파일을 클라이언트로 전송
        return send_file(file_path, download_name=video_document['filename'], as_attachment=True, mimetype=video_document['content_type'])
'''
        return send_file(video_document['file_path'], download_name=video_document['filename'], as_attachment=True, mimetype='video/mp4')


    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)


'''
영상업로드는 되는데 재생이 안됨
from flask import Flask, request, jsonify, send_file
import torch
import cv2
import numpy as np
from pymongo import MongoClient
from bson import ObjectId
import tempfile
import base64
from ultralytics import YOLO
from flask_cors import CORS  # 추가


app = Flask(__name__)
CORS(app)  # 모든 출처에 대해 CORS 허용

# MongoDB Atlas 연결
uri = "mongodb+srv://capstone:rkdqkrchlghd@cluster0.l6abg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Create a new client and connect to the server
client = MongoClient(uri, tls=True, tlsAllowInvalidCertificates=True)

try:
    client.admin.command('ping')
    print("Pinged your deployment. Successfully connected to MongoDB!")
except Exception as e:
    print(f"MongoDB connection error: {e}")

# MongoDB setup
db = client['cap']
videos_collection = db['videos']  # videos 컬렉션 사용
detected_videos_collection = db['detected_videos']

# Load YOLO model
yolo_model = YOLO('yolo_capstone_model.pt')
yolo_model.overrides['data'] = None  # Disable default dataset loading
yolo_model.fuse()  # Fusing layers to improve inference performance

app = Flask(__name__)


@app.route('/flask-api/upload_video', methods=['POST'])
def upload_video():
    try:
        # 비디오 파일 받기
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        video_data = file.read()

        # Base64로 인코딩하여 MongoDB에 저장
        encoded_video = base64.b64encode(video_data).decode('utf-8')
        video_document = {
            'filename': file.filename,
            'content_type': file.content_type,
            'video_data': encoded_video
        }
        video_id = videos_collection.insert_one(video_document).inserted_id

        print(f"Uploaded video saved with ID: {video_id}")
        return jsonify({'video_id': str(video_id)}), 201

    except Exception as e:
        print(f"Error uploading video: {e}")
        return jsonify({'error': f'Error uploading video: {e}'}), 500
    
    
@app.route('/flask-api/detect_objects', methods=['POST'])
def detect_objects():
    try:
        # Step 1: video_id 확인
        video_id = request.json.get('_id')
        print(f"Received video_id: {video_id}")

        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        # Step 2: MongoDB에서 비디오 파일 가져오기
        video_document = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video_document:
            return jsonify({'error': 'Video not found'}), 404

        print(f"Video file fetched successfully: {video_document['filename']}")

        # Base64 디코딩하여 임시 파일로 저장
        video_data = base64.b64decode(video_document['video_data'])
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
            temp_video.write(video_data)
            temp_video_path = temp_video.name

        print(f"Temporary video saved at: {temp_video_path}")

        video = cv2.VideoCapture(temp_video_path)
        if not video.isOpened():
            return jsonify({'error': 'Failed to open video file'}), 500

        print("Video opened successfully")

        # Step 4: YOLO 모델로 객체 탐지
        detected_frames = []
        fps = video.get(cv2.CAP_PROP_FPS)
        print(f"Video FPS: {fps}")

        frame_index = 0
        frame_duration = 1 / fps  # 각 프레임의 시간 간격
        timeline_data = {}  # 객체 ID별로 Timeline 데이터 저장
        last_detected_frame = {}  # 마지막으로 탐지된 프레임 인덱스 저장

        while True:
            ret, frame = video.read()
            if not ret:
                print("End of video reached")
                break

            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = yolo_model.predict(rgb_frame, verbose=False)
                detections = results[0].boxes

                if len(detections) > 0:
                    for i in range(len(detections)):
                        # 바운딩 박스 좌표
                        x1, y1, x2, y2 = map(int, detections.xyxy[i].tolist())
                        # 신뢰도
                        confidence = float(detections.conf[i])
                        # 클래스 ID
                        class_id = int(detections.cls[i])
                        bbox = [x1, y1, x2, y2]

                        # 타임라인 데이터 업데이트
                        if class_id not in timeline_data:
                            # 새로운 객체 추가
                            timeline_data[class_id] = {
                                "video_id": video_id,
                                "class": class_id,
                                "start_time": frame_index * frame_duration,
                                "end_time": frame_index * frame_duration,
                                "bboxes": [bbox],
                                "frames": [frame_index]
                            }
                            last_detected_frame[class_id] = frame_index
                        else:
                            # 기존 객체 업데이트
                            time_since_last_detected = frame_index - last_detected_frame[class_id]

                            if time_since_last_detected > 10:  # 10 프레임 이상 공백 시 새 문서로 저장
                                timeline_collection = db['Timeline']
                                timeline_collection.insert_one(timeline_data[class_id])
                                print(f"Saved document for class {class_id} with end_time: {timeline_data[class_id]['end_time']}")

                                # 새 문서 시작
                                timeline_data[class_id] = {
                                    "video_id": video_id,
                                    "class": class_id,
                                    "start_time": frame_index * frame_duration,
                                    "end_time": frame_index * frame_duration,
                                    "bboxes": [bbox],
                                    "frames": [frame_index]
                                }
                            else:
                                # 연속 탐지인 경우 데이터 업데이트
                                timeline_data[class_id]["end_time"] = frame_index * frame_duration
                                timeline_data[class_id]["bboxes"].append(bbox)
                                timeline_data[class_id]["frames"].append(frame_index)

                            # 마지막 탐지 프레임 업데이트
                            last_detected_frame[class_id] = frame_index

                        # 바운딩 박스와 텍스트 추가
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(frame, f'Class: {class_id}, Conf: {confidence:.2f}',
                                    (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

                print(f"Frame {frame_index}: {len(detections)} objects detected")
                detected_frames.append(frame)
                frame_index += 1
            except Exception as e:
                print(f"Error during YOLO detection on frame {frame_index}: {e}")

        if not detected_frames:
            return jsonify({'error': 'No frames processed'}), 500

        print(f"Total frames processed: {frame_index}")

        # Step 5: 남아 있는 Timeline 데이터를 MongoDB에 저장
        timeline_collection = db['Timeline']
        for class_id, data in timeline_data.items():
            try:
                timeline_collection.insert_one(data)
                print(f"Saved remaining document for class {class_id}")
            except Exception as e:
                print(f"Error saving timeline data for class {class_id}: {e}")

        # Step 6: 탐지된 비디오 저장
        output_video_path = tempfile.mktemp(suffix='.mp4')
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        height, width, _ = detected_frames[0].shape
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

        for frame in detected_frames:
            out.write(frame)
        out.release()
        print(f"Detected video saved at: {output_video_path}")

        # 탐지된 비디오를 Base64로 인코딩하여 저장
        with open(output_video_path, 'rb') as detected_video_file:
            detected_video_data = base64.b64encode(detected_video_file.read()).decode('utf-8')
        detected_video_id = detected_videos_collection.insert_one({
            'filename': 'detected_video.mp4',
            'content_type': 'video/mp4',
            'video_data': detected_video_data,
            'raw_video': video_id
        }).inserted_id

        print(f"Detected video saved to MongoDB with ID: {detected_video_id}")
        return jsonify({'detected_video_id': str(detected_video_id)}), 200

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500




@app.route('/flask-api/get_video', methods=['GET'])
def get_video():
    try:
        # 요청에서 video_id 가져오기
        video_id = request.args.get('video_id')
        print(f"Received video_id for fetching: {video_id}")

        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        # MongoDB에서 비디오 파일 조회
        video_document = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video_document:
            return jsonify({'error': 'Video not found'}), 404

        print(f"Video file fetched successfully: {video_document['filename']}")

        # Base64 디코딩하여 비디오 파일로 반환
        video_data = base64.b64decode(video_document['video_data'])
        temp_video_path = tempfile.mktemp(suffix='.mp4')
        with open(temp_video_path, 'wb') as temp_video:
            temp_video.write(video_data)

        return send_file(temp_video_path, download_name=video_document['filename'], as_attachment=True, mimetype='video/mp4')

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500
    
@app.route('/')
def index():
    return "Flask server is running"


@app.route('/flask-api/get_detected_video', methods=['GET'])
def get_detected_video():
    try:
        # 요청에서 video_id 가져오기
        video_id = request.args.get('video_id')
        print(f"Received video_id for fetching: {video_id}")

        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        # MongoDB에서 비디오 파일 조회
        detected_video_document = detected_videos_collection.find_one({'_id': ObjectId(video_id)})
        if not detected_video_document:
            return jsonify({'error': 'Video not found'}), 404

        print(f"Detected video file fetched successfully: {detected_video_document['filename']}")

        # MongoDB에서 타임라인 정보 조회
        timeline_data = list(db['Timeline'].find({'video_id': str(video_id)}))
        for item in timeline_data:
            item['_id'] = str(item['_id'])  # ObjectId를 문자열로 변환


        # Base64 디코딩하여 비디오 파일로 반환
        video_data = base64.b64decode(detected_video_document['video_data'])
        temp_video_path = tempfile.mktemp(suffix='.mp4')
        with open(temp_video_path, 'wb') as temp_video:
            temp_video.write(video_data)

        response = {
            'filename': detected_video_document['filename'],
            'content_type': detected_video_document['content_type'],
            'timeline': timeline_data
        }

        return send_file(temp_video_path, download_name=detected_video_document['filename'], as_attachment=True, mimetype='video/mp4')

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500



if __name__ == '__main__':
    app.run(debug=True, port=5001)

'''
