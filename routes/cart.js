const { Cart } = require('../models/cart');
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart management
 */

/**
 * @swagger
 * /cart/{userId}:
 *   get:
 *     summary: Get cart for a user
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User cart data
 */
router.get('/:userId', async (req, res) => {
    const cart = await Cart.findOne({ user: req.params.userId })
        .populate('cartItems.product');
    if (!cart) return res.status(200).json({ user: req.params.userId, cartItems: [], totalPrice: 0 });
    res.send(cart);
});

/**
 * @swagger
 * /cart/AddItems:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user, productId, price]
 *             properties:
 *               user:
 *                 type: string
 *               productId:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Cart cannot be updated
 */
router.post('/AddItems', async (req, res) => {
    let cart = await Cart.findOne({ user: req.body.user });

    if (!cart) {
        cart = new Cart({
            user: req.body.user,
            cartItems: [{
                product:  req.body.productId,
                quantity: 1,
                price:    req.body.price,
            }],
            totalPrice: req.body.price,
        });
    } else {
        const exists = cart.cartItems.find(
            item => item.product.toString() === req.body.productId
        );

        if (exists) {
            exists.quantity += 1;
        } else {
            cart.cartItems.push({
                product:  req.body.productId,
                quantity: 1,
                price:    req.body.price,
            });
        }

        cart.totalPrice = cart.cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity, 0
        );
    }

    cart = await cart.save();
    if (!cart) return res.status(400).send('Cart cannot be updated');
    cart = await cart.populate('cartItems.product'); // ✅ populate
    res.send(cart);
});

/**
 * @swagger
 * /cart/items/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
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
 *         description: Item removed from cart
 *       400:
 *         description: Cart not found
 */
router.delete('/items/:productId', async (req, res) => {
    let cart = await Cart.findOne({ user: req.body.userId });
    if (!cart) return res.status(400).send('Cart not found');

    cart.cartItems = cart.cartItems.filter(
        item => item.product.toString() !== req.params.productId
    );

    cart.totalPrice = cart.cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    cart = await cart.save();
    cart = await cart.populate('cartItems.product'); // ✅ populate
    res.send(cart);
});

/**
 * @swagger
 * /cart/items/{productId}:
 *   put:
 *     summary: Update item quantity in cart
 *     tags: [Cart]
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
 *             required: [userId, quantity]
 *             properties:
 *               userId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Quantity updated
 *       400:
 *         description: Cart not found
 */
router.put('/items/:productId', async (req, res) => {
    let cart = await Cart.findOne({ user: req.body.userId });
    if (!cart) return res.status(400).send('Cart not found');

    const item = cart.cartItems.find(
        item => item.product.toString() === req.params.productId
    );

    if (item) {
        item.quantity = req.body.quantity;
    }

    cart.totalPrice = cart.cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    cart = await cart.save();
    cart = await cart.populate('cartItems.product'); // ✅ populate
    res.send(cart);
});

/**
 * @swagger
 * /cart/{userId}:
 *   delete:
 *     summary: Clear entire cart for a user
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cart cleared
 *       400:
 *         description: Cart not found
 */
router.delete('/:userId', async (req, res) => {
    const cart = await Cart.findOneAndDelete({ user: req.params.userId });
    if (!cart) return res.status(400).send('Cart not found');
    res.status(200).json({ success: true, message: 'Cart cleared' });
});

module.exports = router;