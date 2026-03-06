import { Navigate } from "react-router-dom";

// Redirect to root, which handles auth routing
export default function Index() {
  return <Navigate to="/" replace />;
}
