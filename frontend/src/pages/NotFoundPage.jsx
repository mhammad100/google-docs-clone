import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <main className="page page-message">
    <h1>Page not found</h1>
    <Link to="/" className="btn btn--primary">Go to documents</Link>
  </main>
);

export default NotFoundPage;
