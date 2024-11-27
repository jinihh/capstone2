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



@app.route('/flask-api/upload_video', methods=['POST'])
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
        # Step 1: 요청에서 video_id 가져오기
        video_id = request.json.get('video_id')
        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        # MongoDB에서 비디오 경로 가져오기
        video_document = videos_collection.find_one({'_id': ObjectId(video_id)})
        if not video_document:
            return jsonify({'error': 'Video not found'}), 404

        video_path = video_document['file_path']
        print(f"Processing video from path: {video_path}")

        # 비디오 읽기
        video = cv2.VideoCapture(video_path)
        if not video.isOpened():
            return jsonify({'error': 'Failed to open video file'}), 500

        # 비디오 기본 정보 가져오기
        fps = video.get(cv2.CAP_PROP_FPS)
        frame_duration = 1 / fps
        width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')

        # 출력 비디오 경로 설정
        output_video_path = os.path.join(DETECTED_FOLDER, f"detected_{video_document['filename']}")
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

        # Step 2: 객체 탐지 결과 처리
        timeline_data = {}
        last_detected_frame = {}
        frame_index = 0

        while True:
            ret, frame = video.read()
            if not ret:
                print("End of video reached")
                break

            # YOLO 모델로 객체 탐지
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = yolo_model.predict(rgb_frame, verbose=False)
            detections = results[0].boxes

            # 객체 탐지 결과 처리
            for i in range(len(detections)):
                x1, y1, x2, y2 = map(int, detections.xyxy[i].tolist())
                class_id = int(detections.cls[i])
                confidence = float(detections.conf[i])
                bbox = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}

                # Timeline 데이터 생성 또는 업데이트
                if class_id not in timeline_data:
                    # 새로운 객체 추가
                    timeline_data[class_id] = {
                        "video_id": ObjectId(video_id),
                        "start_time": frame_index * frame_duration,
                        "end_time": frame_index * frame_duration,
                        "detected_object": [{
                            "bounding_box": bbox,
                            "frames": frame_index,
                            "type": f"Class_{class_id}",
                            "time": frame_index * frame_duration
                        }]
                    }
                    last_detected_frame[class_id] = frame_index
                else:
                    # 기존 객체 업데이트
                    time_diff = frame_index - last_detected_frame[class_id]
                    if time_diff > 10:  # 프레임 간 간격이 10 이상이면 새로운 타임라인 생성
                        timeline_collection.insert_one(timeline_data[class_id])
                        timeline_data[class_id] = {
                            "video_id": ObjectId(video_id),
                            "start_time": frame_index * frame_duration,
                            "end_time": frame_index * frame_duration,
                            "detected_object": [{
                                "bounding_box": bbox,
                                "frames": frame_index,
                                "type": f"Class_{class_id}",
                                "time": frame_index * frame_duration
                            }]
                        }
                    else:
                        # 타임라인 업데이트
                        timeline_data[class_id]["end_time"] = frame_index * frame_duration
                        timeline_data[class_id]["detected_object"].append({
                            "bounding_box": bbox,
                            "frames": frame_index,
                            "type": f"Class_{class_id}",
                            "time": frame_index * frame_duration
                        })

                    last_detected_frame[class_id] = frame_index

                # 바운딩 박스와 클래스 ID 표시
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"Class: {class_id}, Conf: {confidence:.2f}",
                            (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

            out.write(frame)  # 탐지 결과 프레임을 출력 비디오에 저장
            frame_index += 1

        # Step 3: 마지막 Timeline 데이터 저장
        for class_id, data in timeline_data.items():
            timeline_collection.insert_one(data)

        video.release()
        out.release()
        print(f"Output video saved at: {output_video_path}")

        # Step 4: MongoDB에 탐지된 비디오 정보 저장
        detected_video_id = detected_videos_collection.insert_one({
            'filename': f"detected_{video_document['filename']}",
            'file_path': output_video_path,
            'content_type': 'video/mp4',
            'original_video_id': ObjectId(video_id)
        }).inserted_id

        return jsonify({
            'detected_video_id': str(detected_video_id),
            'detected_video_url': output_video_path
        }), 200

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500



@app.route('/flask-api/get_video/<video_id>', methods=['GET'])
def get_video(video_id):
    """
    저장된 영상을 반환하는 API
    :param video_id: MongoDB에 저장된 video_id
    :return: 비디오 파일
    """
    try:
        # video_id로 비디오 데이터 조회
        video_document = detected_videos_collection.find_one({'original_video_id': ObjectId(video_id)})
        if not video_document:
            return jsonify({'error': 'Video not found'}), 404

        video_path = video_document.get('file_path')
        if not os.path.exists(video_path):
            return jsonify({'error': 'Video file not found on server'}), 404

        # 비디오 파일 전송
        return send_file(video_path, mimetype='video/mp4', as_attachment=True)

    except Exception as e:
        print(f"Error fetching video: {e}")
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


@app.route('/flask-api/get_timeline/<video_id>', methods=['GET'])
def get_timeline(video_id):
    """
    특정 비디오의 타임라인 정보를 반환하는 API
    :param video_id: MongoDB에 저장된 video_id
    :return: 타임라인 정보 JSON
    """
    try:
        # video_id에 해당하는 타임라인 정보 조회
        timelines = list(timeline_collection.find({'video_id': ObjectId(video_id)}))
        if not timelines:
            return jsonify({'error': 'No timeline data found for this video'}), 404

        # ObjectId를 문자열로 변환하여 반환
        result = []
        for timeline in timelines:
            timeline['_id'] = str(timeline['_id'])
            timeline['video_id'] = str(timeline['video_id'])
            for detected_object in timeline['detected_object']:
                if isinstance(detected_object, dict) and '_id' in detected_object:
                    detected_object['_id'] = str(detected_object['_id'])
            result.append(timeline)

        return jsonify(result), 200

    except Exception as e:
        print(f"Error fetching timeline: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
