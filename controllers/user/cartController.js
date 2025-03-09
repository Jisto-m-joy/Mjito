const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

const loadCartPage = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ userId: req.session.user._id }).populate({
      path: "items.productId",
      select: "name description images combos",
    });

    if (!cart) {
      return res.render("cart", {
        cartItems: [],
        subtotal: "0.00",
      });
    }

    const subtotal = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    res.render("cart", {
      cartItems: cart.items,
      subtotal: subtotal.toFixed(2),
    });
  } catch (error) {
    console.error("Cart loading error:", error);
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login to add items to cart' 
      });
    }
    
    const { productId, quantity = 1, selectedCombo } = req.body;
    const userId = req.session.user._id;

    console.log('Request body:', { productId, quantity, selectedCombo });

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      console.log('Product not found for ID:', productId);
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    // Validate combo selection
    if (!selectedCombo?.size) {
      console.log('No size provided in selectedCombo');
      return res.status(400).json({ 
        success: false, 
        message: "Product size is required" 
      });
    }

    console.log('Product found:', product.name, 'Combos:', product.combos);
    console.log('Selected size:', selectedCombo.size);

    const matchingCombo = product.combos.find(
      combo => combo.size.toString().trim() === selectedCombo.size.toString().trim()
    );
    
    if (!matchingCombo) {
      console.log('No matching combo found for size:', selectedCombo.size);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid product size selected" 
      });
    }

    console.log('Matching combo:', matchingCombo);
    console.log('Stock check - Requested:', quantity, 'Available:', matchingCombo.quantity);

    // Initial stock check
    if (matchingCombo.quantity < quantity) {
      console.log('Insufficient stock for initial request');
      return res.status(400).json({ 
        success: false, 
        message: `Only ${matchingCombo.quantity} units available in stock`,
        limitExceeded: false
      });
    }
    
    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    
    // Check existing quantity in cart for this product
    const existingItem = cart.items.find(
      item => item.productId.toString() === productId.toString()
    );
    const currentCartQuantity = existingItem ? existingItem.quantity : 0;
    const totalRequestedQuantity = currentCartQuantity + quantity;
    
    console.log('Cart check - Existing qty:', currentCartQuantity, 'Total requested:', totalRequestedQuantity);

    if (matchingCombo.quantity < totalRequestedQuantity) {
      console.log('Insufficient stock for total request');
      return res.status(400).json({ 
        success: false, 
        message: `Only ${matchingCombo.quantity} units available in stock`,
        limitExceeded: false
      });
    }

    // Find existing item index in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId.toString()
    );

    // Calculate new quantity
    const newQuantity = existingItemIndex > -1 
      ? cart.items[existingItemIndex].quantity + quantity
      : quantity;

    // Check individual product quantity limit
    if (newQuantity > 10) {
      console.log('Product quantity limit exceeded');
      return res.status(400).json({
        success: false,
        message: 'Maximum quantity limit is 10 per product',
        limitExceeded: true
      });
    }

    // Calculate total items in cart
    const totalItems = cart.items.reduce((total, item) => {
      if (existingItemIndex > -1 && item.productId.toString() === productId.toString()) {
        return total; // Don't count existing quantity of current product
      }
      return total + item.quantity;
    }, newQuantity);

    // Check total items limit
    if (totalItems > 50) {
      console.log('Total items limit exceeded');
      return res.status(400).json({
        success: false,
        message: 'Cart limit exceeded. Maximum 50 items allowed across all products.',
        limitExceeded: true
      });
    }

    // Check unique products limit
    if (existingItemIndex === -1 && cart.items.length >= 50) {
      console.log('Unique products limit exceeded');
      return res.status(400).json({
        success: false,
        message: 'Cart limit exceeded. Maximum 50 unique products allowed.',
        limitExceeded: true
      });
    }

    const price = matchingCombo.salesPrice;
    const totalPrice = price * newQuantity;

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].totalPrice = totalPrice;
    } else {
      cart.items.push({
        productId,
        quantity: newQuantity,
        price,
        totalPrice,
      });
    }

    await cart.save();
    console.log('Cart updated successfully');
    res.json({ 
      success: true, 
      message: "Product added to cart successfully" 
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to add product to cart" 
    });
  }
};

const buyNow = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login to proceed with buy now' 
      });
    }
    
    const { productId, quantity = 1, selectedCombo } = req.body;
    const userId = req.session.user._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    if (!selectedCombo?.size) {
      return res.status(400).json({ 
        success: false, 
        message: "Product size is required" 
      });
    }

    const matchingCombo = product.combos.find(
      combo => combo.size.toString().trim() === selectedCombo.size.toString().trim()
    );
    
    if (!matchingCombo) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid product size selected" 
      });
    }

    if (matchingCombo.quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${matchingCombo.quantity} units available in stock`,
        limitExceeded: false
      });
    }
    
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId.toString()
    );

    const newQuantity = existingItemIndex > -1 
      ? cart.items[existingItemIndex].quantity + quantity
      : quantity;

    if (newQuantity > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum quantity limit is 10 per product',
        limitExceeded: true
      });
    }

    const totalItems = cart.items.reduce((total, item) => {
      if (existingItemIndex > -1 && item.productId.toString() === productId.toString()) {
        return total;
      }
      return total + item.quantity;
    }, newQuantity);

    if (totalItems > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cart limit exceeded. Maximum 50 items allowed across all products.',
        limitExceeded: true
      });
    }

    if (existingItemIndex === -1 && cart.items.length >= 50) {
      return res.status(400).json({
        success: false,
        message: 'Cart limit exceeded. Maximum 50 unique products allowed.',
        limitExceeded: true
      });
    }

    const price = matchingCombo.salesPrice;
    const totalPrice = price * newQuantity;

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].totalPrice = totalPrice;
    } else {
      cart.items.push({
        productId,
        quantity: newQuantity,
        price,
        totalPrice,
      });
    }

    await cart.save();
    res.json({ 
      success: true, 
      message: "Product added to cart, proceeding to checkout" 
    });
  } catch (error) {
    console.error("Buy now error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process buy now" 
    });
  }
};

const updateCartQuantity = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user._id;

    // Validate quantity
    if (quantity > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum quantity limit is 10 per product'
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    // Calculate total quantity excluding current product
    const totalQuantity = cart.items.reduce((total, item) => {
      return item.productId.toString() === productId 
        ? total 
        : total + item.quantity;
    }, quantity);

    if (totalQuantity > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cart limit exceeded. Maximum 50 items allowed across all products.'
      });
    }

    const cartItem = cart.items.find(
      item => item.productId.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart"
      });
    }

    cartItem.quantity = quantity;
    cartItem.totalPrice = cartItem.price * quantity;

    await cart.save();

    const subtotal = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    res.json({
      success: true,
      newTotal: cartItem.totalPrice,
      cartSubtotal: subtotal,
    });
  } catch (error) {
    next(error);
  }
};


const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();

    // Calculate and return new cart subtotal
    const subtotal = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    res.json({
      success: true,
      message: "Product removed from cart",
      cartSubtotal: subtotal,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadCartPage,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  buyNow,
};
