const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

const loadCartPage = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    // Find cart and populate product details
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

    // Calculate subtotal
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

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if selectedCombo is provided and has a size property
    if (!selectedCombo || !selectedCombo.size) {
      return res
        .status(400)
        .json({ success: false, message: "Product size is required" });
    }

    // Find the matching combo based on size
    const matchingCombo = product.combos.find(
      (combo) => combo.size.toString() === selectedCombo.size.toString()
    );

    if (!matchingCombo) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product size selected" });
    }

    if (matchingCombo.quantity < quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Requested quantity not available" });
    }

    const price = matchingCombo.salesPrice;
    const totalPrice = price * quantity;

    // Find the cart 
    let cart = await Cart.findOne({ userId });
    
    // Check for unique products in the cart
    if (cart) {
      // Get unique product IDs in the cart
      const uniqueProductIds = [...new Set(cart.items.map(item => item.productId.toString()))];
      
      // Check if the new product is already in the cart
      const isNewProduct = !uniqueProductIds.includes(productId.toString());
      
      // If cart already has 10 unique products, prevent adding more
      if (isNewProduct && uniqueProductIds.length >= 10) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cart limit exceeded. Maximum 10 unique items allowed.',
          limitExceeded: true
        });
      }
    }

    // If no cart exists, create a new cart
    if (!cart) {
      cart = new Cart({
        userId,
        items: [
          {
            productId,
            quantity,
            price,
            totalPrice,
          },
        ],
      });
    } else {
      // Check if product with same ID already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
      );

      if (existingItemIndex > -1) {
        // Update existing item
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice =
          cart.items[existingItemIndex].quantity * price;
      } else {
        // Add new item
        cart.items.push({
          productId,
          quantity,
          price,
          totalPrice,
        });
      }
    }

    await cart.save();
    res.json({ success: true, message: "Product added to cart successfully" });
  } catch (error) {
    console.error("Add to cart error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to add product to cart" });
  }
};

const updateCartQuantity = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user._id;

    // Validate quantity limit
    if (quantity > 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum quantity limit is 10' 
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!cartItem) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }

    cartItem.quantity = quantity;
    cartItem.totalPrice = cartItem.price * quantity;

    await cart.save();

    // Calculate new cart total
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
};
