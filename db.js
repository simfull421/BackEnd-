const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/admin'); // Admin 스키마 경로에 맞게 수정할 것

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/lastProject', {});
        console.log('MongoDB 연결 성공');

        // 초기 관리자 계정 존재 여부 확인
        const existingAdmin = await Admin.findOne({ adminID: 'admin001' });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('yourPassword123', 10); // 비밀번호는 보안상 .env로 관리 추천

            const newAdmin = new Admin({
                adminID: 'admin001',
                username: 'masteradmin',
                email: 'admin@example.com',
                password: hashedPassword,
            });

            await newAdmin.save();
            console.log('초기 관리자 계정이 생성되었습니다.');
        } else {
            console.log(' 관리자 계정이 이미 존재합니다.');
        }

    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        process.exit(1); // 실패 시 프로세스 종료
    }
};

module.exports = connectDB;
