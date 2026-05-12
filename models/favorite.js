const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  favoriteItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
});

exports.Favorite = mongoose.model('Favorite', favoriteSchema);