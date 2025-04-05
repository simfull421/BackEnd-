const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/admin'); // Admin ��Ű�� ��ο� �°� ������ ��

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/lastProject', {});
        console.log('MongoDB ���� ����');

        // �ʱ� ������ ���� ���� ���� Ȯ��
        const existingAdmin = await Admin.findOne({ adminID: 'admin001' });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('yourPassword123', 10); // ��й�ȣ�� ���Ȼ� .env�� ���� ��õ

            const newAdmin = new Admin({
                adminID: 'admin001',
                username: 'masteradmin',
                email: 'admin@example.com',
                password: hashedPassword,
            });

            await newAdmin.save();
            console.log('�ʱ� ������ ������ �����Ǿ����ϴ�.');
        } else {
            console.log(' ������ ������ �̹� �����մϴ�.');
        }

    } catch (error) {
        console.error('MongoDB ���� ����:', error.message);
        process.exit(1); // ���� �� ���μ��� ����
    }
};

module.exports = connectDB;
