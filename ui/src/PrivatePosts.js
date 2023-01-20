import React, { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
const PrivatePosts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const fetchPosts = useCallback(() => {
    fetch(process.env.REACT_APP_API_ENDPOINT + "posts/private", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        console.log("data from posts/private in ui: ", data);
        setPosts([]); // tmp
      } else {
        // In the refreshtoken-tutorial-js github repo we have the ability to distinguish between a 401 and 403 error. Here we don't I think because of passport. We can do the "custom" jwt function I think, if needed... See the really long passport js tutorial on truthseekers.io I think that shows you how to do it. for now we're consolidating the 401 and 403 error into one.
        console.log("fetchposts PROBLEM");
        // if (response.status === 401) {
        //   console.log("fetchPosts PROBLEM A");
        //   // navigate("/login");
        // } else {
        //   console.log("fetchPosts PROBLEM B");
        // }
      }
    });
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div>
      <NavBar />
      PrivatePosts
    </div>
  );
};

export default PrivatePosts;
