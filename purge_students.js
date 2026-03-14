const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Ensure we load env relative to this script
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const User = require('./backend/models/User');
const Student = require('./backend/models/Student');
const Class = require('./backend/models/Class');

const cleanup = async () => {
    try {
        console.log('--- Database Cleanup Started ---');
        console.log('URI:', process.env.MONGODB_URI ? 'FOUND' : 'NOT FOUND');
        
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Delete all students from User collection
        const userDeleteRes = await User.deleteMany({ role: 'student' });
        console.log(`Deleted ${userDeleteRes.deletedCount} students from User collection.`);

        // 2. Delete all documents from Student collection
        const studentDeleteRes = await Student.deleteMany({});
        console.log(`Deleted ${studentDeleteRes.deletedCount} documents from Student collection.`);

        // 3. Clear the students array in all Classes
        const classUpdateRes = await Class.updateMany({}, { $set: { students: [] } });
        console.log(`Cleared student rosters in ${classUpdateRes.modifiedCount} classes.`);

        console.log('--- Cleanup Successful! ---');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup Error:', err);
        process.exit(1);
    }
};

cleanup();
