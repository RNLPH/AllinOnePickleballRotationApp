import { Link } from "react-router-dom";

/**
 * LandingPage — Public hero page at root route (when not logged in).
 * Shows features grid, CTAs to login/signup.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="RallyStack" className="w-16 h-16 rounded-2xl shadow-premium-lg" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Court Sessions,<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Effortlessly Managed
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8 leading-relaxed">
            The universal court session manager for pickleball, badminton, tennis, and padel.
            Handle 30+ players, multiple courts, and real-time rotations from your phone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="inline-flex items-center justify-center h-12 px-8 rounded-xl gradient-accent text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105">
              Get Started Free
            </Link>
            <a href="#features" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-base shadow-sm hover:shadow-md transition-all">
              See Features
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">No credit card required. Free for clubs.</p>
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </header>

      {/* Features Grid */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">Everything you need to run sessions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon="🎮" title="10 Game Modes" desc="Open, Ladder, King of Court, ELO Match, Swiss, Round Robin, and more." />
          <FeatureCard icon="📊" title="ELO Rating" desc="DUPR-style skill rating. Players are matched by ability for competitive games." />
          <FeatureCard icon="📱" title="Mobile First" desc="Built for operators running sessions on their phone. One-tap actions." />
          <FeatureCard icon="📺" title="Live Board" desc="Public display for TV/tablet. Players see their queue position in real-time." />
          <FeatureCard icon="✅" title="Self Check-in" desc="Share a link. Players add themselves. You approve from waitlist." />
          <FeatureCard icon="🔥" title="Streak Badges" desc="Win streaks, achievements, and ELO visible to everyone on the live board." />
          <FeatureCard icon="🔒" title="Court Lock" desc="Reserve courts for challenges or VIP matches. Auto-fill skips locked courts." />
          <FeatureCard icon="📤" title="Export & Share" desc="Copy session summaries to WhatsApp. Download CSV stats. QR codes for links." />
          <FeatureCard icon="🌍" title="9 Languages" desc="EN, DE, ES, FR, PT, JA, ZH, KO, Filipino. Operators pick their language." />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-12 text-center">
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-8 sm:p-12 text-white shadow-premium-lg">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to run your session?</h2>
          <p className="text-blue-100 text-sm mb-6">Join clubs already using RallyStack to manage their court rotations.</p>
          <Link to="/login" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white text-blue-700 font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-105">
            Start Now — It's Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="powered-by pb-6">
        Powered by RallyStack · v2.2.0
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-card rounded-xl p-5 hover:shadow-premium-hover transition-all">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
