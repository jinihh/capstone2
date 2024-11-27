const express = require('express');
const router = express.Router();
const multer = require('multer');
var ffmpeg = require('fluent-ffmpeg');
const { Video } = require("../models/Video"); //만든 비디오 모델 임포트
const { auth } = require("../middleware/auth");


var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`)
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        if (ext !== '.mp4') {
            return cb(res.status(400).end('only jpg, png, mp4 is allowed'), false);
        }
        cb(null, true)
    }
})



var upload = multer({ 
    storage: storage,
}).single("file")



//=================================
//             User
//=================================


router.post("/uploadfiles", (req, res) => {

    upload(req, res, err => {
        if (err) {
            return res.json({ success: false, err })
        }
        return res.json({ success: true, filePath: res.req.file.path, fileName: res.req.file.filename })
    })

});

//비디오를 db에서 가져와서 클라이언트에 보낸다
router.get("/getVideos", (req, res) => {
    //비디오 컬렉션안에있는 모든 비디오 가져옴
    Video.find()
        .populate('writer')//writer의 모든 정보 가져옴, (user/video.js에서)   
        // writer: {
           // type:Schema.Types.ObjectId,
        .exec((err, videos) => {
            if(err) return res.status(400).send(err);
            res.status(200).json({ success: true, videos }) //videos :비디오 정보들 다 
        })

});

router.post("/getVideo", (req, res) => {

    //id이용해서 찾을거임, 클라이언트에서보낸 videoid를 넣어서 찾겠다.
    Video.findOne({ "_id" : req.body.videoId })
    //populate를 해줌으로 비디오 아이디 뿐만아니라 모든 정보 다 가져옴
    .populate('writer')
    .exec((err, video) => {
        if(err) return res.status(400).send(err);
        res.status(200).json({ success: true, video })
    })
});



router.post("/thumbnail", (req, res) => {

    let thumbsFilePath ="";
    let fileDuration ="";

    ffmpeg.ffprobe(req.body.filePath, function(err, metadata){
        console.dir(metadata);
        console.log(metadata.format.duration);

        fileDuration = metadata.format.duration;
    })


    ffmpeg(req.body.filePath)
        .on('filenames', function (filenames) {
            console.log('Will generate ' + filenames.join(', '))
            thumbsFilePath = "uploads/thumbnails/" + filenames[0];
        })
        .on('end', function () {
            console.log('Screenshots taken');
            return res.json({ success: true, thumbsFilePath: thumbsFilePath, fileDuration: fileDuration})
        })
        .screenshots({
            // Will take screens at 20%, 40%, 60% and 80% of the video
            count: 3,
            folder: 'uploads/thumbnails',
            size:'320x240',
            // %b input basename ( filename w/o extension )
            filename:'thumbnail-%b.png'
        });

});

router.post("/uploadVideo", (req, res) => {

    const video = new Video(req.body)
    //클라이언트에서 보낸 정보들 모두 담음
    //if) new Video(req,body.writer)만하면 writer정보만

    video.save((err, video) => { //몽고디비에 저장하도록
        if(err) return res.status(400).json({ success: false, err })
        return res.status(200).json({
            success: true,
            videoId: video._id
        })
    })

});

module.exports = router;
