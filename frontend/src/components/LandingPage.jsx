import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import graduationImg from "../assets/graduation.jpeg";
import { getToken } from "../api";

const focusAreas = [
  {
    title: "Goal Architect",
    body: "Tell Ace the outcomes you care about. It instantly maps the milestones, metrics, and habits that keep you shipping.",
  },
  {
    title: "Daily Flight Plan",
    body: "Every morning Ace assembles a short list of high-leverage tasks so you know exactly what to execute.",
  },
  {
    title: "Portfolio Builder",
    body: "Ship visible deliverables and log proof of work. Ace keeps a living portfolio you can share with mentors, recruiters, or admissions teams.",
  },
  {
    title: "College Guidance Add-On",
    body: "When it’s time to apply, plug into our counselors and keep the same workspace for essays, recommendations, and timelines.",
  },
];

const workflows = [
  {
    label: "1. Capture ambitions",
    detail: "Pin every project, skill, or opportunity inside Ace. We support academic goals, creative pursuits, and internships.",
  },
  {
    label: "2. Ace breaks it down",
    detail: "Our assistant transforms fuzzy ambitions into milestones, sprints, and daily rituals you can actually follow.",
  },
  {
    label: "3. Ship daily",
    detail: "Check in with Ace, mark progress, and get new suggestions automatically. Small wins compound into big outcomes.",
  },
];

const stats = [
  { value: "1,800+", label: "Goals shipped with Ace" },
  { value: "92%", label: "Users completing weekly targets" },
  { value: "45 min", label: "Average time reclaimed per day" },
];

const addOnServices = [
  "Essay labs and story mapping",
  "Application timeline orchestration",
  "Mock interviews & pitch reviews",
  "Scholarship and financial strategy",
];

const testimonials = [
  {
    quote:
      "Ace sits beside me like a chief of staff. I dropped my goal into the app and it fed me daily plays until the project shipped.",
    author: "Maya • Product Design Fellow",
  },
  {
    quote:
      "I was juggling robotics, research, and college essays. Ace kept every strand organized and the counselors plugged in seamlessly.",
    author: "Ethan • MIT Admit 2029",
  },
  {
    quote:
      "The portfolio view is elite. I could send one link to recruiters and they immediately saw my build logs and progress.",
    author: "Lena • Startup Ops Intern",
  },
  {
    quote:
      "Daily check-ins from Ace nudged me to take action even when school was chaotic. It’s the habit system I always needed.",
    author: "Priya • Dual Enrollment Student",
  },
];

