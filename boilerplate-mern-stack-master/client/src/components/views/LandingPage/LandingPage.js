import React, { useEffect, useState } from 'react'
import { FaCode } from "react-icons/fa";
import { Card, Avatar, Col, Typography, Row } from 'antd';
import axios from 'axios';
import moment from 'moment';
const { Title } = Typography;
const { Meta } = Card;
function LandingPage() {
    //비디오 정보들 state화 저장 
    const [Videos, setVideos] = useState([])

    //몽고db에서 데이터 가져오자
    useEffect(() => {
        axios.get('/api/video/getVideos')
            .then(response => {
                if (response.data.success) {
                    console.log(response.data.videos)
                    setVideos(response.data.videos)
                } else {
                    alert('Failed to get Videos')
                }
            })
    }, [])





    const renderCards = Videos.map((video, index) => {
        //duration다 초로 되어있어서 계산 필요
        //원본 비디오 카드
        var minutes = Math.floor(video.duration / 60);
        var seconds = Math.floor(video.duration - minutes * 60);
        //1개의 row-> 4개의 column, 전체값24
        //링크걸어줌, 하나에 해당하는 페이지 가기 위해서
        //<a href={`/video/${video._id}`} > : id를 이용해서 링크 걸어쥼

        //avatar:유저이미지


        return <Col lg={6} md={8} xs={24} key={index}>
            <div style={{ position: 'relative' }}>
                <a href={`/video/${video._id}`} > 
                <img style={{ width: '100%' }} alt="thumbnail" src={`http://localhost:5000/${video.thumbnail}`} />
                <div className=" duration"
                    style={{ bottom: 0, right:0, position: 'absolute', margin: '4px', 
                    color: '#fff', backgroundColor: 'rgba(17, 17, 17, 0.8)', opacity: 0.8, 
                    padding: '2px 4px', borderRadius:'2px', letterSpacing:'0.5px', fontSize:'12px',
                    fontWeight:'500', lineHeight:'12px' }}>
                    <span>{minutes} : {seconds}</span>
                </div>
                </a>
            </div><br />
            <Meta
                    avatar={
                        video.writer && video.writer.image ? (
                            <Avatar src={video.writer.image} />
                        ) : (
                            <Avatar icon={<FaCode />} /> // 기본 아이콘으로 대체
                        )
                    }
                    title={video.title}
                />
                {video.writer && video.writer.name ? (
                    <span>{video.writer.name}</span>
                ) : (
                    <span>Unknown Writer</span> // writer 정보가 없을 때
                )}
                <br />
                <span style={{ marginLeft: '3rem' }}> {video.views} views</span>
                - <span> {moment(video.createdAt).format("MMM Do YY")} </span>
            </Col>

    })



    return (
        <div style={{ width: '85%', margin: '3rem auto' }}>
            <Title level={2} > Recommended </Title>
            <hr />

            <Row gutter={16}>
                {renderCards}
            </Row>
        </div>
    )
}

export default LandingPage

/*

import React, { useEffect, useState } from 'react'
import { FaCode } from "react-icons/fa";
import { Card, Avatar, Col, Typography, Row } from 'antd';
import axios from 'axios';
import moment from 'moment';
const { Title } = Typography;
const { Meta } = Card;
function LandingPage() {
    //비디오 정보들 state화 저장 
    const [Videos, setVideos] = useState([])

    //몽고db에서 데이터 가져오자
    useEffect(() => {
        axios.get('/api/video/getVideos')
            .then(response => {
                if (response.data.success) {
                    console.log(response.data.videos)
                    setVideos(response.data.videos)
                } else {
                    alert('Failed to get Videos')
                }
            })
    }, [])





    const renderCards = Videos.map((video, index) => {
        //duration다 초로 되어있어서 계산 필요
        //원본 비디오 카드
        var minutes = Math.floor(video.duration / 60);
        var seconds = Math.floor(video.duration - minutes * 60);
        //1개의 row-> 4개의 column, 전체값24
        //링크걸어줌, 하나에 해당하는 페이지 가기 위해서
        //<a href={`/video/${video._id}`} > : id를 이용해서 링크 걸어쥼

        //avatar:유저이미지


        return <Col lg={6} md={8} xs={24} key={index}>
            <div style={{ position: 'relative' }}>
                <a href={`/video/${video._id}`} > 
                <img style={{ width: '100%' }} alt="thumbnail" src={`http://localhost:5000/${video.thumbnail}`} />
                <div className=" duration"
                    style={{ bottom: 0, right:0, position: 'absolute', margin: '4px', 
                    color: '#fff', backgroundColor: 'rgba(17, 17, 17, 0.8)', opacity: 0.8, 
                    padding: '2px 4px', borderRadius:'2px', letterSpacing:'0.5px', fontSize:'12px',
                    fontWeight:'500', lineHeight:'12px' }}>
                    <span>{minutes} : {seconds}</span>
                </div>
                </a>
            </div><br />
            <Meta
                avatar={
                    <Avatar src={video.writer.image} />
                }
                title={video.title}
            />
            <span>{video.writer.name} </span><br />
            <span style={{ marginLeft: '3rem' }}> {video.views}</span>
            - <span> {moment(video.createdAt).format("MMM Do YY")} </span>
        </Col>

    })



    return (
        <div style={{ width: '85%', margin: '3rem auto' }}>
            <Title level={2} > Recommended </Title>
            <hr />

            <Row gutter={16}>
                {renderCards}
            </Row>
        </div>
    )
}

export default LandingPage
*/