import { Link } from 'react-router-dom';
import { Compass, Home, LifeBuoy, Scissors } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Seo from '../components/Seo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <Seo title="Page not found — Campaign Clippers" description="This page doesn’t exist. Head back to the Campaign Clippers marketplace." noindex />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-5 pt-24 pb-16 hero-glow relative">
        <div className="absolute inset-0 grid-lines pointer-events-none" />
        <div className="relative text-center max-w-lg">
          <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-primary text-ink mb-6 rotate-6">
            <Scissors size={30} strokeWidth={2.5} />
          </span>
          <p className="font-mono text-primary font-bold tracking-[0.3em] text-sm">ERROR 404</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white tracking-tight mt-3">This clip got cut.</h1>
          <p className="text-mut mt-4 leading-relaxed">
            The page you’re looking for doesn’t exist, was moved, or never made the final edit.
            Let’s get you back to the marketplace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary"><Home size={15} /> Back to home</Link>
            <Link to="/pricing" className="btn-ghost"><Compass size={15} /> View pricing</Link>
            <Link to="/signup" className="btn-ghost"><LifeBuoy size={15} /> Create account</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
