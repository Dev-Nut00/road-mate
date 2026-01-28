http://roadmate.p-e.kr/
# 🚗 Road Mate (로드메이트)

**유휴 주차 공간 공유 플랫폼**  
Road Mate는 개인이나 사업자가 소유한 사용하지 않는 주차 공간을 필요한 운전자에게 공유하고 수익을 창출할 수 있는 서비스입니다.

## 📋 프로젝트 소개

도심 주차난 해소를 위해 개인 소유의 주차 공간을 시간 단위 또는 일일 단위로 대여할 수 있는 플랫폼입니다.
호스트는 유휴 공간으로 수익을 얻고, 드라이버는 합리적인 가격에 편리하게 주차할 수 있습니다.

## ✨ 주요 기능

### 🏠 Host (주차장 제공자)
- **주차장 등록**: 주소, 위치(지도), 요금(시간제/일일권), 사진 등을 등록하여 관리.
- **예약 관리 및 승인**:
  - **자동 승인**: 예약 요청 시 즉시 확정.
  - **수동 승인**: 호스트가 요청을 확인 후 수락/거절.
- **내 주차장 관리**: 등록된 주차장의 정보를 수정하거나 운영을 중단/재개.

### 🚘 Driver (운전자)
- **주차장 검색**: 네이버 지도(Naver Maps) 기반으로 내 주변 또는 목적지 근처 주차장 탐색.
- **편리한 예약**: 원하는 시간(시간제) 또는 종일(일일권) 옵션으로 간편 예약.
- **차량 관리**: 자주 사용하는 차량 정보를 등록하여 예약 시 선택.
- **예약 내역 확인**: 다가오는 예약 및 지난 이용 내역 조회.

## 🛠️ 기술 스택 (Tech Stack)

### Backend
- **Framework**: Django REST Framework (Python 3.12)
- **Database**: PostgreSQL 16
- **Auth**: JWT (Simple JWT) / Django-Allauth

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Shadcn UI
- **Map Integration**: Naver Maps API V3
- **State Management**: React Hooks

### Infrastructure
- **Container**: Docker, Docker Compose
- **Server**: Gunicorn (Production), Django Dev Server (Development)

## 🚀 시작하기 (Getting Started)

이 프로젝트는 Docker 환경에서 쉽게 실행할 수 있도록 구성되어 있습니다.

### 1. 사전 요구 사항 (Prerequisites)
- [Docker](https://www.docker.com/) 및 Docker Compose가 설치되어 있어야 합니다.
- [Naver Cloud Platform](https://www.ncloud.com/)에서 Maps API Client ID를 발급받아야 합니다.

### 2. 설치 및 실행 (Installation)

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/road-mate.git
cd road-mate

# 2. 환경 변수 설정
# .env.example 파일을 참고하여 .env 파일을 생성하세요.
# (필수: SECRET_KEY, DEBUG, DATABASE_URL, NAVER_MAP_CLIENT_ID 등)

# 3. 서비스 실행
docker-compose up -d --build

# 4. 마이그레이션 적용 (최초 실행 시)
docker-compose exec backend python manage.py migrate
```

### 3. 접속 주소
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin**: http://localhost:8000/admin

## 📂 프로젝트 구조

```
road-mate/
├── applications/             # Django Apps (Backend Logic)
│   ├── accounts/             # 사용자 인증 및 프로필
│   ├── spaces/               # 주차장 관리
│   └── reservations/         # 예약 시스템
├── frontend/                 # Next.js Application
├── config/                   # Django Project Configuration
├── docker-compose.yml        # Docker Orchestration
└── requirements.txt          # Python Dependencies
```

## 📄 라이선스 (License)
This project is licensed under the MIT License.
