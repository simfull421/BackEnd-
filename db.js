const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/lastProject', {
        });
        console.log('MongoDB 연결 성공');
    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        process.exit(1); // 실패 시 프로세스 종료
    }
};

module.exports = connectDB;