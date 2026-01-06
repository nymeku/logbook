import { Link } from "react-router";
import { paths } from "../config/paths";

const HomeRoute = () => {
  return (
    <div>
      <p>Logbook - Home</p>
      <Link to={paths.auth.login.getHref()}>Connexion</Link>
    </div>
  );
};

export default HomeRoute;
