// server.js 가장 위에 추가!
process.stdout.write('\uFEFF');
require('dotenv').config();
const cors = require('cors');
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const jwtSecretKey = 'secret_key';
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));  // form data를 처리하기 위한 미들웨어
app.use(cors({
    origin: true, // 모든 origin 허용 (함수처럼 작동)
    credentials: true,
}));



const router = express.Router();
// dialogflow
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const dialogflowRouter = require('./dialogflow');  // dialogflow.js 파일 임포트
// Dialogflow 라우터 사용
// Dialogflow 라우터 설정

app.use('/', dialogflowRouter); 

app.use('/videos', express.static(path.join(__dirname, 'public/LearningMaterials/videos')));


app.use(bodyParser.json());

//0: 몽고 db 사용  03-25 추가

const mongoose = require('mongoose');
const connectDB = require('./db');
const User = require('./models/User/User');
// 데이터베이스 연결
connectDB();


// JWT 인증 미들웨어 함수
const authenticateJWT = (req, res, next) => {
    // 요청 헤더에서 Authorization 값을 가져옵니다.
    const authHeader = req.headers['authorization'];
    // Authorization 헤더는 보통 "Bearer 토큰문자열" 형태로 옵니다.
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer " 부분을 제외하고 토큰 문자열만 추출

    // 토큰이 없는 경우 (로그인되지 않은 상태)
    if (token == null) {
        console.log('인증 실패: 토큰 없음');
        // 401 Unauthorized 응답
        return res.status(401).json({ error: '인증 토큰이 제공되지 않았습니다.' });
    }

    // 토큰이 있는 경우, 토큰 검증
    jwt.verify(token, jwtSecretKey, (err, userPayload) => {
        if (err) {
            console.log('인증 실패: 토큰 유효하지 않음', err.message);
            // 403 Forbidden 응답 (토큰은 있으나 유효하지 않음)
            return res.status(403).json({ error: '유효하지 않은 인증 토큰입니다.' });
        }

        // 토큰이 유효하면, 토큰에 담긴 사용자 정보(payload)를 req 객체에 추가하여 다음 미들웨어 또는 라우트로 전달
        req.user = userPayload; // 예: req.user에 사용자 정보(id, email, isAdmin 등) 저장
        console.log('인증 성공: 사용자 ID', req.user.id);
        next(); // 다음 미들웨어 또는 라우트 핸들러로 이동
    });
};


// **1. 로그인 API (JWT 방식)**
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('입력된 이메일:', email);
        console.log('입력된 비밀번호:', password);

        // 관리자 계정 확인 (JWT에서는 세션에 저장하지 않음)
        if (email === 'admin' && password === '1234') {
            console.log('관리자 계정으로 로그인 시도.');
            // 관리자 정보로 JWT 생성
            const adminPayload = { id: 'admin', email: 'admin', isAdmin: true };
            const token = jwt.sign(adminPayload, jwtSecretKey, { expiresIn: '1h' }); // 예: 토큰 유효 시간 1시간

            console.log('관리자 로그인 성공, 토큰 발행.');
            return res.status(200).json({
                message: '관리자 계정으로 로그인되었습니다.',
                token: token, // 클라이언트에 토큰 전달
                userId: 'admin',
                isAdmin: true
            });
        }

        // MongoDB에서 사용자 정보 찾기
        const user = await User.findOne({ email });

        if (!user) {
            console.log('사용자 없음:', email);
            return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('비밀번호 불일치:', email);
            return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }

        console.log('사용자 로그인 성공:', user.email);
        // 사용자 정보로 JWT 생성 (보안상 민감 정보는 최소화)
        const userPayload = { id: user._id, email: user.email, isAdmin: false };
        const token = jwt.sign(userPayload, jwtSecretKey, { expiresIn: '1h' }); // 예: 토큰 유효 시간 1시간

        console.log('사용자 로그인 성공, 토큰 발행.');
        // 클라이언트에 토큰 및 사용자 정보 응답
        return res.status(200).json({
            message: '로그인 성공',
            token: token, // 클라이언트에 토큰 전달
            userId: user._id,
            userEmail: user.email,
            isAdmin: false
        });

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
});
// **2. 로그아웃 API**
app.post('/api/logout', (req, res) => {
    console.log('로그아웃 요청 수신. (JWT 방식)');
    // 클라이언트는 이 응답을 받은 후 자체적으로 저장된 토큰을 삭제합니다.
    res.status(200).json({ message: '로그아웃 성공' });
});



