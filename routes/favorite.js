const { Favorite } = require('../models/favorite');
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: Favorites management
 */

/**
 * @swagger
 * /Favorite/AddItems:
 *   post:
 *     summary: Add item to favorites
 *     tags: [Favorites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user, productId]
 *             properties:
 *               user:
 *                 type: string
 *                 description: User ID
 *               productId:
 *                 type: string
 *                 description: Product ID to add
 *     responses:
 *       200:
 *         description: Item added to favorites
 *       400:
 *         description: Cannot add to favorites
 */
router.post('/AddItems', async (req, res) => {
    let favorite = await Favorite.findOne({ user: req.body.user });

    if (!favorite) {
        favorite = new Favorite({
            user: req.body.user,
            favoriteItems: [req.body.productId]
        });
    } else {
        if (!favorite.favoriteItems.includes(req.body.productId)) {
            favorite.favoriteItems.push(req.body.productId);
        }
    }
    favorite = await favorite.save();
    if (!favorite) return res.status(400).send('The favorite cannot be created');
    res.send(favorite);
});

/**
 * @swagger
 * /Favorite/{userId}:
 *   get:
 *     summary: Get user favorites
 *     tags: [Favorites]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User favorites list
 *       500:
 *         description: Server error
 */
router.get('/:userId', async (req, res) => {
    const favoriteList = await Favorite.findOne({ user: req.params.userId }).populate('favoriteItems');
    if (!favoriteList) return res.status(500).json({ success: false });
    res.send(favoriteList);
});

/**
 * @swagger
 * /Favorite/items/{productId}:
 *   delete:
 *     summary: Remove item from favorites
 *     tags: [Favorites]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item removed from favorites
 *       400:
 *         description: User not found
 */
router.delete('/items/:productId', async (req, res) => {
    let favorite = await Favorite.findOneAndUpdate(
        { user: req.body.userId },
        { $pull: { favoriteItems: req.params.productId } },
        { new: true }
    );
    if (!favorite) return res.status(400).send('User not found');
    res.send(favorite);
});

module.exports = router;