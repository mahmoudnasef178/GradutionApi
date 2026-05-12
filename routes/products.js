const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Product = require('../models/product');
const Category = require('../models/category');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated category IDs to filter
 *     responses:
 *       200:
 *         description: List of products
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    let filter = {};
    if (req.query.categories) {
        filter = { category: req.query.categories.split(',') }
    }

    const productList = await Product.find(filter).populate('category');
    if (!productList) {
        res.status(500).json({ success: false })
    }
    res.status(200).send(productList);
})

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product data
 *       500:
 *         description: Product not found
 */
router.get('/:id', async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
        res.status(500).json({ success: false, message: 'Product not found' })
    }
    res.status(200).send(product)
})

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, price, countInStock]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               richDescription:
 *                 type: string
 *               image:
 *                 type: string
 *               brand:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               countInStock:
 *                 type: number
 *               rating:
 *                 type: number
 *               numReviews:
 *                 type: number
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product created
 *       400:
 *         description: Invalid category
 *       500:
 *         description: Product cannot be created
 */
router.post('/', async (req, res) => {
    const category = await Category.findById(req.body.category);
    if (!category)
        return res.status(400).send('Invalid Category')

    let product = new Product({
        name:            req.body.name,
        description:     req.body.description,
        richDescription: req.body.richDescription,
        image:           req.body.image,
        brand:           req.body.brand,
        price:           req.body.price,
        category:        req.body.category,
        countInStock:    req.body.countInStock,
        rating:          req.body.rating,
        numReviews:      req.body.numReviews,
        isFeatured:      req.body.isFeatured
    })

    product = await product.save();

    if (!product)
        return res.status(500).send('Product cannot be created')

    res.send(product);
})

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
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
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               countInStock:
 *                 type: number
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated
 *       500:
 *         description: Product cannot be updated
 */
router.put('/:id', async (req, res) => {
    const category = await Category.findById(req.body.category);
    if (!category)
        return res.status(400).send('Invalid Category')

    const product = await Product.findByIdAndUpdate(req.params.id, {
        name:            req.body.name,
        description:     req.body.description,
        richDescription: req.body.richDescription,
        image:           req.body.image,
        brand:           req.body.brand,
        price:           req.body.price,
        category:        req.body.category,
        countInStock:    req.body.countInStock,
        rating:          req.body.rating,
        numReviews:      req.body.numReviews,
        isFeatured:      req.body.isFeatured
    }, { new: true })

    if (!product)
        return res.status(500).send('Product cannot be updated')
    res.send(product);
})

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *       404:
 *         description: Product not found
 */
router.delete('/:id', (req, res) => {
    Product.findByIdAndRemove(req.params.id).then(product => {
        if (product) {
            return res.status(200).json({ success: true, message: 'Product deleted successfully' })
        } else {
            return res.status(404).json({ success: false, message: 'Product not found' })
        }
    }).catch(err => {
        return res.status(400).json({ success: false, error: err })
    })
})

/**
 * @swagger
 * /products/get/count:
 *   get:
 *     summary: Get total number of products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Product count
 */
router.get('/get/count', async (req, res) => {
    const productCount = await Product.countDocuments((count) => count);
    if (!productCount) {
        res.status(500).json({ success: false })
    }
    res.status(200).send({ productCount: productCount });
})

/**
 * @swagger
 * /products/get/featured/{count}:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: count
 *         required: true
 *         schema:
 *           type: number
 *         description: Number of featured products to return
 *     responses:
 *       200:
 *         description: List of featured products
 */
router.get('/get/featured/:count', async (req, res) => {
    const count = req.params.count ? req.params.count : 0
    const products = await Product.find({ isFeatured: true }).limit(+count);
    if (!products) {
        res.status(500).json({ success: false })
    }
    res.status(200).send(products);
})

module.exports = router;