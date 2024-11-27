const mongoose = require('mongoose');
const Schema = mongoose.Schema

// Blur Info Schema
const blurInfoSchema = new mongoose.Schema({
  video_id: {
    type: Schema.Types.ObjectId,
    ref: 'Video', // video 컬렉션 참조
    required: true,
  },
  strength: {
    type: Number,
    required: true,
    min: [1, 'Strength must be at least 1'], // 최소값 유효성 검사
    max: [5, 'Strength must be at most 5'],  // 최대값 유효성 검사
  },
});

// 모델 생성
const BlurInfo = mongoose.model('BlurInfo', blurInfoSchema);

module.exports = { BlurInfo, Video };