// **3. 인증 코드 생성 및 이메일 발송**
const verificationCodes = {};

const generateVerificationCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }
    return code;
};

// Nodemailer transporter 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
    },
});

// **4. 인증 이메일 발송 API**
app.post('/api/send-verification-email', (req, res) => {
    const { email } = req.body;

    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: '유효한 이메일 주소를 입력해주세요.' });
    }

    const verificationCode = generateVerificationCode(); // 인증 코드 생성

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: '이메일 인증 코드',
        text: `인증 코드: ${verificationCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: '이메일 발송에 실패했습니다.' });
        }
        verificationCodes[email] = verificationCode; // 인증 코드 저장
        res.status(200).json({ message: '인증 코드가 발송되었습니다.' });
    });
});


// **5. 인증 코드 검증 API**
app.post('/api/verify-code', (req, res) => {
    const { email, code } = req.body;

    // 입력된 이메일에 대한 인증 코드 검증
    if (verificationCodes[email] && verificationCodes[email] === code) {
        delete verificationCodes[email]; // 인증이 완료되면 코드 삭제
        res.status(200).json({ message: '인증이 완료되었습니다.' });
    } else {
        res.status(400).json({ error: '유효하지 않은 인증 코드입니다.' });
    }
});
const { v4: uuidv4 } = require('uuid');
// **6. 회원가입 API** 03-25 추가 (몽고 db 연결)
app.post('/api/register', async (req, res) => {
    const { email, password, name } = req.body;

    try {
        // 이메일 중복 확인
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
        }

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 새로운 사용자 생성
        const newUser = new User({
            userID: uuidv4(), // 고유한 UUID 생성
            name,
            email,
            password: hashedPassword,
            userPermission: "normal"
        });

        await newUser.save();

        res.status(201).json({ message: '회원가입에 성공했습니다.', user: newUser });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ error: '회원가입에 실패했습니다.' });
    }
});


// **8. 아이디 찾기 API**  
// (이메일로 사용자 정보를 찾아 해당 이메일로 아이디를 발송하는 API)
app.post('/api/find-username', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: '해당 이메일로 등록된 사용자가 없습니다.' });
        }

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: '아이디 찾기',
            text: `안녕하세요, 회원님의 아이디는 ${user.userID}입니다.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('이메일 전송 오류:', error);
                return res.status(500).json({ error: '이메일 전송 중 오류가 발생했습니다.' });
            }

            res.status(200).json({ message: '아이디가 이메일로 전송되었습니다.' });
        });
    } catch (error) {
        console.error('아이디 찾기 오류:', error);
        res.status(500).json({ error: '아이디 찾기 중 오류가 발생했습니다.' });
    }
});