const faqs = [
  {
    question: "Is Ace just for college planning?",
    answer:
      "No. Ace is a productivity OS first. Use it to tackle any skill, project, or passion. College counseling is an optional layer you can turn on when needed.",
  },
  {
    question: "How does Ace generate daily tasks?",
    answer:
      "Ace analyzes your goal, the milestones you accept, and your availability. It then suggests bite-sized actions, tracks time, and reorders priorities as you check things off.",
  },
  {
    question: "Can I collaborate with mentors or parents?",
    answer:
      "Yes. Share read-only dashboards or invite collaborators to comment on progress, essays, or deliverables while you stay in control.",
  },
  {
    question: "What happens when I’m ready to apply to college?",
    answer:
      "Switch on the counseling add-on. Your productivity data feeds directly into essay brainstorming, resume crafting, and interview prep.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) navigate("/home");
  }, [navigate]);

  const handleGetStarted = () => navigate("/dashboard");
  const handleCounseling = () => navigate("/survey");
  const handleLogin = () => navigate("/login");

  return (
    <div className="ace-lp">
      <div className="ace-background" aria-hidden />
      <header className="ace-nav">
        <div className="ace-logo">Ace The App</div>
        <nav>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#testimonials">Testimonials</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
        </nav>
        <button className="ace-btn ghost" onClick={handleLogin}>
          Log In
        </button>
      </header>

      <main>
        <section className="ace-hero" id="top">
          <div className="ace-hero__text">
            <p className="eyebrow">Powered by Ace — your AI productivity partner</p>
            <h1>Blueprint ambitious goals, then make progress daily.</h1>
            <p>
              Ace keeps your roadmap, rituals, and proof-of-progress in one calm workspace.
              Learn new skills, ship portfolio pieces, and when you are ready,
              layer in our college counseling experts without leaving the flow you already trust.
            </p>
            <div className="ace-cta">
              <button className="ace-btn" onClick={handleGetStarted}>
                Get Started
              </button>
              <button className="ace-btn link" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>
                See how Ace works →
              </button>
            </div>
            <div className="ace-stat-row">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.value}</span>
                  <p>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="ace-hero__panel">
            <div className="ace-hero-card">
              <h3>Ace Daily Brief</h3>
              <ul>
                <li>
                  <span>Today</span>
                  <p>Ship UX case study section 2</p>
                </li>
                <li>
                  <span>Next</span>
                  <p>Record 90s demo clip • Outline essay insight</p>
                </li>
              </ul>
              <button className="ace-btn ghost" onClick={handleGetStarted}>
                Plan my day
              </button>
            </div>
            <div className="ace-hero-note">
              <img src={graduationImg} alt="Students celebrating milestones" />
              <p>
                “Ace made my build log the backbone of my college applications.”
                <span> — Student in the CollegeWise cohort</span>
              </p>
            </div>
          </div>
        </section>

        <section className="ace-focus" id="features">
          <h2>Everything flows through Ace</h2>
          <div className="ace-grid four">
            {focusAreas.map((item) => (
              <div className="ace-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ace-flow" id="about">
          <div>
            <p className="eyebrow">How Ace keeps momentum</p>
            <h2>Structure inspired by modern productivity systems</h2>
            <p>
              Ace feels like your favorite productivity app—clean, fast, multiplayer-ready—
              with an assistant who anticipates what’s next. No cluttered dashboards, just calm focus.
            </p>
            <div className="ace-timeline">
              {workflows.map((step) => (
                <div key={step.label}>
                  <span>{step.label}</span>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="ace-panel">
            <h3>College-ready, when you are</h3>
            <p>
              Keep productivity first. When the application season arrives, enable the counseling layer and
              continue using the exact same goals, proof-of-work, and daily rhythm.
            </p>
            <ul>
              {addOnServices.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
              <button className="ace-btn ghost" onClick={handleCounseling}>
                Explore the add-on
              </button>
          </div>
        </section>

        <section className="ace-section muted" id="testimonials">
          <div className="ace-section-header">
            <h2>People building with Ace</h2>
            <p>From ambitious teens to college cohorts, Ace is the calm command center behind the work.</p>
          </div>
          <div className="ace-grid two">
            {testimonials.map((item) => (
              <blockquote className="ace-card quote" key={item.author}>
                <p>“{item.quote}”</p>
                <span>{item.author}</span>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="ace-section" id="faq">
          <div className="ace-section-header">
            <h2>Frequently Asked Questions</h2>
            <p>Still wondering how Ace fits into your routine? Start here.</p>
          </div>
          <div className="ace-accordion">
            {faqs.map((faq) => (
              <details key={faq.question} className="ace-card">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="ace-section cta">
          <h2>Ready to move your goals forward?</h2>
          <p>
            Join thousands of focused builders who organize their goals with Ace and tap
            into counseling when it matters most.
          </p>
          <div className="ace-cta">
            <button className="ace-btn" onClick={handleGetStarted}>
              Get Started
            </button>
            <button className="ace-btn ghost" onClick={handleLogin}>
              Log In
            </button>
          </div>
        </section>

        <section className="ace-section contact" id="contact">
          <div>
            <h2>Contact us</h2>
            <p>
              Email: <a href="mailto:info@acetheapp.com">info@acetheapp.com</a>
              <br />
              Phone: (555) 123-4567
              <br />
              Address: 123 College Ave, New York, NY 10001
            </p>
          </div>
          <div>
            <h3>Follow along</h3>
            <div className="ace-social">
              <a href="https://www.facebook.com/">Facebook</a>
              <a href="https://www.instagram.com/">Instagram</a>
              <a href="https://www.twitter.com/">Twitter</a>
            </div>
          </div>
        </section>
      </main>

      <a className="ace-chat" href="mailto:info@acetheapp.com" title="Chat with us">
        💬
      </a>

      <footer className="ace-footer">
        <div>Contact: info@acetheapp.com</div>
        <div>© {new Date().getFullYear()} Ace The App</div>
      </footer>
    </div>
  );
}
