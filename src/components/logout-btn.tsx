import { Box, Button } from "@mui/material";

export default function LogoutButton() {
  const handleLogout = () => {
    console.log("Logout");
    const currentUser =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || '{}')
      : {};

    currentUser.isOnline = false;
    console.log("currentUser");
    // localStorage.setItem("user", JSON.stringify(newUserData));
  };
  return (
    <Box>
      <Button
        type="submit"
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleLogout}
      >
        Logout
      </Button>
    </Box>
  );
}
