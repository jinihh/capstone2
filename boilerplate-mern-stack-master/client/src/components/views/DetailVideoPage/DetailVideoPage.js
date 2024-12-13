import React, { useEffect, useState } from 'react';
import { List, Avatar, Row, Col, Button, Slider, Table } from 'antd';
import axios from 'axios';

function DetailVideoPage(props) {
    const [Video, setVideo] = useState({});
    const [Timeline, setTimeline] = useState([]);
    const videoId = props.match.params.videoId;
    const isDetectedVideo = props.match.path.includes('detected');
    const [level, setLevel] = useState(1); // 초기 레벨을 1로 설정


    useEffect(() => {
        // 비디오 및 타임라인 데이터를 가져오는 API 호출
        console.log('videoId:', videoId); // videoId 확인
        axios.get(`/flask-api/get_detected_video?video_id=${videoId}`)
            .then(response => {
                if (response.status === 200 && response.data.success) {
                    console.log('API Response:', response.data);
                    setVideo(response.data.detected_video_path);
                    setTimeline(response.data.timeline);
                } else {
                    console.error('Failed to fetch detected video and timeline data:', response.data);
                    alert('Failed to get detected video Info');
                }
            })
            .catch(err => {
                console.error('Error fetching detected video:', err);
            });
    }, [videoId]);


    // 레벨 변경 핸들러
    const handleLevelChange = (value) => {
        setLevel(value);
    }
    
        // 버튼 클릭 시 다른 페이지로 이동
    const handleButtonClick = () => {
        props.history.push(`/video/result/${videoId}`);
    }

    // 타임라인 테이블 컬럼 정의
    const columns = [
        {
            title: 'Start Time',
            dataIndex: 'start_time',
            key: 'start_time',
            render: text => `${text.toFixed(2)} s`
        },
        {
            title: 'End Time',
            dataIndex: 'end_time',
            key: 'end_time',
            render: text => `${text.toFixed(2)} s`
        },
        {
            title: 'Detected Objects',
            dataIndex: 'class',
            key: 'class',
        }
    ];

    if (!Video || Object.keys(Video).length === 0) {
        return <div>Loading...</div>;
    }


    return (
        <Row>
            <Col lg={18} xs={24}>
                <div className="postPage" style={{ width: '100%', padding: '3rem 4em' }}>
                    {/* 비디오 파일 경로를 사용하여 비디오 재생 */}
                    <video style={{ width: '100%' }} src={`http://localhost:5000/${Video.filePath}`} controls></video>

                    {/* 비디오 길이 표시 */}
                    {Video.duration && (
                        <p>Duration: {Number(Video.duration).toFixed(2)} seconds</p>
                    )}

                    {/* 타임라인 정보 렌더링 */}
                    <div style={{ marginTop: '20px' }}>
                        <h3>Timeline Data</h3>
                        <Table columns={columns} dataSource={Timeline} rowKey="_id" />
                    </div>

                    {/* 버튼 */}
                    <div style={{ marginTop: '20px' }}>
                        <Button type="primary">
                            Bluring
                        </Button>
                    </div>
                </div>
            </Col>
            <Col lg={6} xs={24}></Col>
        </Row>
    )
}

export default DetailVideoPage;
