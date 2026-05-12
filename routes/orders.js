const express = require('express');
const router = express.Router();

const Order = require('../models/order');
const OrderItem = require('../models/order-item');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /Order:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of all orders
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    const orderList = await Order.find()
    .populate('user' ,'name').sort({'dateOrdered':-1})
    .populate({
        path: 'orderItems', populate: {
            path: 'product', populate: 'category'}
    });

    if (!orderList) {
        res.status(500).json({ success: false })
    }
    res.send(orderList)
})

/**
 * @swagger
 * /Order/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order data
 *       500:
 *         description: Order not found
 */
router.get('/:id', async (req, res) => {
    const order = await Order.findById(req.params.id).populate('name', 'user');
    if (!order) {
        res.status(500).json({ success: false })
    }
    res.send(order)
})

/**
 * @swagger
 * /Order/BasketOrder:
 *   post:
 *     summary: Create a new order from basket
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderItems, user]
 *             properties:
 *               orderItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               shippingAddress1:
 *                 type: string
 *               shippingAddress2:
 *                 type: string
 *               city:
 *                 type: string
 *               zip:
 *                 type: string
 *               country:
 *                 type: string
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *               user:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order created
 *       404:
 *         description: Order cannot be created
 */
router.post('/BasketOrder', async (req, res) => {
    const orderItemsIds = Promise.all(req.body.orderItems.map( async (orderItem) => {
        let newOrderItem = new OrderItem({
            quantity: orderItem.quantity,
            product: orderItem.product
        })

        newOrderItem = await newOrderItem.save();
        return newOrderItem._id;
    }))
    const orderItemsIdsResolved = await orderItemsIds;
    const totalPrices = await Promise.all(orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
        if (orderItem && orderItem.product) {
            const price = orderItem.product.price * orderItem.quantity;
            return price;
        }
        return 0;
    }));

    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

    let order = new Order({
        orderItems: orderItemsIdsResolved,
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
    if (!order)
        return res.status(404).send('Order cannot be created')
    res.send(order);
})

/**
 * @swagger
 * /Order/{id}:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated
 *       404:
 *         description: Order not found
 */
router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, {
        status: req.body.status,
    }, { new: true })

    if (!order)
        return res.status(404).send('Order cannot be created')
    res.send(order);
})

/**
 * @swagger
 * /Order/{id}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 */
router.delete('/:id', (req, res) => {
    Order.findByIdAndRemove(req.params.id).then(async order => {
        if (order) {
            await order.orderItems.map(async orderItem =>{
                await OrderItem.findByIdAndRemove(orderItem)
            })
            return res.status(200).json({ success: true, message: 'Order deleted successfully' })
        } else {
            return res.status(404).json({ success: false, message: 'Order cannot find' })
        }
    }).catch(err => {
        return res.status(400).json({ success: false, error: err })
    })
})

/**
 * @swagger
 * /Order/get/count:
 *   get:
 *     summary: Get total number of orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Order count
 */
router.get('/get/count', async (req, res) => {
    const orderCount = await Order.countDocuments((count) => count);
    if (!orderCount) {
        res.status(500).json({ success: false })
    }
    res.status(200).send({ orderCount: orderCount });
})

/**
 * @swagger
 * /Order/get/totalsales:
 *   get:
 *     summary: Get total sales amount
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Total sales
 *       400:
 *         description: Sales cannot be generated
 */
router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: {_id: null, totalsales:{ $sum :'$totalPrice'}}}
    ])

    if (!totalSales){
        return res.status(400).send('the order sales cannot be generated')
    }
    res.send({ totalsales: totalSales.pop().totalsales})
})

/**
 * @swagger
 * /Order/get/usersorders/{userid}:
 *   get:
 *     summary: Get all orders for a specific user
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user orders
 *       500:
 *         description: Server error
 */
router.get('/get/usersorders/:userid', async (req, res) => {
    const userOrderList = await Order.find({user: req.params.userid})
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }
        }).sort({ 'dateOrdered': -1 });

    if (!userOrderList) {
        res.status(500).json({ success: false })
    }
    res.send(userOrderList)
})

module.exports = router;