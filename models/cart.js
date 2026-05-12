const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    price:    { type: Number, required: true },
});

const cartSchema = new mongoose.Schema({
    user:      { type: String, required: true },
    cartItems: [cartItemSchema],
    totalPrice: { type: Number, default: 0 },
});

exports.Cart = mongoose.model('Cart', cartSchema);