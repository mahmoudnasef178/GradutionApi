const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const multer = require('multer');

const User = require('../models/User');
const ProfileImage = require('../models/ProfileImage');

// Multer - store file in memory as buffer (no disk needed)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // max 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    const userList = await User.find().select('-passwordHash');
    if (!userList) {
        return res.status(500).json({ success: false })
    }
    res.send(userList);
})

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data
 *       500:
 *         description: User not found
 */
router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
        return res.status(500).json({ success: false, message: 'The user with the given ID not exists' })
    }
    res.status(200).send(user)
})

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *               isAdmin:
 *                 type: boolean
 *               street:
 *                 type: string
 *               apartment:
 *                 type: string
 *               zip:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created successfully
 *       404:
 *         description: User cannot be created
 */
router.post('/register', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country
    })

    user = await user.save();

    if (!user)
        return res.status(404).send('User cannot be created')
    res.send(user);
})

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       400:
 *         description: Invalid email or password
 */
router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    const secret = process.env.jwt_SECRET;

    if (!user) {
        return res.status(400).send('User with given Email not found');
    }

    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign({
            userID: user.id,
            isAdmin: user.isAdmin
        }, secret, { expiresIn: '1d' })
        return res.status(200).send({
            user: user.email,
            userId: user.id,
            token: token
        });
    } else {
        return res.status(400).send('Password is mismatch');
    }
})

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', (req, res) => {
    User.findByIdAndRemove(req.params.id).then(user => {
        if (user) {
            return res.status(200).json({ success: true, message: 'User deleted successfully' })
        } else {
            return res.status(404).json({ success: false, message: 'User cannot find' })
        }
    }).catch(err => {
        return res.status(400).json({ success: false, error: err })
    })
})

/**
 * @swagger
 * /users/get/count:
 *   get:
 *     summary: Get total number of users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User count
 *       500:
 *         description: Server error
 */
router.get('/get/count', async (req, res) => {
    const userCount = await User.countDocuments((count) => count);
    if (!userCount) {
        return res.status(500).json({ success: false })
    }
    res.status(200).send({ userCount: userCount });
})

/**
 * @swagger
 * /users/{id}/profile-image:
 *   post:
 *     summary: Upload profile image for a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: No image provided
 *       404:
 *         description: User not found
 */
router.post('/:id/profile-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const profile = await ProfileImage.findByIdAndUpdate(
        req.params.id,
        { profileImage: base64Image },
        { new: true, upsert: true }
    );

    res.status(200).json({ success: true, profileImage: profile.profileImage });
});

/**
 * @swagger
 * /users/{id}/profile-image:
 *   get:
 *     summary: Get profile image for a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns profileImage field
 *       404:
 *         description: User not found
 */
router.get('/:id/profile-image', async (req, res) => {
    const profile = await ProfileImage.findById(req.params.id);
    res.status(200).json({ success: true, profileImage: profile ? profile.profileImage : '' });
});

module.exports = router;