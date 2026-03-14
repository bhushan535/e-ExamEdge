const mongoose = require('mongoose');
require('dotenv').config();

async function purgeTeacher() {
    try {
        const uri = "mongodb://localhost:27017/test";
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        const User = require('./backend/models/User');
        const TeacherProfile = require('./backend/models/TeacherProfile');
        const Organization = require('./backend/models/Organization');

        const email = "itdeve00@gmail.com";
        const user = await User.findOne({ email });

        if (user) {
            console.log(`Purging user: ${user.email} (${user._id})`);
            await TeacherProfile.deleteMany({ userId: user._id });
            await Organization.updateMany({}, { $pull: { teachers: { userId: user._id } } });
            await User.deleteOne({ _id: user._id });
            console.log("User and related data purged.");
        } else {
            console.log("User not found.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Purge failed:", err);
        process.exit(1);
    }
}

purgeTeacher();
