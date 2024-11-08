const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Models/Users');
const LoggedIn = require('../Models/LoggedIn');
const asyncHandler = require('express-async-handler');

const JWT_SECRET = 'taskSchedulerAppSecretKey';

const UserRegistration = asyncHandler(async (req, res) => {
    console.log("/UserRegister")
    try {

        const { userName, password, confirmPassword, userRole } = req.body;
        console.log(userName, password, confirmPassword, userRole);

        const existingUser = await User.findOne({ userName });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        if (password.length < 8 || password !== confirmPassword) {
            return res.status(400).json({ message: 'Password must be at least 8 characters and match the confirmation password' });
        }
        if (userRole != 'Subordinate' && userRole != 'Supervisor'){
        return res.status(400).json({ message: 'Wrong UserRole' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            userName,
            userPassword: hashedPassword,
            userRole,
            subordinateList: [],
            supervisorList: []
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
});

const UserLogin = asyncHandler(async (req, res) => {
    console.log("/UserLogin");
    try{
        const { userName, password } = req.body;

        const user = await User.findOne({ userName });
        if (!user) {
            return res.status(400).json({ message: 'Wrong Username or Password' });
        }

        const isMatch = await bcrypt.compare(password, user.userPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Wrong Username or Password' });
        }

        const token = jwt.sign(
            { userId: user._id, userName: user.userName, userRole: user.userRole },
            JWT_SECRET,
            { expiresIn: '1d' } 
        );

        const loggedInUser = new LoggedIn({ userId: user._id });
        await loggedInUser.save();

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Error Logging In user', error });
    }
});

const UserLogout = asyncHandler(async (req, res) => {
    await console.log('/UserLogout');
    const { UserID } = req.body.params;

    try {

        await LoggedIn.deleteMany({ userId: UserID });
        return res.status(200).json({ message: "Logged Out Successfully" });
        
    } catch (error) {
        return res.status(500).json({ message: "Error logging out", error });
    }
});

module.exports = {
    UserRegistration,
    UserLogin,
    UserLogout
};