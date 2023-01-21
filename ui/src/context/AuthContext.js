// Not sure if context is necessary with the whole localstorage setup.

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// const AuthContext = React.createContext([{}, () => {}]);
const AuthContext = React.createContext();

function useAuth() {
  const context = React.useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

const AuthProvider = (props) => {
  const navigate = useNavigate();
  // const fetchCurrentUser = async () => {}

  // const [accessToken, setAccessToken] = useState(
  //   localStorage.getItem("accessToken")
  // );

  const login = async (email, password) => {
    try {
      const asyncResponse = await axios.post(
        process.env.REACT_APP_API_ENDPOINT + "login",
        { email, password },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );
      if (asyncResponse.status === 200) {
        localStorage.setItem("accessToken", asyncResponse.data.accessToken);
        localStorage.setItem("refreshToken", asyncResponse.data.refreshToken);
        navigate("/privateposts");
      }
    } catch (error) {}
  };

  const fetchCurrentUser = async () => {
    try {
      const asyncResponse = await axios.get(
        process.env.REACT_APP_API_ENDPOINT + "me",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
    } catch (error) {
      console.log("ERROR in fetchCurrentUser: (401?) ", error); // should be 401?
      localStorage.setItem("isRefresh", true);
      if (localStorage.getItem("isRefresh")) {
        console.log("isRefresh set to true");
        try {
          console.log("trying to get refresh token.");
          const asyncRefreshResponse = await axios.get(
            process.env.REACT_APP_API_ENDPOINT + "token",
            {
              withCredentials: true,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("refreshToken")}`,
              },
            }
          );

          console.log(
            "Setting refreshed AccessToken now. refresh response: ",
            asyncRefreshResponse
          );

          localStorage.setItem(
            "accessToken",
            asyncRefreshResponse.data.accessToken
          );
          localStorage.setItem("isRefresh", false);
        } catch (error) {
          console.log(
            "refresh token is probably expired. You need to log in again."
          );
        }
      } else {
        console.log("isRefresh NOT set to true");
      }
    }
  };

  const setLocalStorage = (key, value) => {
    localStorage.setItem(key, value);
  };

  const logout = () => {
    // If a localStorage (& maybe Redis? setup is implemented, then I believe logging out can happen completely on the front end by just removing the accessToken from localStorage???)
    // localStorage.setItem("accessToken", "");
    setLocalStorage("accessToken", "");
    navigate("/login");
  };

  useEffect(() => {
    fetchCurrentUser();
    return () => {};
  }, []);

  const value = {
    logout,
    login,
    setLocalStorage,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
};

export { useAuth, AuthProvider };
