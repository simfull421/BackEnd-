require('dotenv').config();
const cors = require('cors');
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));  // form data를 처리하기 위한 미들웨어
app.use(cors());  // 모든 도메인에서 접근 허용
// 세션 설정
app.use(session({
    secret: 'your_secret_key', // 세션 암호화 키
    resave: false,             // 세션이 변경되지 않더라도 계속 저장할지 여부
    saveUninitialized: true,   // 초기화되지 않은 세션도 저장할지 여부
    cookie: { secure: false }  // HTTPOnly 및 Secure 설정 (여기서는 개발 환경이라 false)
}));

const router = express.Router();
// dialogflow
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const dialogflowRouter = require('./dialogflow');  // dialogflow.js 파일 임포트
// Dialogflow 라우터 사용
// Dialogflow 라우터 설정

app.use('/', dialogflowRouter); 

// 정적 파일 제공 (정적 파일이 위치한 디렉토리 설정)
// "/api" 경로는 제거하고 직접적인 build/web 디렉토리 경로를 지정합니다.
app.use(express.static(path.resolve('E:/3/nods/frontend_new/build/web')));

// 정적 파일 제공 시, 경로 확인
app.use('/build/web', express.static(path.resolve('E:/3/nods/frontend_new/build/web'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            console.log(`Serving file: ${filePath}`); // 로그로 파일 경로 확인
            res.setHeader('Content-Type', 'application/javascript'); // .js 파일에 대해 JS MIME 타입 설정
        }
    }
}));
// flutter_bootstrap.js 파일에 대한 명시적 처리
app.get('/build/web/flutter_bootstrap.js', (req, res) => {
    const filePath = path.resolve('E:/3/nods/frontend_new/build/web/flutter_bootstrap.js');
    console.log(`Sending flutter_bootstrap.js from: ${filePath}`); // 로그로 경로 확인
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error sending file: ", err);
            res.status(404).send('File not found');
        }
    });
});



app.use(bodyParser.json());

//0: 몽고 db 사용

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    profilePicture: { type: String },
    bio: { type: String }
});

const User = mongoose.model('User', userSchema);
module.exports = User;



// **1. 로그인 API**
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 입력된 값 로그 출력
        console.log('입력된 이메일:', email);
        console.log('입력된 비밀번호:', password);

        // **관리자 계정 확인**
        if (email === 'admin' && password === '1234') {
            console.log('관리자 계정으로 로그인되었습니다.');

            // 관리자 세션 저장
            req.session.user = { id: 'admin', email: 'admin', isAdmin: true };

            return res.status(200).json({
                message: '관리자 계정으로 로그인되었습니다.',
                userId: 'admin',
                isAdmin: true
            });
        }

        // **MongoDB에서 사용자 정보 찾기**
        const user = await User.findOne({ email });

        if (!user) {
            console.log('사용자 없음');
            return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }

        // 데이터베이스에 저장된 아이디와 비밀번호 출력
        console.log('저장된 이메일:', user.email);
        console.log('저장된 비밀번호:', user.passwordHash); // 해시된 비밀번호

        // **비밀번호 비교**
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            console.log('비밀번호 불일치');
            return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }

        // **세션에 사용자 정보 저장**
        req.session.user = { id: user._id, email: user.email, isAdmin: false };

        return res.status(200).json({
            message: '로그인 성공',
            userId: user._id,
            isAdmin: false
        });

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
});

// **2. 로그아웃 API**
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
        }
        res.status(200).json({ message: '로그아웃 성공' });
    });
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


// **6. 회원가입 API**
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // **이메일 중복 확인**
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
        }

        // **비밀번호 해시화**
        const hashedPassword = await bcrypt.hash(password, 10);

        // **새로운 사용자 생성**
        const newUser = new User({
            email,
            passwordHash: hashedPassword, // passwordHash로 저장
        });

        await newUser.save(); // MongoDB에 저장
        res.status(200).json({ message: '회원가입을 성공했습니다!' });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ error: '회원가입에 실패했습니다.' });
    }
});


// **7. 세션 생성, 유효성, 무효화 API**  
// **. 세션 유효성 검사 API**
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({
            message: '세션 유효',
            user: req.session.user
        });
    } else {
        res.status(401).json({ message: '로그인 상태가 아닙니다.' });
    }
});

