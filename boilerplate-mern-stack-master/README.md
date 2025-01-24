# 서비스 기능 정리 및 개발환경


**1. 페이지 기능 정리**
+ UploadVideoPage
  
  - 사용자가 영상 파일을 업로드하고, 영상의 제목 등 동영상 상세 설명 선택 및 추가
  -입력된 데이터는 서버로 전송하여 MongoDB에 저장
  ![UploadVideoPage](https://github.com/jinihh/capstone2/blob/main/boilerplate-mern-stack-master/upload.png
)

* LandingPage
  
  - MongoDB에 저장된 동영상들을 불러와 사용자에게 카드 형식으로 보여준다.
    ![LandingPage](https://github.com/jinihh/capstone2/blob/main/boilerplate-mern-stack-master/landing.png
)

* DetailVideoPage
  
  - 사용자가 LandingPage에서 동영상을 클릭하면 해당 동영상의 상세 정보를 보여준다.
  -비디오 및 타임라인 데이터를 가져오는 API 호출
  ![DetailVideoPage](https://github.com/jinihh/capstone2/blob/main/boilerplate-mern-stack-master/detail.png
)
  ![DetailVideoPage2](https://github.com/jinihh/capstone2/blob/main/boilerplate-mern-stack-master/detail2.png
)


**2. 개발환경**
+ Node : v10.16.0
+ Npm : 6.9.0
+ mongodb@3.7.4
  