// **9. 비밀번호 찾기 API**
const crypto = require('crypto');
const generateTempPassword = () => {
    return Math.random().toString(36).slice(-8); // 8자리 임시 비밀번호
};

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: '해당 이메일로 등록된 사용자가 없습니다.' });
        }

        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: '임시 비밀번호 발급',
            text: `안녕하세요, 회원님의 임시 비밀번호는 "${tempPassword}"입니다.\n로그인 후 반드시 비밀번호를 변경해주세요.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('이메일 전송 오류:', error);
                return res.status(500).json({ error: '이메일 전송 중 오류가 발생했습니다.' });
            }

            res.status(200).json({ message: '임시 비밀번호가 이메일로 전송되었습니다.' });
        });
    } catch (error) {
        console.error('비밀번호 찾기 오류:', error);
        res.status(500).json({ error: '비밀번호 찾기 중 오류가 발생했습니다.' });
    }
});


// **10. 사용자 조회 API**  
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: '사용자 조회 중 오류가 발생했습니다.' });
    }
});

// **11. 프로필 조회 API**
// (사용자의 프로필 정보를 조회하는 API)
// **프로필 조회 API** (사용자의 프로필 정보만 반환)
app.get('/api/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        // 프로필에 필요한 정보만 반환 (예: 이름, 이메일, 프로필 사진, 자기소개 등)
        const profileData = {
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
        };

        res.status(200).json(profileData);
    } catch (error) {
        res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다.' });
    }
});

// **12. IT기사 조회 API**
// (외부 API 또는 MongoDB에서 IT 기사를 가져오는 API)
// 컴퓨터 소프트웨어 관련 뉴스 검색 API
const axios = require('axios');
//const xml2js = require('xml2js');
const clientId = "ZjPPosVXoOeA7jp524C8";
const clientSecret = "d4P80H8KrG";

// 관리자 ID는 로그인 세션에서 가져오는 게 이상적이지만 지금은 임시로 하드코딩
const adminID = "admin001";

app.get('/api/news', async (req, res) => {
    const searchKeyword = '컴퓨터 소프트웨어';
    const encText = encodeURIComponent(searchKeyword);
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encText}&display=100&start=1`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret
            }
        });

        const items = response.data.items;
        let savedCount = 0;

        for (const item of items) {
            // URL을 해시해서 newsID로 사용
            const newsID = crypto.createHash('sha256').update(item.link).digest('hex');

            // 중복 체크
            const exists = await ITNews.findOne({ newsID });
            if (exists) continue;

            const newNews = new ITNews({
                newsID,
                adminID,
                title: item.title.replace(/<[^>]*>?/gm, ''), // HTML 태그 제거
                description: item.description.replace(/<[^>]*>?/gm, ''),
                url: item.link,
                tag: "IT", // 임시 지정. 추후 NLP 분석 등으로 자동화 가능
            });

            await newNews.save();
            savedCount++;
        }

        res.status(200).json({ message: `${savedCount}개의 새로운 뉴스가 저장되었습니다.` });
    } catch (error) {
        console.error("뉴스 저장 오류:", error?.response?.data || error.message);
        res.status(500).json({ error: "뉴스 저장 중 오류 발생" });
    }
});
const LearningMaterial = require("./models/Learning/LearningMaterial");
// 14 📌 NEW: 학습자료 목록 조회 (토픽별)
// Example: GET /api/learning-materials/by-topic/node
app.get('/api/learning-materials/by-topic/:topicId', async (req, res) => {
    try {
        const materials = await LearningMaterial.find({ topic: req.params.topicId }).sort({ createdAt: 1 }); // Sort to maintain order
        if (!materials || materials.length === 0) {
            return res.status(404).json({ message: '해당 토픽의 학습자료가 없습니다.' });
        }
        res.json(materials);
    } catch (error) {
        console.error('학습자료 목록 조회 오류:', error);
        res.status(500).json({ message: '서버 오류', error });
    }
});

const LearningProgress = require('./models/Learning/LearningProgress'); 

// **15 학습 진행도 조회 (GET /progress/:materialId) - JWT 방식**
// authenticateJWT 미들웨어를 적용하여 이 라우트가 실행되기 전에 먼저 인증을 거치도록 합니다.
app.get('/api/progress/:materialId', authenticateJWT, async (req, res) => {
    const user = req.user; // req.user에 사용자 정보가 담겨 있습니다.

    console.log('학습 진행도 조회 요청 (인증됨): 사용자 ID', user.id);

    try {
        // 해당 사용자와 학습 자료에 대한 진행도 찾기
        const progress = await LearningProgress.findOne({
            userID: user.id,
            learningMaterialID: req.params.materialId,
        });

        if (!progress) {
            // 진행도가 없다면 404 Not Found 상태 코드 반환 (인증은 되었으나 데이터 없음)
            return res.status(404).json({ error: '진행도 없음' });
        }

        // **수정된 부분: 진행도가 있다면 progress 객체 전체를 반환합니다.**
        res.status(200).json(progress);

    } catch (err) {
        console.error('진행도 조회 오류:', err);
        // 예외 발생 시 500 서버 오류 반환
        res.status(500).json({ error: '서버 오류', detail: err.message });
    }
});
// **16 학습 진행도 저장/갱신 (PATCH /progress) - JWT 방식**
// authenticateJWT 미들웨어를 적용
app.patch('/api/progress/:id', authenticateJWT, async (req, res) => {
    // 미들웨어에서 인증 성공 시 req.user에 사용자 정보가 담겨 있습니다.
    const user = req.user; // req.session.user 대신 req.user 사용
    const progressId = req.params.id; // URL에서 전달된 학습 진행도 ID
    const { subUnitStatus, learningProgressStatus, completedAt, videoProgress } = req.body;

    // 미들웨어에서 이미 인증 실패 처리 (제거 가능)
    // if (!user) {
    //     return res.status(401).json({ error: '로그인이 필요합니다.' }); // 미들웨어에서 처리됨
    // }

    console.log('학습 진행도 갱신 요청 (인증됨): 사용자 ID', user.id, '진행도 ID', progressId);


    try {
        // 해당 사용자의 학습 진행도를 찾기
        // user.id 대신 req.user.id 사용
        const progress = await LearningProgress.findOne({ _id: progressId, userID: user.id });

        if (!progress) {
            // 해당하는 진행도가 없다면 404 Not Found 상태 코드 반환 (인증은 되었으나 데이터 없음)
            return res.status(404).json({ error: '진행도를 찾을 수 없습니다.' });
        }

        // 필요한 값만 업데이트 (null, undefined 체크는 필요에 따라 강화)
        if (subUnitStatus !== undefined) progress.subUnitStatus = subUnitStatus;
        if (learningProgressStatus !== undefined) progress.learningProgressStatus = learningProgressStatus;
        if (completedAt !== undefined) progress.completedAt = completedAt;
        if (videoProgress !== undefined) progress.videoProgress = videoProgress;


        // 진행도 저장
        await progress.save();

        // 갱신된 진행도를 반환
        res.status(200).json({ message: '학습 진행도 갱신 완료', progress });
    } catch (error) {
        console.error('진행도 저장 오류:', error);
        // 예외 발생 시 500 서버 오류 반환
        res.status(500).json({ error: '서버 오류', detail: error.message });
    }
});

