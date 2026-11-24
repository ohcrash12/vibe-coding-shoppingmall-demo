import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Admin from "./pages/admin/Admin";
import AdminProductNew from "./pages/admin/AdminProductNew";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Order from "./pages/Order";
import OrderComplete from "./pages/OrderComplete";
import OrderFail from "./pages/OrderFail";
import OrderList from "./pages/OrderList";
import User from "./pages/User";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<Order />} />
          <Route path="/order/complete" element={<OrderComplete />} />
          <Route path="/order/fail" element={<OrderFail />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/products/new" element={<AdminProductNew />} />
          <Route path="/admin/products/:id" element={<AdminProductNew />} />
          <Route path="/user" element={<User />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
