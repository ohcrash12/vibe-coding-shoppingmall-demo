import { Link } from "react-router-dom";
import "./BackLink.css";

function BackLink({ to = "/", label = "Back", className = "" }) {
  return (
    <div className={`back-link-wrap ${className}`.trim()}>
      <Link to={to} className="back-link">
        <span className="back-link__arrow" aria-hidden="true">
          ←
        </span>
        <span>{label}</span>
      </Link>
    </div>
  );
}

export default BackLink;