// 📌 17 새로운 학습 진행도 생성 (POST /api/progress)
// authenticateJWT 미들웨어를 적용하여 인증된 사용자만 생성 가능하도록 합니다.
app.post('/api/progress', authenticateJWT, async (req, res) => {
    // 미들웨어에서 인증 성공 시 req.user에 사용자 정보가 담겨 있습니다.
    const userID = req.user.id; // req.user에서 사용자 ID 가져오기
    const { learningMaterialID } = req.body; // 요청 본문에서 학습 자료 ID 가져오기

    // learningMaterialID가 요청 본문에 없으면 오류
    if (!learningMaterialID) {
        return res.status(400).json({ error: 'learningMaterialID가 필요합니다.' });
    }

    console.log('새 학습 진행도 생성 요청 (인증됨): 사용자 ID', userID, '자료 ID', learningMaterialID);

    try {
        // 이미 해당 사용자/자료에 대한 진행도 기록이 있는지 확인 (중복 방지)
        const existingProgress = await LearningProgress.findOne({
            userID: userID,
            learningMaterialID: learningMaterialID,
        });

        if (existingProgress) {
            console.log('새 진행도 생성 실패: 이미 진행도 존재');
            // ✅ MODIFIED: 이미 존재하는 progress 객체 전체를 'progress' 키에 담아 반환
            return res.status(409).json({
                error: '해당 자료에 대한 진행도 기록이 이미 존재합니다.',
                progress: existingProgress // <-- 이 부분을 이렇게 수정했어야 합니다.
            });
        }

        // 새로운 LearningProgress 모델 인스턴스 생성
   
        const newProgress = new LearningProgress({
            // _id는 Mongoose가 자동 생성하므로 명시적으로 설정할 필요 없습니다.
            // progressID 필드가 _id와 다르다면 별도로 값을 생성하거나 (UUID 등)
            // 스키마에서 progressID 필드를 제거하는 것을 고려하세요.
            // 만약 progressID가 _id와 같은 용도라면 스키마 필드 이름을 _id로 바꾸세요.
            // 여기서는 _id가 기본 키라고 가정하고 progressID 필드는 일단 무시합니다.

            userID: userID, // req.user.id에서 가져온 사용자 ID
            learningMaterialID: learningMaterialID, // req.body에서 가져온 자료 ID

            // 👇 스키마의 타입과 enum 값에 맞춰 초기값 설정
            subUnitStatus: "미완료", // enum 값 중 하나로 시작 (예시: "미완료")
            learningProgressStatus: "미완료", // enum 값 중 하나로 시작 (예시: "미완료")

            completedAt: null, // Date 타입, 처음에는 null

            videoProgress: { // 객체 타입으로 설정
                currentTime: 0, // Number 타입, 스키마 default: 0
                totalDuration: null, // Number 타입 (필요시 초기값 설정 또는 null)
                progressPercent: null, // Number 타입 (필요시 초기값 설정 또는 null)
            },

            // 다른 필요한 초기 필드들 (스키마에 있다면) ...
        });

        // 데이터베이스에 저장
        await newProgress.save();

        console.log('새 진행도 생성 성공:', newProgress._id);
        // 성공 응답 (201 Created)과 함께 새로 생성된 진행도 ID 반환
        res.status(201).json({
            message: '새 학습 진행도 기록 생성 성공',
            progressId: newProgress._id,
            initialProgress: newProgress // 필요시 생성된 전체 객체 반환
        });

    } catch (err) {
        console.error('새 진행도 생성 오류:', err);
        // 예외 발생 시 500 서버 오류 반환
        res.status(500).json({ error: '새 진행도 생성 중 서버 오류', detail: err.message });
    }
});

