import React, { createContext, useContext, useState, useEffect } from "react";
import { allColleges } from "../components/CollegeList.jsx";
import { getColleges, addCollege as apiAddCollege, removeCollege as apiRemoveCollege } from "../api";

const CollegeContext = createContext();

export function CollegeProvider({ children }) {
  const [myColleges, setMyColleges] = useState([]);

  // Load colleges from API on mount
  useEffect(() => {
    refreshColleges();
    // eslint-disable-next-line
  }, []);

  // Add a college by id using the API and refresh
  const addCollege = async (id) => {
    try {
      await apiAddCollege(id);
    } catch (err) {
      console.warn("[CollegeProvider] addCollege skipped", err);
    }
    await refreshColleges();
  };

  // Remove a college by id using the API and refresh
  const removeCollege = async (id) => {
    try {
      await apiRemoveCollege(id);
    } catch (err) {
      console.warn("[CollegeProvider] removeCollege skipped", err);
    }
    await refreshColleges();
  };

  // Refresh from API
  const refreshColleges = async () => {
    try {
      const ids = await getColleges();
      setMyColleges(allColleges.filter((college) => ids.includes(college.id)));
    } catch (err) {
      console.warn("[CollegeProvider] refreshColleges skipped", err);
      setMyColleges([]);
    }
  };

  return (
    <CollegeContext.Provider value={{ myColleges, addCollege, removeCollege, refreshColleges }}>
      {children}
    </CollegeContext.Provider>
  );
}

export function useCollegeList() {
  return useContext(CollegeContext);
}
