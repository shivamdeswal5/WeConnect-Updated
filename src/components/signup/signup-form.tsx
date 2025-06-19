"use client";

import { auth, db } from "@/firebase/firebase";
import { Box, Button, TextField, Typography } from "@mui/material";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

interface SignUpFormInputs {
  name: string;
  email: string;
  password: string;
}

const SignUpForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormInputs>();
  const router = useRouter();

  const onSubmit = async (data: SignUpFormInputs) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: data.name,
      });

      try {
        await set(ref(db, `users/${user.uid}`), {
          uid: user.uid,
          email: user.email,
          displayName: data.name,
          photoURL: user.photoURL || "",
        });
      } catch (err) {
        console.warn("Firebase DB save failed:", err);
      }

      const token = await user.getIdToken();

      const userData = {
        uid: user.uid,
        name: data.name,
        email: user.email || "",
        photoURL: user.photoURL || "",
      };

      // await fetch("http://localhost:4000/users", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify(userData),
      // });
      
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      sessionStorage.setItem('userSession', "true");
      sessionStorage.setItem('sessionToken',token);
      Cookies.set('userSession', token, { expires: 2 });

      toast.success(`Welcome, ${data.name}`);
      router.push("/dashboard");
    } catch (err) {
      toast.error("Signup failed");
      console.error(err);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
      <Typography variant="h5" mb={3}>
        Sign Up
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          label="Name"
          margin="normal"
          {...register("name", { required: "Name is required" })}
          error={!!errors.name}
          helperText={errors.name?.message}
        />
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
          Create Account
        </Button>
      </form>
      <Typography variant="body2">
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1976d2', textDecoration: 'underline' }}>
            Login here
          </Link>
        </Typography>
    </Box>
  );
};

export default SignUpForm;
