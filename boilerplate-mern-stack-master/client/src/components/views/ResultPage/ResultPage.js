import React, { useEffect, useState } from 'react'
import { List, Avatar, Row, Col, Button, Slider } from 'antd';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

function ResultPage(props) {
    const videoId = props.match.params.videoId
    const [videoUrl, setVideoUrl] = useState(''); // 동영상 재생 URL 상태
    const [videoName, setVideoName] = useState(''); // 동영상 파일 이름 상태
    
    //const [Video, setVideo] = useState([])
    //const [CommentLists, setCommentLists] = useState([])

    //비디오 가져오기위해 비디오 아이디 알아야 -> 변수생성
    const videoVariable = {
        videoId: videoId
    }

    //랜딩페이지에서 눌렀을 때 페이지 넘어가고 해당 동영상 보이게
    //몽고디비에서 동영상 꺼내기
    /*
    useEffect(() => {
        axios.post('/api/video/getVideo', videoVariable)
            .then(response => {
                if (response.data.success) {
                    console.log(response.data.video)
                    setVideo(response.data.video)
                } else {
                    alert('Failed to get video Info')
                }
            })
    }, [])
*/
/*
    // "Save" 버튼 클릭 시 동영상을 로컬 기기에 저장
    const handleSaveVideo = () => {
      const link = document.createElement('a'); // <a> 태그 생성
      link.href = videoUrl; // Blob URL을 href로 설정
      link.download = videoName; // 다운로드될 파일 이름 설정
      document.body.appendChild(link); // <a> 태그를 DOM에 추가
      link.click(); // 클릭 이벤트 트리거
      document.body.removeChild(link); // <a> 태그를 DOM에서 제거
    };
*/
    return (
      <div style={{ padding: '2rem' }}>
          <h1>Result Page</h1>
          {videoUrl ? ( // 동영상 URL이 로드되었는지 확인
              <div>
                  {/* 동영상 재생 */}
                  <video
                      controls
                      style={{ width: '100%', maxWidth: '800px' }}
                      src={videoUrl} // 동영상 Blob URL
                  ></video>
                  <div style={{ marginTop: '20px' }}>
                      {/* 저장 버튼 */}
                      <Button
                          type="primary"
                          onClick//=</div>={handleSaveVideo} // 저장 핸들러
                          style={{ padding: '10px 20px', fontSize: '16px' }}
                      >
                          Save Video
                      </Button>
                  </div>
              </div>
          ) : (
              <p>Loading video...</p> // 동영상이 로드되지 않았을 때 표시
          )}
      </div>
  );

}

export default ResultPage