// 📌  18. 학습자료 ID로 조회
app.get('/api/learning-material/:id', async (req, res) => {
    try {
        const material = await LearningMaterial.findOne({ learningMaterialID: req.params.id });

        if (!material) {
            return res.status(404).json({ message: '해당 ID의 학습자료가 없음' });
        }

        res.json(material);
    } catch (error) {
        res.status(500).json({ message: '서버 오류', error });
    }
});
// 19. 📌 NEW: 학습 토픽 전체 진행도 조회 (사용자별)
// Example: GET /api/topics/node/user-progress
app.get('/api/topics/:topicId/user-progress', authenticateJWT, async (req, res) => {
    console.log(`[SERVER DEBUG] Request received for /api/topics/${req.params.topicId}/user-progress`);
    console.log(`[SERVER DEBUG] User from JWT:`, req.user);

    const userId = req.user.id; // User ID from JWT
    const { topicId } = req.params;
    try {
        // 1. Get all learning materials for the topic, ensuring a consistent order
        const materialsInTopic = await LearningMaterial.find({ topic: topicId })
            .sort({ createdAt: 1 }) // 정렬 순서 유지
            .lean();

        if (!materialsInTopic || materialsInTopic.length === 0) {
            return res.status(404).json({ message: '해당 토픽의 학습자료가 없습니다.' });
        }

        const materialIds = materialsInTopic.map(m => m.learningMaterialID);

        // 2. Get all learning progress records for these materials by the user
        const userProgressRecords = await LearningProgress.find({
            userID: userId,
            learningMaterialID: { $in: materialIds }
        }).lean();

        const progressMap = new Map();
        userProgressRecords.forEach(p => progressMap.set(p.learningMaterialID, p));

        // 3. Process and aggregate progress
        let completedCount = 0; // 유효 상태 "완료" 기준 카운트
        let inProgressDbCount = 0; // DB 상태가 "진행 중"인 자료 카운트

        const processedMaterials = materialsInTopic.map(material => {
            const progress = progressMap.get(material.learningMaterialID);
            let actualDBStatus = "미완료";
            let effectiveStatus = "미완료";
            let videoProgress = { currentTime: 0, totalDuration: null, progressPercent: 0 };

            if (progress) {
                actualDBStatus = progress.subUnitStatus;
                effectiveStatus = progress.subUnitStatus;

                if (progress.videoProgress) {
                    videoProgress = {
                        currentTime: progress.videoProgress.currentTime || 0,
                        totalDuration: progress.videoProgress.totalDuration,
                        progressPercent: progress.videoProgress.progressPercent || 0
                    };
                }

                if (effectiveStatus === "진행 중" && videoProgress.progressPercent === 100) {
                    effectiveStatus = "완료";
                }
            }
            return {
                learningMaterialID: material.learningMaterialID,
                title: material.title,
                actualDBStatus: actualDBStatus,
                effectiveStatus: effectiveStatus,
                videoProgress: videoProgress,
            };
        });

        // ▼▼▼ overallProgressPercent 계산 로직 변경 시작 ▼▼▼
        let weightedProgressSum = 0;
        processedMaterials.forEach(pm => {
            if (pm.effectiveStatus === "완료") {
                completedCount++; // 유효 상태가 완료인 경우 completedCount 증가
                weightedProgressSum += 100;
            } else {
                weightedProgressSum += (pm.videoProgress.progressPercent || 0);
                if (pm.actualDBStatus === "진행 중") {
                    inProgressDbCount++; // DB상태가 "진행 중"인 것 카운트
                }
            }
        });

        const totalMaterialsInTopic = materialsInTopic.length;
        const overallProgressPercent = totalMaterialsInTopic > 0
            ? weightedProgressSum / totalMaterialsInTopic // 부분 진행도 반영
            : 0;
        // ▲▲▲ overallProgressPercent 계산 로직 변경 완료 ▲▲▲

        let lastStoppedMaterialInfo = null;
        for (let i = processedMaterials.length - 1; i >= 0; i--) {
            const pm = processedMaterials[i];
            if (pm.actualDBStatus === "진행 중") {
                lastStoppedMaterialInfo = {
                    learningMaterialID: pm.learningMaterialID,
                    title: pm.title,
                    subUnitStatus: pm.actualDBStatus,
                    videoProgress: pm.videoProgress,
                };
                break;
            }
        }
        if (!lastStoppedMaterialInfo) {
            for (let i = processedMaterials.length - 1; i >= 0; i--) {
                const pm = processedMaterials[i];
                if (pm.videoProgress.currentTime > 0 && pm.effectiveStatus !== "완료") {
                    lastStoppedMaterialInfo = {
                        learningMaterialID: pm.learningMaterialID,
                        title: pm.title,
                        subUnitStatus: pm.actualDBStatus,
                        videoProgress: pm.videoProgress,
                    };
                    break;
                }
            }
        }

        // ▼▼▼ nextMaterialToWatchInfo 로직 개선 시작 ▼▼▼
        let nextMaterialToWatchInfo = null;
        let firstNonCompleteIndex = -1;

        for (let i = 0; i < processedMaterials.length; i++) {
            if (processedMaterials[i].effectiveStatus !== "완료") {
                firstNonCompleteIndex = i;
                break;
            }
        }

        if (firstNonCompleteIndex !== -1) {
            const firstNonCompleteMaterial = processedMaterials[firstNonCompleteIndex];
            if (lastStoppedMaterialInfo &&
                lastStoppedMaterialInfo.learningMaterialID === firstNonCompleteMaterial.learningMaterialID &&
                firstNonCompleteMaterial.effectiveStatus !== "완료") {
                // 최근 학습 자료가 완료되지 않았고, 그것이 첫번째 미완료 자료와 같다면, 그 다음 자료를 "다음 학습"으로 설정
                if (firstNonCompleteIndex < processedMaterials.length - 1) {
                    const trulyNextMaterial = processedMaterials[firstNonCompleteIndex + 1];
                    nextMaterialToWatchInfo = {
                        learningMaterialID: trulyNextMaterial.learningMaterialID,
                        title: trulyNextMaterial.title,
                        subUnitStatus: trulyNextMaterial.actualDBStatus,
                        videoProgress: trulyNextMaterial.videoProgress,
                    };
                } else {
                    // 최근 학습 자료가 목록의 마지막이었고 완료되지 않았다면, "다음 학습"은 없음
                    nextMaterialToWatchInfo = null;
                }
            } else {
                // 그 외의 경우 (최근 학습 자료가 없거나, 완료되었거나, 첫 미완료 자료와 다른 경우)
                // 첫번째 미완료 자료를 "다음 학습"으로 설정
                nextMaterialToWatchInfo = {
                    learningMaterialID: firstNonCompleteMaterial.learningMaterialID,
                    title: firstNonCompleteMaterial.title,
                    subUnitStatus: firstNonCompleteMaterial.actualDBStatus,
                    videoProgress: firstNonCompleteMaterial.videoProgress,
                };
            }
        }
        // ▲▲▲ nextMaterialToWatchInfo 로직 개선 완료 ▲▲▲


        const finalDetailedProgress = processedMaterials.map(pm => ({
            learningMaterialID: pm.learningMaterialID,
            title: pm.title,
            status: pm.actualDBStatus,
            videoProgress: pm.videoProgress,
        }));

        const notStartedCount = totalMaterialsInTopic - completedCount - inProgressDbCount;

        res.status(200).json({
            topicId: topicId,
            userId: userId,
            totalMaterials: totalMaterialsInTopic,
            completedMaterials: completedCount,
            inProgressMaterials: inProgressDbCount, // DB상태 "진행 중"인 것
            notStartedMaterials: notStartedCount < 0 ? 0 : notStartedCount, // 음수 방지
            overallProgressPercent: parseFloat(overallProgressPercent.toFixed(2)), // 수정된 진행률 반영
            detailedProgress: finalDetailedProgress,
            lastStoppedMaterial: lastStoppedMaterialInfo,
            nextMaterialToWatch: nextMaterialToWatchInfo
        });

    } catch (error) {
        console.error(`Error fetching overall topic progress for topic ${topicId}, user ${userId}:`, error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
});
const fs = require('fs');
// 📌18 코드를 실행할 API (컴파일러)

app.post('/run-code', (req, res) => {
    const code = req.body.code;

    fs.writeFileSync('temp.js', code);

    exec('node temp.js', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message, output: stderr });
        }

        res.json({ output: stdout });
    });
});



const iconv = require('iconv-lite');
const cheerio = require('cheerio');
app.listen(3000, () => {
    console.log("Express server running on port 3000");
});
