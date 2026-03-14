const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' }); // Look in current (backend) dir

async function runPurge() {
    try {
        const uri = process.env.MONGO_URI || "mongodb://localhost:27017/test";
        console.log(`Connecting to: ${uri}`);
        await mongoose.connect(uri);
        const User = require('./models/User');
        const TeacherProfile = require('./models/TeacherProfile');
        const Organization = require('./models/Organization');

        const email = "itdeve00@gmail.com";
        const user = await User.findOne({ email });

        if (user) {
            console.log(`Found user ${email} with ID ${user._id}. Purging...`);
            await TeacherProfile.deleteMany({ userId: user._id });
            await Organization.updateMany({}, { $pull: { teachers: { userId: user._id } } });
            await User.deleteOne({ _id: user._id });
            console.log("Purge successful.");
        } else {
            console.log("Teacher not found.");
        }
    } catch (err) {
        console.error("Purge Error:", err);
    } finally {
        mongoose.disconnect();
    }
}
runPurge();
