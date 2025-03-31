const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/lastProject', {
        });
        console.log('MongoDB ���� ����');
    } catch (error) {
        console.error('MongoDB ���� ����:', error.message);
        process.exit(1); // ���� �� ���μ��� ����
    }
};

module.exports = connectDB;