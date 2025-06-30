import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import USAMap from './components/USAMap';
import TopCollegesButton from './components/TopCollegesButton';
import FloatingNavButtons from "./components/FloatingNavButtons";
import ComingSoon from "./components/ComingSoon";
import RevolvingQuotes from "./components/RevolvingQuotes";
import backgroundGif from "./assets/background.gif";
import SurveyPage from "./components/SurveyPage";
import HomeScreenButton from "./components/HomeScreenButton";
import LandingPage from "./components/LandingPage";
import CreateAccount from "./components/CreateAccount";
import LoginPage from "./components/LoginPage";
import './App.css';
import VideoPage from "./components/VideoPage";
import AssignmentsPage from "./components/AssignmentsPage";
import TopColleges from "./components/TopColleges";
import CollegeList from "./components/CollegeList";
import { CollegeProvider } from "./components/CollegeProvider";
import { getToken } from "./api";
import { getProfile } from "./api";
import UserInfoPage from "./components/UserInfoPage";


function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    if (loggedIn) {
      getProfile().then(profile => {
        setUserName(profile?.name || "");
      });
    } else {
      setUserName("");
    }
  }, [loggedIn]);

  useEffect(() => {
    const onStorage = () => setLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    // If not logged in, redirect to login page
    if (!localStorage.getItem("token")) {
      setLoggedIn(false);
      navigate("/login");
    }
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    navigate("/"); // Redirect to landing page
  };

  // Add handlers for SettingsMenu
  const handleUserInfo = () => navigate("/user-info");
  const handleSystemOptions = () => navigate("/settings");

  return (
    <CollegeProvider>
      <>
        <HomeScreenButton
          onLogout={handleLogout}
          loggedIn={loggedIn}
          onSettings={() => setSettingsOpen(true)}
        />
        <div className="background-gif">
          <img src={backgroundGif} alt="background" />
        </div>
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
              <div className="app">
                {userName === null ? null : <RevolvingQuotes userName={userName} />}
                <USAMap />
                <TopCollegesButton />
                <FloatingNavButtons />
              </div>
            ) : (
              <LandingPage />
            )
          } />
          {/* Also allow /home as an alias for home page */}
          <Route path="/home" element={
            loggedIn ? (
              <div className="app">
                {userName === null ? null : <RevolvingQuotes userName={userName} />}
                <USAMap />
                <FloatingNavButtons />
                <TopCollegesButton />
              </div>
            ) : (
              <LandingPage />
            )
          } />
          {/* Public routes */}
          <Route path="/create-account" element={<CreateAccount setLoggedIn={setLoggedIn} />} />
          <Route path="/login" element={<LoginPage setLoggedIn={setLoggedIn} />} />
          <Route path="/survey" element={<SurveyPage />} />
          {/* Protected routes */}
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
          <Route path="/user-info" element={<UserInfoPage />} />
        </Routes>
      </>
    </CollegeProvider>
  );
}

export default App;