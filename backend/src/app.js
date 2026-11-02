const express = require('express');
const cors = require('cors');
const submissionRoutes = require('./routes/submissions');
const groupsRouter = require('./routes/groups'); // groups.js 파일 불러오기

const app = express();

// 미들웨어 설정
app.use(cors()); // 프론트엔드(React)와의 CORS 통신 허용
app.use(express.json()); // JSON Request Body 파싱
app.use('/api', groupsRouter); // /api 경로로 들어오면 groupsRouter로 연결

// 라우터 등록
app.use('/api', submissionRoutes);

module.exports = app;
