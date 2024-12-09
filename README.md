# 유해 이미지 영상 Blur 처리 서비스

![KakaoTalk_20241126_221950590](https://github.com/user-attachments/assets/a08610a2-4e55-4996-8470-128a3a5465ac)


![image](https://github.com/user-attachments/assets/e9fddfcb-dca4-4c40-bf6e-3aaaafffef70)


## 🛠 프로젝트 개요
본 프로젝트는 **YOLOv8 객체 탐지**를 활용하여 영상에서 유해 물질(담배, 술, 칼 등)을 탐지하고, **자동 블러링** 처리를 지원하는 AI 서비스입니다. 방송국, OTT 플랫폼, 개인 영상 편집자를 위한 효율적인 영상 편집 솔루션을 제공합니다.

---

## 🏆 주요 기능
### 1. **Object Detection**
- 방송통신위원회 기준에 따른 **유해 물질(담배, 술, 칼)** 탐지
- 여러 각도에서 가려진 물체까지 인식

### 2. **Blurring**
- 탐지된 영역에 **가우시안 블러링** 자동 적용
- **블러 강도 조절** (1~5단계)로 영상미 유지

### 3. **Edit Function**
- 탐지된 장면의 타임라인 제공
- 특정 구간으로 빠른 이동 및 편집 가능

---

## 🎯 타겟 사용자
- **방송사** 영상 편집자
- **OTT 플랫폼** 영상 편집자
- **개인 프리랜서** 편집자

---

## 📋 문제 정의 및 해결책
### 문제
- 긴 영상에서 **유해물질 탐지 누락** 가능성
- 수작업 블러 처리로 인한 **긴 작업시간과 피로**
- 탐지 및 편집 도구의 **효율성 부족**

### 해결책
- **YOLOv8 기반 객체 탐지** 및 **추적**
- **블러링 강도 선택**으로 커스터마이징 지원
- **AI 기반 편집 도구**로 편리한 영상 편집 제공

---

## 📈 발전 방향
- **준지도학습 기반 라벨링** 자동화
- **실시간 영상 서비스**로 확대
- **Prompt 기반 Blurring 서비스** 지원

---

## 🔧 기술 스택
- **Backend**: Node.js,Flask, Python 
- **Frontend**: HTML, CSS, JavaScript
- **AI Model**: YOLOv8, TorchScript, OpenCV
- **Database**: MongoDB