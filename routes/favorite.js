const { Favorite } = require('../models/favorite');
const { Product } = require('../models/product'); // ✅ أضف ده
const express = require('express');
const router = express.Router();

// ✅ POST - مش بيتحقق من وجود الـ product خالص
router.post('/AddItems', async (req, res) => {
    try {
        const { user, productId } = req.body;

        if (!user || !productId) {
            return res.status(400).send('user and productId are required');
        }

        // ✅ تحقق إن الـ productId صالح ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        let favorite = await Favorite.findOne({ user });

        if (!favorite) {
            favorite = new Favorite({
                user,
                favoriteItems: [productId]
            });
        } else {
            if (!favorite.favoriteItems.includes(productId)) {
                favorite.favoriteItems.push(productId);
            }
        }

        favorite = await favorite.save();
        if (!favorite) return res.status(400).send('The favorite cannot be created');
        res.send(favorite);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ GET - بيرجع items مع بيانات الـ product كاملة
router.get('/:userId', async (req, res) => {
    try {
        const favoriteList = await Favorite.findOne({ 
            user: req.params.userId 
        }).populate('favoriteItems');
        
        // ✅ لو مفيش favorites، رجّع object فاضي مش error
        if (!favoriteList) {
            return res.status(200).json({ 
                user: req.params.userId, 
                items: [] 
            });
        }

        // ✅ format الـ response عشان يتطابق مع الـ Flutter model
        const formattedItems = favoriteList.favoriteItems.map(product => ({
            id: product._id,
            productName: product.name,
            pictureUrl: product.image,
            price: product.price,
            category: product.category?.name ?? '',
        }));

        res.status(200).json({
            id: favoriteList._id,
            items: formattedItems
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ DELETE
router.delete('/items/:productId', async (req, res) => {
    try {
        const { userId } = req.body;
        const { productId } = req.params;

        if (!userId) return res.status(400).send('userId is required in body');

        let favorite = await Favorite.findOneAndUpdate(
            { user: userId },
            { $pull: { favoriteItems: productId } },
            { new: true }
        );

        if (!favorite) return res.status(400).send('User not found');
        res.send(favorite);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;