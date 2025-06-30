import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import graduationImg from "../assets/graduation.jpeg";
import { getToken } from "../api"; // <-- Import your API token getter

const studentPhotos = [
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=400&q=80", // student with books
  "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=facearea&w=400&q=80", // group of students
  "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=facearea&w=400&q=80",
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=400&q=80", // student with books
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&w=400&q=80"
];

export default function LandingPage() {
  const navigate = useNavigate();

  // Optional: Redirect logged-in users to /home
  useEffect(() => {
    if (getToken()) {
      navigate("/home");
    }
  }, [navigate]);

  return (
    <div className="landing-root">
      <div
        className="landing-hero-bg"
        style={{
          backgroundImage: `url(${graduationImg})`,
        }}
      >
        <header className="landing-header">
          <div className="landing-logo">Ace The App</div>
          <nav className="landing-nav">
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
            <button
              className="login-nav-btn"
              onClick={() => navigate("/login")}
            >
              Log In
            </button>
          </nav>
        </header>
        <div className="landing-slogan-container">
          <h1 className="landing-slogan">
            Your Path to College Starts Here
          </h1>
          <button
            className="get-started-btn"
            onClick={() => navigate("/survey")}
          >
            Get Started
          </button>
        </div>
      </div>

      <section className="landing-section">
        {/* Decorative SVG shapes */}
        <svg className="landing-section-bgshape" viewBox="0 0 200 200" fill="none">
          <ellipse cx="100" cy="100" rx="100" ry="80" fill="#415a77"/>
        </svg>
        <svg className="landing-section-bgshape2" viewBox="0 0 200 200" fill="none">
          <rect x="30" y="30" width="140" height="140" rx="60" fill="#274060"/>
        </svg>

        <h2>Why Choose Us?</h2>
        <div className="landing-section-cards">
          <div className="landing-feature-card">
            <svg className="landing-feature-icon" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="32" fill="#dbeafe"/>
              <path d="M32 18L42 46H22L32 18Z" fill="#415a77"/>
            </svg>
            <div className="landing-feature-title">Expert Guidance</div>
            <div className="landing-feature-desc">
              Work with experienced mentors who know the ins and outs of college admissions.
            </div>
          </div>
          <div className="landing-feature-card">
            <svg className="landing-feature-icon" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="32" fill="#c7d2fe"/>
              <path d="M20 44L32 24L44 44H20Z" fill="#274060"/>
            </svg>
            <div className="landing-feature-title">Personalized Plans</div>
            <div className="landing-feature-desc">
              Every student is unique. Get a tailored roadmap for your academic journey.
            </div>
          </div>
          <div className="landing-feature-card">
            <svg className="landing-feature-icon" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="32" fill="#b6e0fe"/>
              <path d="M32 20A12 12 0 1 1 20 32" stroke="#415a77" strokeWidth="4" fill="none"/>
            </svg>
            <div className="landing-feature-title">Proven Results</div>
            <div className="landing-feature-desc">
              Our students have been accepted to top universities across the country.
            </div>
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="landing-section" id="stats">
        <h2>Our Impact</h2>
        <div className="landing-stats-row">
          <div className="landing-stat-block">
            <div className="landing-stat-number">2,500+</div>
            <div className="landing-stat-label">Students Helped</div>
          </div>
          <div className="landing-stat-block">
            <div className="landing-stat-number">$12M+</div>
            <div className="landing-stat-label">Scholarships Earned</div>
          </div>
          <div className="landing-stat-block">
            <div className="landing-stat-number">98%</div>
            <div className="landing-stat-label">Top 3 Choice Admits</div>
          </div>
        </div>
      </section>

      {/* Photo Grid Section */}
      <section className="landing-section" id="student-photos">
        <h2>Meet Our Students</h2>
        <div className="student-photo-grid">
          {studentPhotos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="Happy student"
            />
          ))}
        </div>
      </section>

      {/* Call-to-Action Banner */}
      <section className="landing-section landing-cta-banner">
        <h2>Ready to Ace Your Application?</h2>
        <p>Join thousands of successful students. Start your journey today!</p>
        <button
          className="get-started-btn"
          onClick={() => navigate("/survey")}
        >
          Get Started
        </button>
      </section>

      {/* Newsletter Signup */}
      <section className="landing-section" id="newsletter">
        <h2>Stay in the Loop</h2>
        <p>Get the latest admissions tips and news delivered to your inbox.</p>
        <form
          className="landing-newsletter-form"
          onSubmit={e => { e.preventDefault(); alert("Thank you for subscribing!"); }}
        >
          <input
            type="email"
            placeholder="Your email"
            required
          />
          <button type="submit">
            Subscribe
          </button>
        </form>
      </section>

      {/* Floating Chat Button */}
      <a
        href="mailto:info@acetheapp.com"
        className="floating-chat-btn"
        title="Chat with us"
      >
        💬
      </a>

      <section className="landing-section" id="about">
        <h2>About Ace The App</h2>
        <p>
          Ace The App is your trusted partner in the college admissions process. Our expert team has helped thousands of students gain admission to the nation’s top universities. We provide personalized guidance, strategic planning, and insider tips to help you stand out in a competitive applicant pool.
        </p>
        <p>
          Our mission is to demystify the admissions process and empower students to achieve their academic dreams. Whether you’re aiming for the Ivy League or a top public university, we’re here to help you every step of the way.
        </p>
      </section>

      <section className="landing-section" id="why-ace">
        <h2>Why Ace The App?</h2>
        <p>
          With decades of experience and a proven track record, Ace The App is the go-to resource for students and families seeking expert college admissions guidance. Our counselors are former admissions officers from top universities, and our approach is tailored to each student's unique strengths and aspirations.
        </p>
        <ul>
          <li>Unmatched insider knowledge of the admissions process</li>
          <li>Personalized application strategies</li>
          <li>Essay brainstorming and editing</li>
          <li>Interview coaching and mock interviews</li>
          <li>Extracurricular planning and resume building</li>
          <li>Scholarship and financial aid guidance</li>
        </ul>
      </section>

      <section className="landing-section" id="features">
        <h2>Our Services</h2>
        <ul>
          <li>Comprehensive College Counseling</li>
          <li>Personal Statement & Essay Coaching</li>
          <li>Application Strategy & Timeline Planning</li>
          <li>Interview Preparation</li>
          <li>Extracurricular & Resume Guidance</li>
          <li>Standardized Test Planning</li>
          <li>Scholarship & Financial Aid Advice</li>
        </ul>
      </section>

      <section className="landing-section" id="success">
        <h2>Our Success Stories</h2>
        <p>
          Ace The App students have been admitted to every Ivy League university, Stanford, MIT, Caltech, and top public institutions. Our holistic approach ensures that every student’s story shines through in their application.
        </p>
        <ul>
          <li>98% of our students are admitted to one of their top 3 choices</li>
          <li>Over $10 million in scholarships earned by our students last year</li>
          <li>Support for U.S. and international applicants</li>
        </ul>
      </section>

      <section className="landing-section" id="testimonials">
        <h2>What Our Students Say</h2>
        <blockquote>
          “Ace The App helped me get into my dream school! Their advice on essays and interviews was invaluable.”<br />
          <span style={{fontWeight: 600}}>— Emily, Harvard Class of 2028</span>
        </blockquote>
        <blockquote>
          “I never thought I’d get into an Ivy, but Ace The App made it possible. Thank you!”<br />
          <span style={{fontWeight: 600}}>— Alex, Yale Class of 2027</span>
        </blockquote>
        <blockquote>
          “The counselors were so supportive and knowledgeable. I felt confident every step of the way.”<br />
          <span style={{fontWeight: 600}}>— Priya, Stanford Class of 2029</span>
        </blockquote>
        <blockquote>
          “Their essay feedback was a game changer. I got into every school I applied to!”<br />
          <span style={{fontWeight: 600}}>— Jordan, Columbia Class of 2028</span>
        </blockquote>
      </section>

      <section className="landing-section" id="faq">
        <h2>Frequently Asked Questions</h2>
        <h4>How does Ace The App help with college admissions?</h4>
        <p>
          We offer one-on-one counseling, essay editing, interview prep, and more. Our team has decades of experience and a proven track record of success.
        </p>
        <h4>Do you work with international students?</h4>
        <p>
          Yes! We have helped students from over 30 countries gain admission to top U.S. universities.
        </p>
        <h4>When should I start working with Ace The App?</h4>
        <p>
          The earlier, the better! We work with students as early as 9th grade, but we can help at any stage of the process.
        </p>
        <h4>How do I get started?</h4>
        <p>
          Click the “Get Started” button above or contact us below to schedule a free consultation.
        </p>
      </section>

      {/*}
      <section className="landing-section" id="media">
        <h2>As Seen In</h2>
        <div style={{display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center"}}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6e/NBC_News_2011_logo.svg" alt="NBC" style={{height: 40}} />
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/CNN_International_logo.svg" alt="CNN" style={{height: 40}} />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/Forbes_logo.svg" alt="Forbes" style={{height: 40}} />
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/The_New_York_Times_logo.png" alt="NYT" style={{height: 40}} />
        </div>
      </section>*/}

      <section className="landing-section" id="blog">
        <h2>College Admissions Insights</h2>
        <h4>How to Stand Out in Your Application</h4>
        <p>
          Our experts share the latest strategies for making your application shine, from unique extracurriculars to compelling essays.
        </p>
        <h4>Common Application Mistakes</h4>
        <p>
          Avoid the pitfalls that keep students out of their dream schools. Learn what admissions officers are really looking for.
        </p>
        <h4>Financial Aid & Scholarships</h4>
        <p>
          Maximize your financial aid package and discover scholarships you may not know about.
        </p>
      </section>

      <section className="landing-section" id="resources">
        <h2>Free Resources</h2>
        <ul>
          <li>Sample College Essays</li>
          <li>Admissions Timeline Checklist</li>
          <li>Interview Preparation Guide</li>
          <li>Scholarship Search Tools</li>
          <li>Parent Support Webinars</li>
        </ul>
      </section>

      <section className="landing-section" id="contact">
        <h2>Contact Us</h2>
        <p>
          Email: <a href="mailto:info@acetheapp.com">info@acetheapp.com</a><br />
          Phone: (555) 123-4567<br />
          Address: 123 College Ave, New York, NY 10001
        </p>
        <p>
          <strong>Follow us:</strong>
          <a href="https://www.facebook.com/" style={{marginLeft: 12}}>Facebook</a>
          <a href="https://www.instagram.com/" style={{marginLeft: 12}}>Instagram</a>
          <a href="https://www.twitter.com/" style={{marginLeft: 12}}>Twitter</a>
        </p>
      </section>

      <footer className="landing-footer">
        <div>Contact: info@acetheapp.com</div>
        <div>© {new Date().getFullYear()} Ace The App</div>
      </footer>
    </div>
  );
}