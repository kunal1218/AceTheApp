import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import USAMap from './components/USAMap';
import FloatingNavButtons from "./components/FloatingNavButtons";
import ComingSoon from "./components/ComingSoon";
import RevolvingQuotes from "./components/RevolvingQuotes";
import backgroundGif from "./assets/background.gif";
import SurveyPage from "./components/SurveyPage";
import HomeScreenButton from "./components/HomeScreenButton";
import LandingPage from "./components/LandingPage";
import ProductivityDashboard from "./components/ProductivityDashboard";
import WizardGate from "./components/WizardGate";
import AceOnboarding from "./components/AceOnboarding";
import CreateAccount from "./components/CreateAccount";
import LoginPage from "./components/LoginPage";
import './App.css';
import VideoPage from "./components/VideoPage";
import AssignmentsPage from "./components/AssignmentsPage";
import TopColleges from "./components/TopColleges";
import CollegeList from "./components/CollegeList";
import { CollegeProvider } from "./components/CollegeProvider";
import { getProfile, getToken, logout } from "./api";
import UserInfoPage from "./components/UserInfoPage";
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import GoogleAuthHandler from "./components/GoogleAuthHandler";
import SubgoalGenerator from "./components/SubgoalGenerator";
import SkillAssessment from "./components/SkillAssessment";
import SemesterWizard from "./components/SemesterWizard";
import SemesterWorkspace from "./components/SemesterWorkspace";
import SettingsMenu from "./components/SettingsMenu";
import BackToDashboardButton from "./components/BackToDashboardButton";


function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userName, setUserName] = useState(null);
  const onCounselingHub = loggedIn && (location.pathname === "/" || location.pathname === "/home");
  const counselingAreaPaths = ["/", "/home", "/top-colleges", "/colleges-list", "/affinity-calc"];
  const backgroundlessRoutes = ["/top-colleges", "/affinity-calc"];
  const showBackground = !onCounselingHub && !backgroundlessRoutes.includes(location.pathname);
  const protect = (node) => (loggedIn ? node : <LandingPage />);

  useEffect(() => {
    let cancelled = false;
    if (loggedIn) {
      getProfile()
        .then(profile => {
          if (cancelled) return;
          setUserName(profile?.name || "");
        })
        .catch(err => {
          console.warn("[App] Failed to fetch profile", err);
          if (cancelled) return;
          setUserName(""); // fall back to empty so UI can still render
        });
    } else {
      setUserName("");
    }
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  useEffect(() => {
    const onStorage = () => setLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    // Remove forced redirect to /login for unauthenticated users
    // Only redirect to /login if the route is protected and user is not logged in
    // This logic should be handled in the route definitions, not globally here
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("[App] Failed to log out", err);
    }
    setLoggedIn(false);
    navigate("/", { replace: true }); // Redirect to landing page
  };

  // Add handlers for SettingsMenu
  const handleUserInfo = () => navigate("/user-info");
  const handleSystemOptions = () => navigate("/settings");

  useEffect(() => {
    // If already logged in and sitting on auth pages, auto-redirect to productivity planner
    if (loggedIn && (location.pathname === "/login" || location.pathname === "/create-account")) {
      navigate("/dashboard", { replace: true });
    }
  }, [loggedIn, location.pathname, navigate]);

  return (
    <CollegeProvider>
      <>
        <HomeScreenButton
          onLogout={handleLogout}
          loggedIn={loggedIn}
          onSettings={() => setSettingsOpen(true)}
        />
        {loggedIn && onCounselingHub && (
          <BackToDashboardButton />
        )}
        {showBackground && (
          <div className="background-gif">
            <img src={backgroundGif} alt="background" />
          </div>
        )}
        {settingsOpen && (
          <SettingsMenu
            onLogout={handleLogout}
            onClose={() => setSettingsOpen(false)}
            onEditSurvey={() => navigate("/survey")}
            onEditAssignments={() => navigate("/assignments")}
            onOptions={() => {}}
            onUserInfo={handleUserInfo}
            onSystemOptions={handleSystemOptions}
          />
        )}
        <Routes>
          {/* Home route: protected */}
          <Route path="/" element={
            loggedIn ? (
              <div className={`app ${onCounselingHub ? "app--counseling" : ""}`}>
                {userName === null ? null : <RevolvingQuotes userName={userName} />}
                <USAMap />
                <FloatingNavButtons />
              </div>
            ) : (
              <LandingPage />
            )
          } />
          {/* Also allow /home as an alias for home page */}
          <Route path="/home" element={
            loggedIn ? (
              <div className={`app ${onCounselingHub ? "app--counseling" : ""}`}>
                {userName === null ? null : <RevolvingQuotes userName={userName} />}
                <USAMap />
                <FloatingNavButtons />
              </div>
            ) : (
              <LandingPage />
            )
          } />
          {/* Public routes */}
          <Route path="/create-account" element={<CreateAccount setLoggedIn={setLoggedIn} />} />
          <Route path="/login" element={<LoginPage setLoggedIn={setLoggedIn} />} />
          <Route path="/survey" element={<SurveyPage />} />
          <Route path="/dashboard" element={protect(<WizardGate />)} />
          <Route path="/dashboard/main" element={protect(<ProductivityDashboard />)} />
          <Route path="/ace-onboarding" element={protect(<AceOnboarding />)} />
          {/* Protected routes */}
          <Route path="/semester/new" element={loggedIn ? <SemesterWizard /> : <LandingPage />} />
          <Route path="/semester/:id" element={loggedIn ? <SemesterWorkspace /> : <LandingPage />} />
          <Route path="/affinity-calc" element={
            loggedIn ? <ComingSoon emoji="🧮" /> : <LandingPage />
          } />
          <Route path="/settings" element={
            loggedIn ? <ComingSoon emoji="⚙️" /> : <LandingPage />
          } />
          <Route path="/video" element={
            loggedIn ? <VideoPage /> : <LandingPage />
          } />
          <Route path="/assignments" element={
            loggedIn ? <AssignmentsPage /> : <LandingPage />
          } />
          <Route path="/top-colleges" element={
            loggedIn ? <TopColleges /> : <LandingPage />
          } />
          <Route path="/colleges-list" element={
            loggedIn ? <CollegeList /> : <LandingPage />
          } />
          <Route path="/user-info" element={protect(<UserInfoPage />)} />
          {/* Add /profile route for Google OAuth redirect, but route to home page */}
          <Route path="/profile" element={<GoogleAuthHandler setLoggedIn={setLoggedIn} />} />
          <Route path="/subgoals" element={protect(<SubgoalGenerator />)} />
          <Route path="/skill-assessment" element={protect(<SkillAssessment />)} />
        </Routes>
      </>
    </CollegeProvider>
  );
}

export default App;
