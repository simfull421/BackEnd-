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

const app = express();
app.use(express.json());

app.use(cors());  // 모든 도메인에서 접근 허용





const router = express.Router();
// dialogflow
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/api/dialogflow', require('./dialogflow'));

if (process.env.NODE_ENV === "production") {

    app.use(express.static("client/build"));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
    });
}



app.use(bodyParser.json());

// 로그인 API




// JWT 인증 미들웨어
/*const authenticateJWT = (req, res, next) => {
    // googleId가 요청 본문에 있으면 JWT 인증을 건너뛰고 바로 진행
    if (req.body.googleId) {
        return next();  // 구글 로그인인 경우 인증을 건너뛰고 다음 미들웨어로 넘어감
    }

    // Authorization 헤더에서 토큰 추출 (Bearer <token> 형태)
    const token = req.header('Authorization')?.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    // JWT 토큰 검증
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        }

        // 사용자 정보 저장 (다음 라우트에서 사용 가능)
        req.user = user; // 인증된 사용자 정보 저장
        next(); // 다음 미들웨어로 진행
    });
};
*/
// 보호된 API 엔드포인트
/*app.get('/api/protected', authenticateJWT, (req, res) => {
    res.json({ message: '보호된 정보', user: req.user }); // 인증된 사용자 정보 반환
});*/

// **로그인 API (MongoDB + Mongoose)**
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 입력된 값 로그 출력
        console.log('입력된 이메일:', email);
        console.log('입력된 비밀번호:', password);

        // **관리자 계정 확인**
        if (email === 'admin' && password === '1234') {
            console.log('관리자 계정으로 로그인되었습니다.');

            // 관리자 토큰 생성
            const authToken = jwt.sign(
                { id: 'admin', email: 'admin', isAdmin: true },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.status(200).json({
                authToken,
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

        // **JWT 토큰 생성**
        const authToken = jwt.sign(
            { id: user._id, email: user.email, isAdmin: false },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            authToken,
            userId: user._id,
            isAdmin: false
        });

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
});





/*import mongoose from 'mongoose';

// MongoDB 연결 URI (환경변수 사용 추천)
const dbURI = 'mongodb://localhost:27017/mydatabase'; // 데이터베이스 이름 변경 가능

// MongoDB 연결
mongoose.connect(dbURI)
    .then(() => {
        console.log('데이터베이스 연결 성공');
        createCollections(); // 필요한 컬렉션(스키마) 생성
        fetchUserData();
        // insertTestData(); // 필요 시 주석 해제
    })
    .catch(err => console.error('데이터베이스 연결 실패:', err.message));

// 스키마 및 모델 정의
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    age: Number
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

export { User }; // 다른 파일에서 import할 수 있도록 export 추가
*/







// 인증 코드를 저장할 객체
const verificationCodes = {};

// 인증 코드 생성 함수
const generateVerificationCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // 사용할 문자 집합
    let code = '';
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex]; // 랜덤으로 문자 추가
    }
    return code; // 생성된 인증 코드 반환
};

// Nodemailer transporter 설정

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
    },
});

module.exports = { generateVerificationCode, transporter, verificationCodes };



// 인증 이메일 발송 라우트
app.post('/api/send-verification-email', (req, res) => {
    console.log(req.body); // 요청 본문 로그 확인 (디버깅용)

    const { email } = req.body; // 이메일 추출

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




// 인증 코드 검증 라우트
app.post('/api/verify-code', (req, res) => {
    const { email, code } = req.body;

    console.log('Received email:', email); // 수신된 이메일 로그
    console.log('Received code:', code); // 수신된 인증 코드 로그
    console.log('Stored code:', verificationCodes[email]); // 저장된 인증 코드 로그

    // 입력된 이메일에 대한 인증 코드 검증
    if (verificationCodes[email] && verificationCodes[email] === code) {
        delete verificationCodes[email]; // 인증이 완료되면 코드 삭제
        res.status(200).json({ message: '인증이 완료되었습니다.' });
    } else {
        res.status(400).json({ error: '유효하지 않은 인증 코드입니다.' });
    }
});




// **회원가입 API (MongoDB + Mongoose)**
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




app.listen(3000, () => {
    console.log("Express server running on port 3000");
});
