import axios from "axios";
import React, { useState } from "react";
import NavBar from "./NavBar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const { signup } = useAuth();
  const formSubmitHandler = async (e) => {
    e.preventDefault();

    signup(email, password);
  };

  return (
    <>
      <NavBar />
      <form onSubmit={formSubmitHandler}>
        <div>
          <label>Email</label>
          <input
            type="text"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="text"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <button type="submit">Submit</button>
        </div>
      </form>
    </>
  );
};

export default Signup;
