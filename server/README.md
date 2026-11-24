# Shopping Mall Server

Node.js + Express + MongoDB API 서버입니다.

## 시작하기

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 설정

`.env.example`을 참고해 `.env` 파일을 확인하세요.

```env
PORT=5000
MONGODB_ATLAS_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shopping-mall?retryWrites=true&w=majority
NODE_ENV=development
```

3. MongoDB 실행 후 서버 시작

```bash
# 개발 모드 (nodemon - 파일 수정 시 자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | 서버 상태 확인 |
| GET | `/products` | 상품 목록 |
| GET | `/products/:id` | 상품 상세 |
| POST | `/products` | 상품 생성 |

## 폴더 구조

```
server/
├── models/
│   └── Product.js
├── routers/
│   └── productRouter.js
├── index.js
├── .env
├── .env.example
└── package.json
```
