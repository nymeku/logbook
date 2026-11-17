import { Navigate } from "react-router";
import { paths } from "../config/paths";

// Pas de page d'accueil : on va directement au dashboard (qui renvoie au login si besoin).
const HomeRoute = () => <Navigate to={paths.app.dashboard.getHref()} replace />;

export default HomeRoute;
