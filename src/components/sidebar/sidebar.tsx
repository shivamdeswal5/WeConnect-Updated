'use client'
import AnimationIcon from "@mui/icons-material/Animation";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import LanguageIcon from "@mui/icons-material/Language";
import LibraryMusicOutlinedIcon from "@mui/icons-material/LibraryMusicOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";
import Person2Icon from "@mui/icons-material/Person2";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import { Box, Divider, Drawer, Stack } from "@mui/material";
import Cookies from 'js-cookie';
import { useRouter } from "next/navigation";

 
const SideBar = () => {

  const router = useRouter();

    const handleLogout = () => {
    console.log("Logout");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedUser");
    localStorage.removeItem("token");
    Cookies.remove("userSession")

    router.push('/login');

  };
 
  return (
    <Drawer variant="permanent" anchor="left" sx={{ width: 54, flexShrink: 0 }}>
      <Stack width={54} alignItems={"center"} sx={{ height: "100vw" }}>
        <Stack mt={2} spacing={2}>
          <AnimationIcon sx={{ fontSize: 32 }} color="success" />
          <Person2Icon sx={{ fontSize: 32 }} />
        </Stack>
        <Divider variant="middle" sx={{ my: 2, width: "80%" }} />
        <Stack alignItems={"center"}>
          <Box sx={{ p: 1.5 }}>
            <LanguageIcon sx={{ fontSize: 18 }} color="success" />
          </Box>
          <Box sx={{ p: 1.5, bgcolor: "#27AE60", borderRadius: 16 }}>
            <MessageOutlinedIcon sx={{ fontSize: 18, color: "#fff" }} />
          </Box>
          <Box sx={{ p: 1.5 }}>
            <VideocamOutlinedIcon sx={{ fontSize: 18 }} color="success" />
          </Box>
          <Box sx={{ p: 1.5 }}>
            <LibraryMusicOutlinedIcon sx={{ fontSize: 18 }} color="success" />
          </Box>
          <Box sx={{ p: 1.5 }}>
            <CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} color="success" />
          </Box>
        </Stack>
        <Stack spacing={2} flexGrow={1} justifyContent={"flex-end"} pb={2} sx={{cursor: 'pointer'}} onClick = {handleLogout}>
          <SettingsOutlinedIcon />
          <LogoutOutlinedIcon/>
        </Stack>
      </Stack>
    </Drawer>
  );
};

export default SideBar;