process.stdout.write('\uFEFF'); // UTF-8 BOM 추가
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/admin'); // 관리자 스키마
const User = require('./models/user');   // 사용자 스키마

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/lastProject', {});
        console.log('MongoDB 연결 성공');

        // 1. 사용자 존재 여부 확인
        const existingUser = await User.findOne({ email: 'admin@example.com' });

        let user;
        if (!existingUser) {
            const hashedPassword = await bcrypt.hash('yourPassword123', 10);

            // userID는 직접 부여하거나 UUID 사용 가능 (예: 'user001')
            user = new User({
                userID: 'user001',
                name: '마스터관리자',
                email: 'admin@example.com',
                password: hashedPassword,
                userPermission: '관리자',
            });

            await user.save();
            console.log('초기 사용자(admin) 계정이 생성되었습니다.');
        } else {
            user = existingUser;
            console.log('사용자(admin) 계정이 이미 존재합니다.');
        }

        // 2. 관리자 권한 존재 여부 확인
        const existingAdmin = await Admin.findOne({ adminID: 'admin001' });

        if (!existingAdmin) {
            const newAdmin = new Admin({
                adminID: 'admin001',
                userID: user._id,
                adminPermissions: ['사용자관리', '뉴스작성'],
            });

            await newAdmin.save();
            console.log('초기 관리자 권한이 부여되었습니다.');
        } else {
            console.log('관리자 권한이 이미 존재합니다.');
        }

    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
