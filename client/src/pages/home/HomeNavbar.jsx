import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { IconBag, IconHeart, IconSearch, IconUser } from "./HomeIcons";

function HomeNavbar({ user, onLogout }) {
  const isAdmin = user?.user_type === "admin";
  const { cartCount, refreshCartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const welcomeLabel = isAdmin ? "관리자님 Welcome" : `${user?.name}님 Welcome`;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [user]);

  const handleLogout = () => {
    setMenuOpen(false);
    onLogout?.();
    refreshCartCount();
  };

  const badgeLabel = cartCount > 99 ? "99+" : String(cartCount);

  return (
    <header className="home__nav">
      <nav className="home__nav-links" aria-label="Primary">
        <Link to="/#new-arrivals">HOME</Link>
        <Link to="/#categories">SHOP</Link>
        <Link to="/#down">BRAND</Link>
      </nav>

      <Link to="/" className="home__logo">
        STANDFAST
      </Link>

      <div className="home__nav-actions">
        <button type="button" className="home__icon-btn" aria-label="Search">
          <IconSearch />
        </button>

        <div className="home__user-slot">
          {user ? (
            <>
              <div className="home__user-icons">
                <Link
                  to={isAdmin ? "/admin" : "/user"}
                  className="home__icon-btn"
                  aria-label={isAdmin ? "Admin page" : "User page"}
                >
                  <IconUser />
                </Link>
                {isAdmin ? (
                  <Link to="/admin" className="home__admin-link">
                    Admin
                  </Link>
                ) : null}
              </div>

              <div className="home__welcome-menu" ref={menuRef}>
                <button
                  type="button"
                  className="home__welcome-btn"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {welcomeLabel}
                </button>

                {menuOpen ? (
                  <div className="home__welcome-dropdown" role="menu">
                    <Link
                      to="/orders"
                      className="home__logout-btn"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Order
                    </Link>
                    <button
                      type="button"
                      className="home__logout-btn"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link to="/login" className="home__user-login" aria-label="Login">
              <span className="home__icon-btn">
                <IconUser />
              </span>
              <span className="home__login-label">LOGIN</span>
            </Link>
          )}
        </div>

        <button type="button" className="home__icon-btn" aria-label="Wishlist">
          <IconHeart />
        </button>
        <Link
          to="/cart"
          className="home__icon-btn home__cart-btn"
          aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
        >
          <IconBag />
          {cartCount > 0 ? (
            <span className="home__cart-badge" aria-hidden="true">
              {badgeLabel}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}

export default HomeNavbar;
