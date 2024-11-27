const mongoose = require('mongoose');
const Schema = mongoose.Schema

// Detected Object Schema
const detectedObjectSchema = new mongoose.Schema({
  bounding_box: {
    type: String, // JSON 형식의 문자열로 저장하거나 Object로 변경 가능
    required: true
  },
  type: {
    type: String,
    required: true
  },
  time: {
    type: Number
  }
});

// Timeline Schema
const timelineSchema = new mongoose.Schema({
//   timeline_id: {
//     type: Schema.Types.ObjectId,
//     unique: true,
//     auto: true, // ObjectId 자동 생성
//   },
  video_id: {
    type: Schema.Types.ObjectId,
    ref: 'Video', // video 컬렉션 참조
  },
  start_time: {
    type: Number,
  },
  end_time: {
    type: Number,
  },
  detected_object: {
    type: [detectedObjectSchema], // detectedObjectSchema 배열
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