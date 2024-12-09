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

/*
import React, { useEffect, useState } from 'react'
import { List, Avatar, Row, Col, Button, Slider, Table } from 'antd';
import axios from 'axios';

function DetailVideoPage(props) {

    const [Video, setVideo] = useState([])
    const [level, setLevel] = useState(1); // 초기 레벨을 1로 설정
    const [Timeline, setTimeline] = useState([]);
    const videoId = props.match.params.videoId;
    const isDetectedVideo = props.match.path.includes('detected');

    useEffect(() => {
        const videoVariable = {
            videoId: videoId
        }

        // 비디오 정보 가져오기
        axios.post('/api/video/getVideo', videoVariable)
            .then(response => {
                if (response.data.success) {
                    console.log(response.data.video)
                    setVideo(response.data.video)
                } else {
                    alert('Failed to get video Info')
                }
            })

        // 타임라인 데이터 가져오기
        axios.post('/api/timeline/getTimeline', videoVariable)
            .then(response => {
                if (response.data.success) {
                    console.log(response.data.timeline);
                    setTimeline(response.data.timeline);
                } else {
                    alert('Failed to get timeline data');
                }
            });

    }, [videoId])

    // 레벨 변경 핸들러
    const handleLevelChange = (value) => {
        setLevel(value);
    }

    // 버튼 클릭 시 다른 페이지로 이동
    const handleButtonClick = () => {
        props.history.push(`/video/result/${videoId}`);
    }

    // 테이블 컬럼 정의 (Ant Design Table)
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
            render: (text) => `Class ${text}`
        }
    ];

    if (Video.writer) {
        return (
            <Row gutter={[16, 16]}>
                { 왼쪽 컬럼: 비디오, 블러 레벨, 버튼 }
                <Col lg={16} xs={24}>
                    <div className="postPage" style={{ width: '100%', padding: '3rem 4em' }}>
                        {비디오 플레이어 }
                        <video style={{ width: '80%', height: 'auto' }} src={`http://localhost:5000/${Video.filePath}`} controls></video>

                        { 비디오 정보 }
                        <List.Item>
                            <List.Item.Meta
                                avatar={<Avatar src={Video.writer?.image} />}
                                title={Video.title}
                                description={Video.description}
                            />
                        </List.Item>

                        { 블러링 버튼 }
                        <div style={{ marginTop: '20px' }}>
                            <Button type="primary" onClick={handleButtonClick}>
                                Download
                            </Button>
                        </div>
                    </div>
                </Col>

            </Row>
        )
    } else {
        return (
            <div>Loading...</div>
        )
    }
}

export default DetailVideoPage;
*/



/*
import React, { useEffect, useState } from 'react'
import { List, Avatar, Row, Col } from 'antd';
import axios from 'axios';
//import SideVideo from './Sections/SideVideo';
//import Subscriber from './Sections/Subscriber';
//import Comments from './Sections/Comments'
//import LikeDislikes from './Sections/LikeDislikes';


function DetailVideoPage(props) {

    //app.js에서           
    //<Route exact path="/video/:videoId" component={Auth(DetailVideoPage, null)} />
    //해줘서 비디오 아이디로 가져올 수 있음
    const videoId = props.match.params.videoId


    const [Video, setVideo] = useState([])
    //const [CommentLists, setCommentLists] = useState([])

    //비디오 가져오기위해 비디오 아이디 알아야 -> 변수생성
    const videoVariable = {
        videoId: videoId
    }
    
    //랜딩페이지에서 눌렀을 때 페이지 넘어가고 해당 동영상 보이게
    //몽고디비에서 동영상 꺼내기
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

        axios.post('/api/comment/getComments', videoVariable)
            .then(response => {
                if (response.data.success) {
                    console.log('response.data.comments',response.data.comments)
                    //setCommentLists(response.data.comments)
                } else {
                    alert('Failed to get video Info')
                }
            })


    }, [])

    
    //const updateComment = (newComment) => {
    //    setCommentLists(CommentLists.concat(newComment))
    //}

    if (Video.writer) {
        return (
            <Row>
                <Col lg={18} xs={24}>
                    <div className="postPage" style={{ width: '100%', padding: '3rem 4em' }}>
                        <video style={{ width: '100%' }} src={`http://localhost:5000/${Video.filePath}`} controls></video>

                        <List.Item
                            //actions={[<LikeDislikes video videoId={videoId} userId={localStorage.getItem('userId')}  />, <Subscriber userTo={Video.writer._id} userFrom={localStorage.getItem('userId')} />]}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={Video.writer && Video.writer.image} />}
                                title={<a href="https://ant.design">{Video.title}</a>}
                                description={Video.description}
                            />
                            <div></div>
                        </List.Item>

                    </div>
                </Col>
                <Col lg={6} xs={24}>

                </Col>
            </Row>
        )

    } else {
        return (
            <div>Loading...</div>
        )
    }


}

export default DetailVideoPage

*/