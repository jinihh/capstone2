const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Detected Object Schema (프레임별 bounding_box 추가)
const detectedObjectSchema = new mongoose.Schema({
  bounding_box: [
    {
      frame: {
        type: Number, // 프레임 번호
        required: true,
      },
      box: {
        type: String, // x,y,width,height 형태로 저장
        required: true,
      },
    },
  ],
  type: { // 탐지한 객체의 유형 (예: 사람, 차량)
    type: String,
    required: true,
  },
});

// Timeline Schema
const timelineSchema = new mongoose.Schema({
  video_id: {
    type: Schema.Types.ObjectId,
    ref: 'Video', // Video 컬렉션 참조
    required: true,
  },
  start_time: {
    type: Number, // 타임라인 시작 시간 (초)
    required: true,
  },
  end_time: {
    type: Number, // 타임라인 종료 시간 (초)
    required: true,
  },
  detected_object: {
    type: [detectedObjectSchema], // Detected Object 배열
    default: [],
  },
});


// 모델 생성
const DetectedObject = mongoose.model('DetectedObject', detectedObjectSchema);
const Timeline = mongoose.model('Timeline', timelineSchema);

module.exports = {
    DetectedObject,
    Timeline
  };
