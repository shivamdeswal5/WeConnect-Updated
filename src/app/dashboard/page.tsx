'use client'
import { Stack } from '@mui/material'
import React, { useEffect } from 'react'
import SideBar from '@/components/sidebar/sidebar'
import Contacts from '../../components/contacts/contacts';
import Chat from '@/components/chat/chat';
import { setUserPresence } from '@/firebase/firebase';

export default function page() {
  useEffect(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user?.uid) {
    setUserPresence(user.uid);
  }
}, []);
  return (
    <Stack direction={"row"} height={"100vh"}  overflow="hidden" >
      <SideBar/>  
      <Contacts/> 
      <Chat/>
    </Stack>
  )
}
