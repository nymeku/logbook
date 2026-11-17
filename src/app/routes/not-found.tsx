import { Navigate } from "react-router";
import { paths } from "../../config/paths";

const NotFoundRoute = () => <Navigate to={paths.app.dashboard.getHref()} replace />;

export default NotFoundRoute;