// **. 로그아웃 및 세션 무효화 API**
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
        }
        res.status(200).json({ message: '로그아웃 성공' });
    });
});

// **8. 아이디 찾기 API**  
// (이메일로 사용자 정보를 찾아 해당 이메일로 아이디를 발송하는 API)
app.post('/api/find-username', async (req, res) => {
    const { email } = req.body;

    try {
        // 이메일로 사용자 정보 찾기
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: '해당 이메일로 등록된 사용자가 없습니다.' });
        }

        // 이메일로 아이디 전송
        const mailOptions = {
            from: 'your-email@gmail.com',  // 보낸 사람 이메일
            to: email,  // 받는 사람 이메일
            subject: '아이디 찾기',
            text: `안녕하세요, ${user.email}님의 아이디는 ${user.email}입니다.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
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
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // 이메일로 사용자 찾기
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: '해당 이메일로 등록된 사용자가 없습니다.' });
        }

        // 비밀번호 리셋을 위한 토큰 생성
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;  // 1시간 후 만료

        // MongoDB에 업데이트된 사용자 정보 저장
        await user.save();

        // 리셋 링크 이메일 전송
        const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: '비밀번호 재설정',
            text: `안녕하세요, 비밀번호를 재설정하려면 아래 링크를 클릭하세요: \n\n ${resetLink}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ error: '이메일 전송 중 오류가 발생했습니다.' });
            }
            res.status(200).json({ message: '비밀번호 리셋 링크가 이메일로 전송되었습니다.' });
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

app.get('/api/news', async (req, res) => {
    const searchKeyword = '컴퓨터 소프트웨어';
    const encText = encodeURIComponent(searchKeyword);
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encText}&start=1&display=100`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret
            }
        });

        // JSON 응답을 그대로 반환
        console.log('✅ 변환된 JSON 데이터:', JSON.stringify(response.data, null, 2));
        res.json(response.data);  // 변환된 JSON 데이터 반환
    } catch (error) {
        console.error('❗ API 요청 실패:', error?.response?.data || error.message);
        res.status(error?.response?.status || 500).json({
            error: '뉴스 데이터를 가져오는 중 오류가 발생했습니다.',
            details: error?.response?.data || error.message
        });
    }
});


// 13 학습 진행도 모델
const progressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalLessons: { type: Number, required: true },
    completedLessons: { type: Number, required: true },
    incompleteLessons: { type: Number, required: true }
});
const Progress = mongoose.model('Progress', progressSchema);

// 14 학습 예제 모델
const exampleSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    examples: [{ type: String }]
});
const Example = mongoose.model('Example', exampleSchema);

// 📌 15 학습 진행도 조회 (GET /progress/:userId)
app.get('/progress/:userId', async (req, res) => {
    try {
        const progress = await Progress.findOne({ userId: req.params.userId });
        if (!progress) {
            return res.status(404).json({ message: '학습 진행도를 찾을 수 없음' });
        }
        res.json(progress);
    } catch (error) {
        res.status(500).json({ message: '서버 오류', error });
    }
});

// 📌 16 학습 진행도 기록 추가 또는 갱신 (POST /progress/:userId)
app.post('/progress/:userId', async (req, res) => {
    try {
        const { totalLessons, completedLessons, incompleteLessons } = req.body;
        let progress = await Progress.findOne({ userId: req.params.userId });

        if (!progress) {
            progress = new Progress({
                userId: req.params.userId,
                totalLessons,
                completedLessons,
                incompleteLessons
            });
        } else {
            progress.totalLessons = totalLessons;
            progress.completedLessons = completedLessons;
            progress.incompleteLessons = incompleteLessons;
        }

        await progress.save();
        res.json({ message: '학습 진행도 저장 완료', progress });
    } catch (error) {
        res.status(500).json({ message: '서버 오류', error });
    }
});

// 📌17  학습 예제 조회 (GET /examples/:topic)
app.get('/examples/:topic', async (req, res) => {
    try {
        const example = await Example.findOne({ topic: req.params.topic });
        if (!example) {
            return res.status(404).json({ message: '해당 주제의 예제가 없음' });
        }
        res.json(example);
    } catch (error) {
        res.status(500).json({ message: '서버 오류', error });
    }
});
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
app.listen(3000, () => {
    console.log("Express server running on port 3000");
});
