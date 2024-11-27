

// /api/video/getVideo: 동영상 데이터를 MongoDB에서 가져옴.
// if (Video.writer): 서버에서 데이터를 받아오기 전에는 Loading...을 표시하여 로딩 상태 처리.

import React, { useEffect, useState } from 'react'
import { List, Avatar, Row, Col, Button, Slider,Tag, Table } from 'antd';
import axios from 'axios';

//import SideVideo from './Sections/SideVideo';
//import Subscriber from './Sections/Subscriber';
//import Comments from './Sections/Comments'
//import LikeDislikes from './Sections/LikeDislikes';

                        //{/* 탐지된 객체 타임라인 테이블 */}
                       // <div style={{ marginTop: '40px' }}>
                       //     <h3>Detected Object Timeline</h3>
                        //    <Table
                       //         dataSource={timeline}
                        //        columns={columns}
                        //        rowKey="_id"
                        //        pagination={{ pageSize: 5 }}
                        //    />
                        //</div>



function DetailVideoPage(props) {

    //app.js에서           
    //<Route exact path="/video/:videoId" component={Auth(DetailVideoPage, null)} />
    //해줘서 비디오 아이디로 가져올 수 있음

    
    //.nst [timelines, setTimelines] = useState([]);

    const [Video, setVideo] = useState([])
    //const [videoData, setVideoData] = useState(null);
    const [level, setLevel] = useState(1); // 초기 레벨을 1로 설정
    
    //const [CommentLists, setCommentLists] = useState([])
    const [timeline, setTimeline] = useState([]); // 탐지된 객체 타임라인 데이터


    //비디오 가져오기위해 비디오 아이디 알아야 -> 변수생성
    //props.match.params.videoId를 사용해 URL에서 동영상의 고유 ID를 가져옴
    const videoId = props.match.params.videoId;
    //현재 페이지가 탐지된 비디오를 보여주기 위한 것인지 확인 (URL에 'detected'가 포함되어 있는지)
    const isDetectedVideo = props.match.path.includes('detected');

    //랜딩페이지에서 눌렀을 때 페이지 넘어가고 해당 동영상 보이게
    //몽고디비에서 동영상 꺼내기
    
    useEffect(() => {
        // GET 방식으로 BlurInfo API 호출
        axios.get(`/api/blur/getBlurInfo?videoId=${videoId}`)
            .then(response => {
                if (response.data.success) {
                    console.log('BlurInfo found:', response.data.blurInfo);
                    setBlurInfoId(response.data.blurInfo._id);
                } else {
                    alert('Blur Info not found');
                }
            })
        // 탐지된 비디오와 타임라인 데이터를 가져오는 API 호출
        
        const videoVariable = {
            videoId: videoId
        }

        if (isDetectedVideo) {
            // 탐지된 비디오를 가져오는 경우
            axios.get(`/flask-api/get_detected_video?video_id=${videoId}`)
                .then(response => {
                    if (response.status === 200) {
                        console.log(response.data);
                        setVideo(response.data);
                        if (response.data.timeline) {
                            setTimeline(response.data.timeline);
                        }
                    } else {
                        alert('Failed to get detected video Info');
                    }
                })
                .catch(err => {
                    console.error('Error fetching detected video:', err);
                });
        } else {
        // 업로드한 원본 비디오를 가져오는 경우
            axios.get(`/flask-api/get_video?video_id=${videoId}`)
            .then(response => {
                if (response.status === 200) {
                    console.log('Video fetched successfully');
                    setVideo(response.data);
                } else {
                    alert('Failed to get video Info');
                }
            })
            .catch(err => {
            console.error('Error fetching original video:', err);
            });
        }

}, [videoId, isDetectedVideo]);



    
    if (Video.length === 0) {
        return <div>Loading...</div>
    }

    // 레벨 변경 핸들러
    const handleLevelChange = (value) => {
        setLevel(value);
    }


    // 버튼 클릭 시 다른 페이지로 이동
    const handleButtonClick = () => {
        props.history.push(`/video/result/${videoId}`);
        //props.history.push(`/video/result/${videoId}?blurLevel=${level}`);
        //props.history.push(`/video/result?videoId=${videoId}`);
        //props.history.push('/');
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
            dataIndex: 'frames',
            key: 'frames',
            render: frames => frames.join(', ') // 프레임 정보들을 콤마로 구분하여 표시
        }
    ];
    
    //const updateComment = (newComment) => {
    //    setCommentLists(CommentLists.concat(newComment))
    //}


    // Blur 처리 API 호출 함수
    const applyBlurHandler = () => {
        if (!blurInfoId) {
            alert('Blur Info is missing!');
            return;
        }

        setLoading(true);

        axios.post('/api/blur/applyBlur', {
            videoId: videoId,
            blurInfoId: blurInfoId
        })
            .then(response => {
                setLoading(false);
                if (response.data.success) {
                    alert('Blur 처리 완료');
                    // 처리된 비디오 결과를 보여주거나 다른 작업을 할 수 있습니다.
                } else {
                    alert('Blur 처리에 실패했습니다.');
                }
            })
            .catch(error => {
                setLoading(false);
                alert('서버 오류가 발생했습니다.');
            });
    }
  
    if (Video && Object.keys(Video).length > 0) {
    //if (Video.writer) {
        return (
            <Row>
                <Col lg={18} xs={24}>
                    <div className="postPage" style={{ width: '100%', padding: '3rem 4em' }}>
                        <video style={{ width: '100%' }} src={`http://localhost:5000/${Video.filePath}`} controls></video>
                    
                    {/* 비디오 길이 표시 */}
                    {Video.duration && (
                        <p>Duration: {Number(Video.duration).toFixed(2)} seconds</p>
                    )}


                        <List.Item
                            //actions={[<LikeDislikes video videoId={videoId} userId={localStorage.getItem('userId')}  />, <Subscriber userTo={Video.writer._id} userFrom={localStorage.getItem('userId')} />]}
                        >
                            <List.Item.Meta
                                //avatar={<Avatar src={Video.writer && Video.writer.image} />}
                                avatar={Video.writer && <Avatar src={Video.writer.image} />}
                                //title={<a href="https://ant.design">{Video.title}</a>}
                                title={Video.title || 'No Title'}
                                description={Video.description || 'No Description'}
                                //description={Video.description}
                            />
                            <div></div>
                        </List.Item>


                        {/* 레벨 선택 바 */}
                        <div style={{ marginTop: '20px' }}>
                            <h3>Blur Level</h3>
                            <Slider
                                min={1}
                                max={5}
                                defaultValue={1}
                                onChange={handleLevelChange}
                                value={level}
                                marks={{
                                    1: '1',
                                    2: '2',
                                    3: '3',
                                    4: '4',
                                    5: '5'
                                }}
                                step={1}
                            />
                            <p>Blur Level: {level}</p>
                        </div>

                        
                        {/* 타임라인 정보도 렌더링 */}
                        <div style={{ marginTop: '20px' }}>
                            <h3>Timeline Data</h3>
                            <Table columns={columns} dataSource={timeline} rowKey="_id" />
                        </div>

                        {/* 버튼 */}
                        <div style={{ marginTop: '20px' }}>
                            <Button type="primary" onClick={handleButtonClick}>
                                Bluring
                            </Button>
                        </div>
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
