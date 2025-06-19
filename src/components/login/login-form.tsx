"use client";
import React from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/firebase/firebase";
import { ref, set } from "firebase/database";
import { db } from "@/firebase/firebase";
import Link from 'next/link'
import Cookies from 'js-cookie';

interface LoginFormInputs {
  email: string;
  password: string;
}

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();
  const router = useRouter();

  const syncUserToBackend = async (user: any, token: string) => {
    const userData = {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
    };

    try {
      await set(ref(db, `users/${user.uid}`), userData);
      Cookies.set('userSession', token, { expires: 2 });
    } catch (err) {
      console.warn("Firebase DB save failed:", err);
    }

    // await fetch("http://localhost:4000/users", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${token}`,
    //   },
    //   body: JSON.stringify(userData),
    // });

    const newUserData = {
      ...userData
    }

    localStorage.setItem("user", JSON.stringify(newUserData));
    localStorage.setItem("token", token);
    
  };

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;
      const token = await user.getIdToken();

      await syncUserToBackend(user, token);

      toast.success(`Welcome, ${user.displayName || "user"}`);
      router.push("/dashboard");
    } catch (err) {
      toast.error("Login failed");
      console.error(err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const token = await user.getIdToken();

      await syncUserToBackend(user, token);

      toast.success(`Welcome, ${user.displayName}`);
      router.push("/dashboard");
    } catch (err) {
      toast.error("Google Sign-In failed");
      console.error(err);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
      <Typography variant="h5" mb={3}>
        Login
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          label="Email"
          margin="normal"
          {...register("email", { required: "Email is required" })}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          margin="normal"
          {...register("password", { required: "Password is required" })}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
          Login
        </Button>
      </form>
      <Typography textAlign="center" mt={2} mb={1}>
        or
      </Typography>
      <Button
        variant="contained"
        startIcon={<GoogleIcon />}
        fullWidth
        onClick={handleGoogleLogin}
      >
        Sign in with Google
      </Button>
      <Typography variant="body2" align="center" sx={{ mt: 2 }}>
        Don't have an account? <Link href="/signup">Sign up</Link>
      </Typography>
    </Box>
  );
};

export default LoginForm;
