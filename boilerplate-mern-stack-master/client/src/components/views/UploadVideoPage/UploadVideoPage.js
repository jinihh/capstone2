/*
사용자가 영상 파일을 업로드하고, 제목, 설명, 공개 여부, 카테고리를 선택하는 페이지
 /api/video/uploadfiles: 업로드된 파일을 저장.
 /api/video/thumbnail: 썸네일 생성.
 /api/video/uploadVideo: 영상 정보를 MongoDB에 저장.
*/
import React, { useState, useEffect } from 'react'
import { Typography, Button, Form, message, Input, Icon } from 'antd';
import Dropzone from 'react-dropzone';
import axios from 'axios';
import { useSelector } from "react-redux"; //템플릿 유저 아이디 가져오기

const { Title } = Typography;
const { TextArea } = Input;

const Private = [
    { value: 0, label: 'Private' },
    { value: 1, label: 'Public' }
]

const Catogory = [
    { value: 0, label: "Film & Animation" },
    { value: 0, label: "Autos & Vehicles" },
    { value: 0, label: "Music" },
    { value: 0, label: "Pets & Animals" },
    { value: 0, label: "Sports" },
]

function UploadVideoPage(props) {
    const user = useSelector(state => state.user); //state에서 가져온 유저정보 user에
    const [title, setTitle] = useState("");
    const [Description, setDescription] = useState("");
    const [privacy, setPrivacy] = useState(0)
    const [Categories, setCategories] = useState("Film & Animation")
    const [FilePath, setFilePath] = useState("")
    const [Duration, setDuration] = useState("")
    const [Thumbnail, setThumbnail] = useState("")
    const handleChangeTitle = (event) => {
        setTitle(event.currentTarget.value)
    }

    const handleChangeDecsription = (event) => {

        setDescription(event.currentTarget.value)
    }

    const handleChangeOne = (event) => {
        setPrivacy(event.currentTarget.value)
    }

    const handleChangeTwo = (event) => {
        setCategories(event.currentTarget.value)
    }

    const onSubmit = (event) => {

        event.preventDefault(); //원래클릭하려던거 방지하고 지정해주는거 하도록

        if (user.userData && !user.userData.isAuth) {
            return alert('Please Log in First')
        }

        if (title === "" || Description === "" ||
            Categories === "" || FilePath === "" ||
            Duration === "" || Thumbnail === "") {
            return alert('Please first fill all the fields')
        }

        // MongoDB에 저장할 정보들
        const variables = { //비디오js 콜렉션에 들어갈정보
            writer: user.userData._id,
            title: title,
            description: Description,
            privacy: privacy,
            filePath: FilePath, // 비디오 파일의 경로 정보만 저장
            category: Categories,
            duration: Duration,
            thumbnail: Thumbnail,
        }

        console.log("Submitting video data:", variables); // 디버그 로그 추가

        //이ㅣ 정보가지고 리퀘스트 조냄
        axios.post('/api/video/uploadVideo', variables)
            .then(response => {
                console.log("Upload response:", response); // 서버 응답 출력
                if (response.data.success) {
                    alert('video Uploaded Successfully')

                    // 업로드된 비디오의 MongoDB `_id`를 Flask API로 전달, 객체 탐지 요청

                    axios.post('/flask-api/detect_objects', { video_id: response.data.videoId })
                    .then(detectResponse => {
                        if (detectResponse.data.success) {
                            console.log('Object detection successfully initiated');
                            alert('Video Uploaded and Object Detection Completed Successfully');
                        } else {
                            alert('Failed to detect objects in the video');
                            console.error('Failed to initiate object detection:', detectResponse.data.error);
                        }
                    })
                    .catch(err => {
                        console.error('Error in object detection:', err);
                        alert('Error occurred during object detection');
                    });

                    // 업로드 완료 후 LandingPage로 이동
                    props.history.push('/');
                } else {
                    alert('Failed to upload video')
                }
            })
            .catch(err => {
                console.error('Error saving video to database', err);
            });

    }
          

    
    const onDrop = (files) => {
        //리퀘스트 보낼 때 헤더 같이 안보내주면 파일 보낼 때는 오류생김

        let formData = new FormData();
        const config = {
            header: { 'content-type': 'multipart/form-data' }
        }
        console.log(files)
        formData.append("file", files[0])

        ///api/video/uploadfiles 서버 라우터에 넣음 
        //라우터 생성 필요 server>>routes>>video.js
        //router.post("/api/video/uploadfiles", (req, res) => {
        //    
        

        axios.post('/api/video/uploadfiles', formData, config)
            .then(response => {
                if (response.data.success) {
                    let variable = {
                        filePath: response.data.filePath,
                        fileName: response.data.fileName
                    }
                    setFilePath(response.data.filePath)

                    //gerenate thumbnail with this filepath ! 

                    axios.post('/api/video/thumbnail', variable )
                        .then(response => {
                            if (response.data.success) {
                                setDuration(response.data.fileDuration)
                                setThumbnail(response.data.thumbsFilePath)
                            } else {
                                alert('Failed to make the thumbnails');
                            }
                        })
                        .catch(err=>{
                            console.error('Error creating thumnails',err);
                        });
                } else {
                    alert('failed to save the video in server')
                }
            })
            .catch(err => {
                console.error('Error uploading video', err);
            });
    }


    return (
        <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Title level={2} > Upload Video</Title>
            </div>

            <Form onSubmit={onSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Dropzone
                        onDrop={onDrop}
                        multiple={false}
                        maxSize={800000000}>
                        {({ getRootProps, getInputProps }) => (
                            <div style={{ width: '300px', height: '240px', border: '1px solid lightgray', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                {...getRootProps()}
                            >
                                <input {...getInputProps()} />
                                <Icon type="plus" style={{ fontSize: '3rem' }} />
                            </div>
                        )}
                    </Dropzone>
                    {Thumbnail !== "" &&
                        <div>
                            <img src={`http://localhost:5000/${Thumbnail}`} alt="Thumbnail" />
                        </div>
                    }
                </div>

                <br /><br />
                <label>Title</label>
                <Input
                    onChange={handleChangeTitle}
                    value={title}
                />
                <br /><br />
                <label>Description</label>
                <TextArea
                    onChange={handleChangeDecsription}
                    value={Description}
                />
                <br /><br />

                <select onChange={handleChangeOne}>
                    {Private.map((item, index) => (
                        <option key={index} value={item.value}>{item.label}</option>
                    ))}
                </select>
                <br /><br />

                <select onChange={handleChangeTwo}>
                    {Catogory.map((item, index) => (
                        <option key={index} value={item.label}>{item.label}</option>
                    ))}
                </select>
                <br /><br />

                <Button type="primary" size="large" onClick={onSubmit}>
                    Submit
                </Button>

            </Form>
        </div>
    )
}

export default UploadVideoPage


