process.stdout.write('\uFEFF'); // UTF-8 BOM �߰�
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/admin'); // ������ ��Ű��
const User = require('./models/user');   // ����� ��Ű��

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/lastProject', {});
        console.log('MongoDB ���� ����');

        // 1. ����� ���� ���� Ȯ��
        const existingUser = await User.findOne({ email: 'admin@example.com' });

        let user;
        if (!existingUser) {
            const hashedPassword = await bcrypt.hash('yourPassword123', 10);

            // userID�� ���� �ο��ϰų� UUID ��� ���� (��: 'user001')
            user = new User({
                userID: 'user001',
                name: '�����Ͱ�����',
                email: 'admin@example.com',
                password: hashedPassword,
                userPermission: '������',
            });

            await user.save();
            console.log('�ʱ� �����(admin) ������ �����Ǿ����ϴ�.');
        } else {
            user = existingUser;
            console.log('�����(admin) ������ �̹� �����մϴ�.');
        }

        // 2. ������ ���� ���� ���� Ȯ��
        const existingAdmin = await Admin.findOne({ adminID: 'admin001' });

        if (!existingAdmin) {
            const newAdmin = new Admin({
                adminID: 'admin001',
                userID: user._id,
                adminPermissions: ['����ڰ���', '�����ۼ�'],
            });

            await newAdmin.save();
            console.log('�ʱ� ������ ������ �ο��Ǿ����ϴ�.');
        } else {
            console.log('������ ������ �̹� �����մϴ�.');
        }

    } catch (error) {
        console.error('MongoDB ���� ����:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
