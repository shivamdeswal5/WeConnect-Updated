'use client';
import { db } from '@/firebase/firebase';
import { RootState } from '@/store';
import { addMessage } from '@/store/chatSlice';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import SendIcon from '@mui/icons-material/Send';
import {
  Avatar,
  Box,
  IconButton,
  Popover,
  Typography
} from '@mui/material';
import StarterKit from "@tiptap/starter-kit";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  get,
  onDisconnect,
  onValue,
  push,
  ref,
  set,
} from 'firebase/database';
import {
  MenuButtonBold,
  MenuButtonItalic,
  MenuControlsContainer,
  MenuDivider,
  MenuSelectHeading,
  RichTextEditor,
  type RichTextEditorRef,
} from "mui-tiptap";
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

interface IMessage {
  text: string;
  senderId: string;
  timestamp: number;
}

const Chat = () => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Offline');
  const [messages, setMessagesState] = useState<IMessage[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingStartedRef = useRef(false);

  const currentChatId = useSelector(
    (state: RootState) => state.chat.currentChatId
  );

  const currentUser =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || '{}')
      : {};
  const selectedUser =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('selectedUser') || '{}')
      : {};

  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = ref(db, `onlineUsers/${currentUser.uid}`);
    set(userRef, true);
    onDisconnect(userRef).set(false);
  }, []);

  useEffect(() => {
    if (!currentChatId) return;

    const chatRef = ref(db, `messages/${currentChatId}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const msgs: IMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        msgs.push(data);
        dispatch(addMessage(data));
      });
      setMessagesState(msgs);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    const unreadRef = ref(
      db,
      `unreadMessages/${currentUser.uid}/${currentChatId}`
    );
    set(unreadRef, 0);

    return () => unsubscribe();
  }, [currentChatId]);

  useEffect(() => {
    if (!selectedUser?.uid || !currentChatId || !currentUser?.uid) return;

    const statusRef = ref(db, `onlineUsers/${selectedUser.uid}`);
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      const isOnline = snapshot.val();
      setStatus(isOnline ? 'Online' : 'Offline');
    });

    const typingRef = ref(
      db,
      `typingStatus/${currentChatId}/${selectedUser.uid}`
    );
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const isTyping = snapshot.val();
      if (isTyping) setStatus('Typing...');
      else {
        const onlineRef = ref(db, `onlineUsers/${selectedUser.uid}`);
        onValue(
          onlineRef,
          (snap) => {
            setStatus(snap.val() ? 'Online' : 'Offline');
          },
          { onlyOnce: true }
        );
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeTyping();
    };
  }, [selectedUser?.uid, currentChatId]);

  const handleTyping = () => {
    if (!currentChatId || !currentUser?.uid) return;

    const typingRef = ref(
      db,
      `typingStatus/${currentChatId}/${currentUser.uid}`
    );

    if (!typingStartedRef.current) {
      set(typingRef, true);
      typingStartedRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      set(typingRef, false);
      typingStartedRef.current = false;
    }, 200);
  };

  const handleSend = () => {
    const plainText = editorRef.current?.editor?.getText().trim();
    const htmlContent = editorRef.current?.editor?.getHTML();

    if (!message.trim() || !currentChatId || !currentUser?.uid || 
    !plainText) return;

    const newMsg: IMessage = {
      text: message,
      senderId: currentUser.uid,
      timestamp: Date.now(),
    };

    const chatRef = ref(db, `messages/${currentChatId}`);
    push(chatRef, newMsg);
    const lastMsgRef = ref(db, `lastMessages/${currentChatId}`);
    set(lastMsgRef, {
      ...newMsg,
      receiverId: selectedUser.uid,
    });

    const unreadRef = ref(
      db,
      `unreadMessages/${selectedUser.uid}/${currentChatId}`
    );
    get(unreadRef).then((snap) => {
      const currentCount = snap.val() || 0;
      set(unreadRef, currentCount + 1);
    });

    setMessage('');
     editorRef.current?.editor?.commands.clearContent();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
     const emoji = emojiData.emoji;
    editorRef.current?.editor?.commands.insertContent(emoji);;
  };

  return (
    <Box flex={3} display="flex" flexDirection="column" height="100vh" width="100%">
      {currentChatId ? (
        <>
          <Box
            display="flex"
            alignItems="center"
            px={2}
            py={1}
            borderBottom="1px solid #ccc"
            bgcolor="#f5f5f5"
          >
            <Avatar src={selectedUser.photoURL || ''} />
            <Box ml={2}>
              <Typography variant="subtitle1">
                {selectedUser.displayName || selectedUser.name || selectedUser.email}
              </Typography>
              <Typography
                variant="caption"
                color={
                  status === 'Online' || status === 'Typing...'
                    ? 'green'
                    : 'textSecondary'
                }
              >
                {status}
              </Typography>
            </Box>
          </Box>

          <Box
            flex={1}
            p={2}
            overflow="auto"
            sx={{
              backgroundColor: '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {messages.map((msg, index) => (
              <Box
                key={index}
                alignSelf={
                  msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start'
                }
                bgcolor={msg.senderId === currentUser.uid ? '#DCF8C6' : '#d2d4cff9'}
                p={1.2}
                borderRadius={2}
                maxWidth="70%"
                sx={{ wordBreak: 'break-word' }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                  style={{ fontSize: '14px' }}
                />
              </Box>
            ))}
            <div ref={scrollRef} />
          </Box>

          <Box px={2} py={1} borderTop="1px solid #ccc" bgcolor="#f5f5f5">
            <RichTextEditor
              ref={editorRef}
              content=""
              extensions={[StarterKit]}
              onUpdate={({ editor }) => {
                setMessage(editor.getHTML());
                handleTyping();
              }}
              editorProps={{
                handleKeyDown: (_view, event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                    return true;
                  }
                  return false;
                },
              }}
              renderControls={() => (
                <MenuControlsContainer>
                  <MenuSelectHeading />
                  <MenuDivider />
                  <MenuButtonBold />
                  <MenuButtonItalic />
                  <MenuDivider />
                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <EmojiEmotionsIcon />
                  </IconButton>
                  <IconButton onClick={handleSend}>
                    <SendIcon />
                  </IconButton>
                </MenuControlsContainer>
              )}
            />
            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} height={350} />
            </Popover>

          </Box>
        </>
      ) : (
        <Box flex={1} display="flex" alignItems="center" justifyContent="center">
          <Typography variant="h6" color="textSecondary">
            Select a contact to start chatting
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Chat;