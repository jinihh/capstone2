// const express = require('express');
// const router = express.Router();
// const Timeline = require('../models/Timeline');
// const BlurInfo = require('../models/Blur_info');
// const ResultVideo = require('../models/ResultVideo');
// const applyGaussianBlur = require('../utils/blurProcessor.js'); // 블러 처리 함수
// const path = require('path');

// router.post('/applyBlur', async (req, res) => {
//     try {
//         const { videoId, blurInfoId } = req.body;

//         // BlurInfo와 Timeline 정보 가져오기
//         const blurInfo = await BlurInfo.findById(blurInfoId);
//         const timelines = await Timeline.find({ video_id: videoId });

//         if (!blurInfo || timelines.length === 0) {
//             return res.status(400).json({ success: false, message: 'BlurInfo나 Timeline 정보를 찾을 수 없습니다.' });
//         }

//         // 가우시안 블러 처리
//         const originalVideoPath = path.resolve(`uploads/videos/${videoId}.mp4`);
//         const resultVideoPath = `uploads/processed_videos/${videoId}_blurred_${Date.now()}.mp4`;

//         const processingResult = await applyGaussianBlur(originalVideoPath, resultVideoPath, timelines, blurInfo.scale);

//         if (!processingResult.success) {
//             return res.status(500).json({ success: false, message: '비디오 처리에 실패했습니다.', error: processingResult.error });
//         }

//         // ResultVideo 저장
//         const resultVideo = new ResultVideo({
//             original_video: videoId,
//             blur_info: blurInfoId,
//             result_path: resultVideoPath,
//         });

//         await resultVideo.save();

//         res.status(200).json({ success: true, resultVideo });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, error });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const Timeline = require('../models/Timeline');
const BlurInfo = require('../models/Blur_info');
const ResultVideo = require('../models/ResultVideo');
const applyGaussianBlur = require('../utils/blurProcessor.js'); // 블러 처리 유틸 함수
const path = require('path');

router.post('/applyBlur', async (req, res) => {
    try {
        const { videoId, blurInfoId } = req.body;

        // BlurInfo와 Timeline 데이터 가져오기
        const blurInfo = await BlurInfo.findById(blurInfoId);
        const timelines = await Timeline.find({ video_id: videoId });

        if (!blurInfo) {
            return res.status(404).json({ 
                success: false, 
                message: 'BlurInfo를 찾을 수 없습니다.' 
            });
        }

        if (timelines.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Timeline 데이터를 찾을 수 없습니다.' 
            });
        }

        // 파일 경로 설정
        const originalVideoPath = path.resolve(`uploads/videos/${videoId}.mp4`);
        const resultVideoPath = `uploads/processed_videos/${videoId}_blurred_${Date.now()}.mp4`;

        // 블러 처리 함수 호출
        const processingResult = await applyGaussianBlur(originalVideoPath, resultVideoPath, timelines, blurInfo.scale);

        if (!processingResult.success) {
            return res.status(500).json({
                success: false,
                message: '비디오 처리 중 오류가 발생했습니다.',
                error: processingResult.error
            });
        }

        // 처리 결과를 DB에 저장
        const resultVideo = new ResultVideo({
            original_video: videoId,
            blur_info: blurInfoId,
            result_path: resultVideoPath,
        });

        await resultVideo.save();

        // 성공 응답
        res.status(200).json({ 
            success: true, 
            resultVideo 
        });
    } catch (error) {
        console.error('Blur 처리 중 오류 발생:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '서버 오류가 발생했습니다.' 
        });
    }
});

module.exports = router;
