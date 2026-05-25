const express = require('express');
const router = express.Router();

const Order = require('../models/order');
const OrderItem = require('../models/order-item');

const TELEGRAM_BOTS = [
    { token: '8906818201:AAHipfIZHt1hnlfLAeTzhTBj56eP4Uirc8w', chatId: '1036805791' },
    { token: '8381404124:AAEH_jXb6LFovwR4wYIZdKmB2cpPYf6QtQ4', chatId: '5686325355' }
];

const sendTelegramMessage = async (message) => {
    try {
        await Promise.all(
            TELEGRAM_BOTS.map(bot =>
                fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: bot.chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                })
            )
        );
    } catch (err) {
        console.log('Telegram error:', err.message);
    }
};

// ✅ الـ specific routes الأول دايماً
router.get('/get/count', async (req, res) => {
    const orderCount = await Order.countDocuments();
    if (!orderCount) return res.status(500).json({ success: false });
    res.status(200).send({ orderCount: orderCount });
});

router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } }
    ]);
    if (!totalSales) return res.status(400).send('the order sales cannot be generated');
    res.send({ totalsales: totalSales.pop().totalsales });
});

router.get('/get/usersorders/:userid', async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userid })
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }
        }).sort({ 'dateOrdered': -1 });
    if (!userOrderList) return res.status(500).json({ success: false });
    res.send(userOrderList);
});

router.get('/', async (req, res) => {
    const orderList = await Order.find()
        .populate('user', 'name')
        .sort({ 'dateOrdered': -1 })
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }
        });
    if (!orderList) return res.status(500).json({ success: false });
    res.send(orderList);
});

router.post('/BasketOrder', async (req, res) => {
    try {
        const orderItemsIds = await Promise.all(req.body.orderItems.map(async (orderItem) => {
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product
            });
            newOrderItem = await newOrderItem.save();
            return newOrderItem._id;
        }));

        const totalPrices = await Promise.all(orderItemsIds.map(async (orderItemId) => {
            const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
            if (orderItem && orderItem.product) {
                return orderItem.product.price * orderItem.quantity;
            }
            return 0;
        }));

        const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

        const orderItemsDetails = await Promise.all(orderItemsIds.map(async (orderItemId) => {
            const orderItem = await OrderItem.findById(orderItemId).populate('product', 'name price');
            return `• ${orderItem.product.name} x${orderItem.quantity} = $${orderItem.product.price * orderItem.quantity}`;
        }));

        let order = new Order({
            orderItems: orderItemsIds,
            shippingAddress1: req.body.shippingAddress1,
            shippingAddress2: req.body.shippingAddress2,
            city: req.body.city,
            zip: req.body.zip,
            country: req.body.country,
            phone: req.body.phone,
            status: req.body.status,
            totalPrice: totalPrice,
            user: req.body.user,
        });

        order = await order.save();
        if (!order) return res.status(404).send('Order cannot be created');

        const message = `
🛍️ <b>New Order Received!</b>

👤 <b>Name:</b> ${req.body.firstName || ''} ${req.body.lastName || ''}
📦 <b>Order ID:</b> <code>${order._id}</code>
📍 <b>Address:</b> ${req.body.shippingAddress1}, ${req.body.city}, ${req.body.country || ''}
📞 <b>Phone:</b> ${req.body.phone}

🧾 <b>Items:</b>
${orderItemsDetails.join('\n')}

💰 <b>Total:</b> $${totalPrice}
🕐 <b>Date:</b> ${new Date().toLocaleString()}
        `;

        await sendTelegramMessage(message);
        res.send(order);

    } catch (err) {
        console.log('BasketOrder error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id,
        { status: req.body.status },
        { new: true }
    );
    if (!order) return res.status(404).send('Order cannot be updated');
    res.send(order);
});

router.delete('/:id', (req, res) => {
    Order.findByIdAndRemove(req.params.id).then(async order => {
        if (order) {
            await Promise.all(order.orderItems.map(orderItem =>
                OrderItem.findByIdAndRemove(orderItem)
            ));
            return res.status(200).json({ success: true, message: 'Order deleted successfully' });
        } else {
            return res.status(404).json({ success: false, message: 'Order cannot find' });
        }
    }).catch(err => {
        return res.status(400).json({ success: false, error: err });
    });
});

// ✅ الـ /:id الأخير دايماً
router.get('/:id', async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'name');
    if (!order) return res.status(500).json({ success: false });
    res.send(order);
});

module.exports = router;