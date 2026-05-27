const { Cart } = require('../models/cart');
const express = require('express');
const router = express.Router();

// ✅ الـ specific routes الأول
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
    cart = await cart.populate('cartItems.product');
    res.send(cart);
});

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
    cart = await cart.populate('cartItems.product');
    res.send(cart);
});

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
    cart = await cart.populate('cartItems.product');
    res.send(cart);
});

// ✅ الـ /:userId الأخير دايماً
router.get('/:userId', async (req, res) => {
    const cart = await Cart.findOne({ user: req.params.userId })
        .populate('cartItems.product');
    if (!cart) return res.status(200).json({ user: req.params.userId, cartItems: [], totalPrice: 0 });
    res.send(cart);
});

router.delete('/:userId', async (req, res) => {
    const cart = await Cart.findOneAndDelete({ user: req.params.userId });
    if (!cart) return res.status(400).send('Cart not found');
    res.status(200).json({ success: true, message: 'Cart cleared' });
});

module.exports = router;