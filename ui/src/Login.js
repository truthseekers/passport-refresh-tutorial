import React, { useState } from "react";
import NavBar from "./NavBar";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("email");
  const [password, setPassword] = useState("password");
  const navigate = useNavigate();
  const { login } = useAuth();

  const formSubmitHandler = async (e) => {
    e.preventDefault();

    login(email, password);
  };

  return (
    <>
      <NavBar />
      <h3>
        Use "email" as email and "password" as password (don't include quotes)
      </h3>
      <form onSubmit={formSubmitHandler}>
        <div>
          <label>Email</label>
          <input
            type="text"
            id="email"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="text"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <div>
          <button type="submit">Submit</button>
        </div>
      </form>
    </>
  );
};

export default Login;
