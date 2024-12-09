
const express = require('express');
const router = express.Router();
const { BlurInfo } = require('../models/BlurInfo');

// BlurInfo 저장 API
router.post('/saveBlurInfo', async (req, res) => {
  try {
    const { videoId, strength } = req.body;

    // 새로운 BlurInfo 생성
    const newBlurInfo = new BlurInfo({
      video_id: videoId,
      strength: strength
    });

    // BlurInfo 저장
    await newBlurInfo.save();

    res.status(200).json({ success: true, blurInfoId: newBlurInfo._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// BlurInfo 조회 API (GET 방식)
router.get('/getBlurInfo', async (req, res) => {
  try {
    const { videoId } = req.query; // URL 쿼리 파라미터로 videoId 받기

    // videoId에 해당하는 BlurInfo 조회
    const blurInfo = await BlurInfo.findOne({ video_id: videoId });

    if (!blurInfo) {
      return res.status(404).json({ success: false, message: 'BlurInfo not found for this video.' });
    }

    res.status(200).json({ success: true, blurInfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
