from flask import Flask, request, jsonify, send_file
from pymongo import MongoClient
from bson import ObjectId
import os
import cv2
import numpy as np
from ultralytics import YOLO
from flask_cors import CORS  # 추가
import torch
import tempfile
import base64
import time

app = Flask(__name__)
CORS(app) 

# MongoDB Atlas 연결
uri = ""
client = MongoClient(uri)

try:
    client.admin.command('ping')
    print("Pinged your deployment. Successfully connected to MongoDB!")
except Exception as e:
    print(f"MongoDB connection error: {e}")

db = client['test']
videos_collection = db['videos']
detected_videos_collection = db['detected_videos']
timeline_collection = db['Timeline']

# Load YOLO model
yolo_model = YOLO('yolo_capstone_model.pt')
yolo_model.overrides['data'] = None  # Disable default dataset loading
yolo_model.fuse()  # Fusing layers to improve inference performance

@app.route('/flask-api/detect_objects', methods=['POST'])
def detect_objects():
    try:
        # 비디오 ID 가져오기
        video_id = request.json.get('video_id')
        print(f"Received video_id: {video_id}")
        if not video_id:
            return jsonify({'error': 'No video_id provided'}), 400

        try:
            video_object_id = ObjectId(video_id)
            print(f"[DEBUG] Converted video_id to ObjectId: {video_object_id}")
        except Exception as e:
            print(f"[ERROR] Failed to convert video_id to ObjectId: {e}")
            return jsonify({'error': f'Invalid video_id format: {e}'}), 400

        # MongoDB에서 비디오 정보 조회
        video_document = videos_collection.find_one({'_id': video_object_id})
        if not video_document:
            print(f"[ERROR] Video not found in MongoDB for ID: {video_object_id}")
            return jsonify({'error': 'Video not found'}), 404

        print(f"[DEBUG] Video document fetched successfully: {video_document}")

        # 파일 경로 가져오기
        raw_video_path = video_document.get('filePath', '')
        if not raw_video_path:
            print("[ERROR] filePath is missing in video document")
            return jsonify({'error': 'filePath is missing in video document'}), 404

        # 절대 경로 계산
        if os.path.isabs(raw_video_path):
            video_path = raw_video_path  # 이미 절대 경로인 경우 그대로 사용
        else:
            base_dir = os.path.abspath(os.path.join(os.getcwd(), "../uploads"))
            video_path = os.path.join(base_dir, raw_video_path)

        print(f"[DEBUG] Absolute video path: {video_path}")

        if not os.path.exists(video_path) or not os.path.isfile(video_path):
            print(f"[ERROR] Video file not found on server at path: {video_path}")
            return jsonify({'error': 'Video file not found on server'}), 404

        # 비디오 파일 열기
        video = cv2.VideoCapture(video_path)
        if not video.isOpened():
            print(f"[ERROR] Failed to open video file: {video_path}")
            return jsonify({'error': 'Failed to open video file'}), 500

        print(f"[DEBUG] Video file opened successfully: {video_path}")

        # 객체 탐지 시작 시간 기록
        detection_start_time = time.time()

        # YOLO 모델로 객체 탐지 수행 및 탐지된 프레임 생성
        detected_frames = []
        fps = video.get(cv2.CAP_PROP_FPS)
        frame_index = 0
        frame_duration = 1 / fps

        timeline_data = {}
        last_detected_frame = {}

        while True:
            ret, frame = video.read()
            if not ret:
                print("End of video reached")
                break

            try:
                if frame is None:
                    raise ValueError("Frame is None, skipping detection")
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = yolo_model.predict(rgb_frame, verbose=False)
                detections = results[0].boxes

                if len(detections) > 0:
                    for i in range(len(detections)):
                        x1, y1, x2, y2 = map(int, detections.xyxy[i].tolist())
                        confidence = float(detections.conf[i])
                        class_id = int(detections.cls[i])
                        bbox = [x1, y1, x2, y2]

                        # 타임라인 데이터 업데이트
                        if class_id not in timeline_data:
                            timeline_data[class_id] = {
                                "video_id": video_id,
                                "class": class_id,
                                "start_time": frame_index * frame_duration,
                                "end_time": (frame_index + 1) * frame_duration,
                                "bboxes": [bbox],
                                "frames": [frame_index]
                            }
                            last_detected_frame[class_id] = frame_index

                        else:
                            time_since_last_detected = frame_index - last_detected_frame[class_id]

                            if time_since_last_detected > 10:
                                timeline_collection = db['Timeline']
                                timeline_collection.insert_one(timeline_data[class_id])

                                timeline_data[class_id] = {
                                    "video_id": video_id,
                                    "class": class_id,
                                    "start_time": frame_index * frame_duration,
                                    "end_time": frame_index * frame_duration,
                                    "bboxes": [bbox],
                                    "frames": [frame_index]
                                }
                            else:
                                timeline_data[class_id]["end_time"] = frame_index * frame_duration
                                timeline_data[class_id]["bboxes"].append(bbox)
                                timeline_data[class_id]["frames"].append(frame_index)

                            last_detected_frame[class_id] = frame_index

                detected_frames.append(frame)
                frame_index += 1
            except Exception as e:
                print(f"Error during YOLO detection on frame {frame_index}: {e}")

        detection_end_time = time.time()
        detection_duration = detection_end_time - detection_start_time
        print(f"[INFO] Object detection completed in {detection_duration:.2f} seconds.")

        # 탐지된 영상 저장
        detected_dir = os.path.abspath(os.path.join(os.getcwd(), "../uploads/detected"))
        os.makedirs(detected_dir, exist_ok=True)  # 디렉토리 생성
        output_video_path = os.path.join(detected_dir, f"{os.path.basename(video_path)}")
        print(f"[DEBUG] Absolute detected video path: {output_video_path}")

        try:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            height, width, _ = detected_frames[0].shape
            out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

            for frame in detected_frames:
                out.write(frame)
            out.release()

            print(f"[INFO] Detected video file saved successfully: {output_video_path}")
        except Exception as e:
            print(f"[ERROR] Failed to save detected video: {e}")
            return jsonify({'error': 'Failed to save detected video'}), 500

        # MongoDB에 탐지된 영상 경로 저장
        detected_videos_collection.insert_one({
            'filename': os.path.basename(output_video_path),
            'file_path': os.path.relpath(output_video_path, os.getcwd()),
            'raw_video': video_id
        })

        print("[INFO] Object detection completed successfully.")
        return jsonify({'success': True, 'message': 'Object detection completed successfully'}), 200

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/flask-api/get_detected_video', methods=['GET'])
def get_detected_video():
    try:
        # 요청에서 video_id 가져오기
        video_id = request.args.get('video_id')
        if not video_id:
            print("[ERROR] No video_id provided in request")
            return jsonify({'error': 'No video_id provided'}), 400

        print(f"[DEBUG] Received video_id: {video_id}")

        # MongoDB에서 탐지된 비디오 정보 조회
        detected_video_document = detected_videos_collection.find_one({'raw_video': video_id})
        if not detected_video_document:
            print(f"[ERROR] Detected video not found for raw_video ID: {video_id}")
            return jsonify({'error': 'Detected video not found'}), 404
        print(f"[DEBUG] Detected video document: {detected_video_document}")

        # 경로 정규화 및 절대 경로로 변환
        raw_detected_video_path = detected_video_document.get('file_path', '')
        if not raw_detected_video_path:
            print("[ERROR] file_path is missing in detected video document")
            return jsonify({'error': 'file_path is missing in detected video document'}), 404

        # uploads 폴더의 절대 경로를 설정
        uploads_dir = os.path.abspath(os.path.join(os.getcwd(), "../uploads"))
        if raw_detected_video_path.startswith("uploads"):
            detected_video_path = os.path.abspath(os.path.join(os.getcwd(), "..", raw_detected_video_path))
        else:
            detected_video_path = os.path.join(uploads_dir, raw_detected_video_path)
        print(f"[DEBUG] Absolute detected video path: {detected_video_path}")

        if not os.path.exists(detected_video_path):
            print(f"[ERROR] Detected video file not found on server: {detected_video_path}")
            return jsonify({'error': 'Detected video file not found on server'}), 404


        # MongoDB에서 타임라인 정보 가져오기
        timeline_data = list(timeline_collection.find({'video_id': video_id}, {'_id': 0}))  # '_id' 제외
        if not timeline_data:
            print(f"[ERROR] No timeline data found for video_id: {video_id}")
            return jsonify({'error': 'No timeline data found'}), 404
        
        print(f"[DEBUG] Timeline data fetched: {timeline_data}")
        
        '''
        # 비디오 파일을 서버에서 가져와서 클라이언트로 반환
        #video_response = send_file(detected_video_path, download_name=detected_video_document['filename'], as_attachment=True, mimetype='video/mp4')

        # 응답 데이터에 타임라인 정보 추가
        video_response.headers['Content-Type'] = 'application/json'
        video_response.direct_passthrough = False
        video_response.data = jsonify({
            'success': True,
            'timeline': timeline_data,
            'detected_video_path': detected_video_path
        }).get_data()
'''
        # JSON 응답 생성
        response_data = {
            'success': True,
            'timeline': timeline_data,
            'detected_video_path': f"http://localhost:5001/{detected_video_path.replace(os.sep, '/')}",
        }

        # 비디오 파일과 타임라인 정보 반환
        print(f"[INFO] Preparing response with detected video and timeline data")
        print(f"[DEBUG] Response data: {response_data}")

        return jsonify(response_data), 200
    
        # 비디오 파일과 타임라인 정보 반환
        #return send_file(detected_video_path, as_attachment=True, mimetype='video/mp4')

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': f'Unexpected error: {e}'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001)

